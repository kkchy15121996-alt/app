"""Admin console API: JWT auth, product/catalog management, classes, orders, uploads."""
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from pydantic import BaseModel, Field

from storage import APP_NAME, get_object, init_storage, put_object

logger = logging.getLogger(__name__)

def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable {name}")
    return value


JWT_SECRET = _required_env("JWT_SECRET")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "720"))
ADMIN_EMAIL = _required_env("ADMIN_EMAIL").lower()
ADMIN_PASSWORD = _required_env("ADMIN_PASSWORD")

DUMMY_HASH = bcrypt.hashpw(b"not-the-real-password", bcrypt.gensalt()).decode()
bearer = HTTPBearer(auto_error=False)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
}


# ---------- helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_token(email: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": email, "role": "admin", "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)},
        JWT_SECRET,
        algorithm="HS256",
    )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- models ----------
class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)


class PasswordChange(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=8, max_length=128)


class ProductCreate(BaseModel):
    title: str = Field(min_length=2)
    subtitle: str = ""
    category: str
    mrp: float = Field(gt=0)
    salePrice: float = Field(gt=0)
    stockQuantity: int = Field(ge=0)
    images: List[str] = []
    featured: bool = False
    sku: Optional[str] = None


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    category: Optional[str] = None
    mrp: Optional[float] = Field(default=None, gt=0)
    salePrice: Optional[float] = Field(default=None, gt=0)
    stockQuantity: Optional[int] = Field(default=None, ge=0)
    images: Optional[List[str]] = None
    featured: Optional[bool] = None
    isActive: Optional[bool] = None


class MovePayload(BaseModel):
    direction: Literal["up", "down"]


class NoteFile(BaseModel):
    name: str
    url: str


class ClassPayload(BaseModel):
    title: str = Field(min_length=2)
    subject: str = ""
    grade: str = ""
    description: str = ""
    videoUrl: str = ""
    videoType: Literal["youtube", "hls", "none"] = "youtube"
    scheduledAt: Optional[str] = None  # ISO datetime
    durationMinutes: int = Field(default=60, ge=5, le=600)
    notes: List[NoteFile] = []
    isPublished: bool = True


class OrderStatusPayload(BaseModel):
    status: Literal["confirmed", "packed", "dispatched", "delivered", "cancelled"]


def build_admin_router(db) -> tuple:
    router = APIRouter(prefix="/api/admin", tags=["admin"])
    files_router = APIRouter(prefix="/api", tags=["files"])

    async def bump_version():
        await db.meta.update_one(
            {"key": "catalogVersion"}, {"$inc": {"version": 1}, "$set": {"updatedAt": now_iso()}}, upsert=True
        )

    async def seed_admin():
        if not await db.admins.find_one({"email": ADMIN_EMAIL}):
            await db.admins.insert_one(
                {"email": ADMIN_EMAIL, "password_hash": hash_password(ADMIN_PASSWORD), "role": "admin", "createdAt": now_iso()}
            )
            logger.info("Seeded admin %s", ADMIN_EMAIL)
        # Ensure catalog ordering fields exist
        products = await db.products.find({}, {"_id": 0, "id": 1, "category": 1, "sortOrder": 1, "featured": 1}).to_list(1000)
        counters: dict = {}
        for i, p in enumerate(products):
            update = {}
            if p.get("sortOrder") is None:
                counters[p["category"]] = counters.get(p["category"], 0) + 1
                update["sortOrder"] = counters[p["category"]]
            if p.get("featured") is None:
                update["featured"] = i < 8
            if p.get("isActive") is None:
                update["isActive"] = True
            if update:
                await db.products.update_one({"id": p["id"]}, {"$set": update})
        await db.meta.update_one({"key": "catalogVersion"}, {"$setOnInsert": {"version": 1}}, upsert=True)
        try:
            await run_in_threadpool(init_storage)
        except Exception as e:  # noqa: BLE001
            logger.warning("Object storage init failed: %s", e)

    async def current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
        unauthorized = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )
        if not credentials or credentials.scheme.lower() != "bearer":
            raise unauthorized
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        except InvalidTokenError:
            raise unauthorized
        email = payload.get("sub")
        if not isinstance(email, str) or payload.get("role") != "admin":
            raise unauthorized
        admin = await db.admins.find_one({"email": email}, {"_id": 0, "email": 1, "role": 1})
        if not admin:
            raise unauthorized
        return admin

    # ---------- auth ----------
    @router.post("/auth/login")
    async def login(body: LoginRequest):
        email = body.email.strip().lower()
        admin = await db.admins.find_one({"email": email})
        stored = admin["password_hash"] if admin else DUMMY_HASH
        if not verify_password(body.password, stored):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        return {"access_token": create_token(email), "token_type": "bearer", "expires_in": JWT_EXPIRE_MINUTES * 60, "email": email}

    @router.get("/auth/me")
    async def me(admin: dict = Depends(current_admin)):
        return admin

    @router.put("/auth/password")
    async def change_password(body: PasswordChange, admin: dict = Depends(current_admin)):
        doc = await db.admins.find_one({"email": admin["email"]})
        if not verify_password(body.currentPassword, doc["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        await db.admins.update_one({"email": admin["email"]}, {"$set": {"password_hash": hash_password(body.newPassword)}})
        return {"ok": True}

    # ---------- dashboard ----------
    @router.get("/stats")
    async def stats(admin: dict = Depends(current_admin)):
        orders = await db.orders.find({}, {"_id": 0, "totalAmount": 1, "status": 1}).to_list(5000)
        return {
            "products": await db.products.count_documents({"isActive": {"$ne": False}}),
            "lowStock": await db.products.count_documents({"stockQuantity": {"$lte": 5}, "isActive": {"$ne": False}}),
            "orders": len(orders),
            "pendingOrders": sum(1 for o in orders if o.get("status") in ("confirmed", "packed")),
            "revenue": round(sum(o.get("totalAmount", 0) for o in orders if o.get("status") != "cancelled")),
            "classes": await db.classes.count_documents({}),
        }

    # ---------- products ----------
    @router.get("/products")
    async def admin_products(admin: dict = Depends(current_admin)):
        return await db.products.find({}, {"_id": 0}).sort([("category", 1), ("sortOrder", 1)]).to_list(1000)

    @router.post("/products", status_code=201)
    async def create_product(body: ProductCreate, admin: dict = Depends(current_admin)):
        if body.salePrice > body.mrp:
            raise HTTPException(status_code=422, detail="Sale price cannot exceed MRP")
        if not await db.categories.find_one({"id": body.category}):
            raise HTTPException(status_code=422, detail="Unknown category")
        last = await db.products.find_one({"category": body.category}, {"_id": 0, "sortOrder": 1}, sort=[("sortOrder", -1)])
        doc = {
            "id": str(uuid.uuid4()),
            "sku": body.sku or f"KL-{uuid.uuid4().hex[:6].upper()}",
            "title": body.title.strip(),
            "subtitle": body.subtitle.strip(),
            "mrp": body.mrp,
            "salePrice": body.salePrice,
            "discountPercentage": round((body.mrp - body.salePrice) / body.mrp * 100),
            "category": body.category,
            "images": body.images or ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400"],
            "stockQuantity": body.stockQuantity,
            "darkStoreId": "ds-delhi-swaroop",
            "featured": body.featured,
            "isActive": True,
            "sortOrder": (last or {}).get("sortOrder", 0) + 1,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        await db.products.insert_one(doc.copy())
        doc.pop("_id", None)
        await bump_version()
        return doc

    @router.put("/products/{productId}")
    async def update_product(productId: str, body: ProductUpdate, admin: dict = Depends(current_admin)):
        existing = await db.products.find_one({"id": productId}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Product not found")
        update = {k: v for k, v in body.dict().items() if v is not None}
        if "title" in update:
            update["title"] = update["title"].strip()
        mrp = update.get("mrp", existing["mrp"])
        sale = update.get("salePrice", existing["salePrice"])
        if sale > mrp:
            raise HTTPException(status_code=422, detail="Sale price cannot exceed MRP")
        update["discountPercentage"] = round((mrp - sale) / mrp * 100)
        if "category" in update and update["category"] != existing["category"]:
            if not await db.categories.find_one({"id": update["category"]}):
                raise HTTPException(status_code=422, detail="Unknown category")
            last = await db.products.find_one({"category": update["category"]}, {"_id": 0, "sortOrder": 1}, sort=[("sortOrder", -1)])
            update["sortOrder"] = (last or {}).get("sortOrder", 0) + 1
        update["updatedAt"] = now_iso()
        await db.products.update_one({"id": productId}, {"$set": update})
        await bump_version()
        return await db.products.find_one({"id": productId}, {"_id": 0})

    @router.delete("/products/{productId}")
    async def delete_product(productId: str, admin: dict = Depends(current_admin)):
        res = await db.products.update_one({"id": productId}, {"$set": {"isActive": False, "updatedAt": now_iso()}})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        await bump_version()
        return {"id": productId, "isActive": False}

    @router.post("/products/{productId}/move")
    async def move_product(productId: str, body: MovePayload, admin: dict = Depends(current_admin)):
        product = await db.products.find_one({"id": productId}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        siblings = await db.products.find({"category": product["category"]}, {"_id": 0, "id": 1}).sort("sortOrder", 1).to_list(1000)
        ids = [s["id"] for s in siblings]
        idx = ids.index(productId)
        swap = idx - 1 if body.direction == "up" else idx + 1
        if swap < 0 or swap >= len(ids):
            return {"moved": False}
        ids[idx], ids[swap] = ids[swap], ids[idx]
        for order, pid in enumerate(ids, start=1):
            await db.products.update_one({"id": pid}, {"$set": {"sortOrder": order}})
        await bump_version()
        return {"moved": True, "order": ids}

    @router.get("/categories")
    async def admin_categories(admin: dict = Depends(current_admin)):
        return await db.categories.find({}, {"_id": 0}).to_list(100)

    # ---------- classes ----------
    @router.get("/classes")
    async def admin_classes(admin: dict = Depends(current_admin)):
        return await db.classes.find({}, {"_id": 0}).sort("scheduledAt", 1).to_list(500)

    @router.post("/classes", status_code=201)
    async def create_class(body: ClassPayload, admin: dict = Depends(current_admin)):
        doc = {"id": str(uuid.uuid4()), **body.dict(), "createdAt": now_iso(), "updatedAt": now_iso()}
        await db.classes.insert_one(doc.copy())
        doc.pop("_id", None)
        await bump_version()
        return doc

    @router.put("/classes/{classId}")
    async def update_class(classId: str, body: ClassPayload, admin: dict = Depends(current_admin)):
        res = await db.classes.update_one({"id": classId}, {"$set": {**body.dict(), "updatedAt": now_iso()}})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        await bump_version()
        return await db.classes.find_one({"id": classId}, {"_id": 0})

    @router.delete("/classes/{classId}")
    async def delete_class(classId: str, admin: dict = Depends(current_admin)):
        res = await db.classes.delete_one({"id": classId})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Class not found")
        await bump_version()
        return {"deleted": classId}

    # ---------- orders ----------
    @router.get("/orders")
    async def admin_orders(admin: dict = Depends(current_admin)):
        orders = await db.orders.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)
        ids = list({i["productId"] for o in orders for i in o.get("items", [])})
        prods = await db.products.find({"id": {"$in": ids}}, {"_id": 0, "id": 1, "title": 1, "images": 1}).to_list(2000)
        by_id = {p["id"]: p for p in prods}
        for o in orders:
            for it in o.get("items", []):
                p = by_id.get(it["productId"])
                it["title"] = p["title"] if p else "Unavailable item"
                it["image"] = p["images"][0] if p and p.get("images") else None
            o["paymentStatus"] = "pending" if o.get("paymentMethod") == "COD" and o.get("status") != "delivered" else "paid"
        return orders

    @router.put("/orders/{orderId}/status")
    async def update_order_status(orderId: str, body: OrderStatusPayload, admin: dict = Depends(current_admin)):
        res = await db.orders.update_one(
            {"id": orderId},
            {"$set": {"status": body.status, "statusUpdatedAt": now_iso(), **({"dispatchedAt": now_iso()} if body.status == "dispatched" else {})}},
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return await db.orders.find_one({"id": orderId}, {"_id": 0})

    # ---------- uploads ----------
    @router.post("/upload")
    async def upload(file: UploadFile = File(...), admin: dict = Depends(current_admin)):
        content_type = (file.content_type or "").lower()
        if content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=415, detail="Only JPG, PNG, WEBP images or PDF files are allowed")
        data = await file.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB)")
        ext = ALLOWED_TYPES[content_type]
        path = f"{APP_NAME}/uploads/admin/{uuid.uuid4()}.{ext}"
        try:
            result = await run_in_threadpool(put_object, path, data, content_type)
        except Exception as e:  # noqa: BLE001
            logger.error("upload failed: %s", e)
            msg = str(e)
            if "402" in msg:
                raise HTTPException(status_code=402, detail="Storage credits exhausted")
            raise HTTPException(status_code=502, detail="Upload failed, please retry")
        await db.files.insert_one(
            {"path": result["path"], "name": file.filename, "contentType": content_type, "size": len(data), "uploadedBy": admin["email"], "createdAt": now_iso()}
        )
        return {"path": result["path"], "url": f"/api/files/{result['path']}", "name": file.filename, "contentType": content_type}

    @files_router.get("/files/{path:path}")
    async def serve_file(path: str):
        # Catalog assets are public; existence is validated against our own DB.
        rec = await db.files.find_one({"path": path}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=404, detail="File not found")
        try:
            content, ctype = await run_in_threadpool(get_object, path)
        except Exception as e:  # noqa: BLE001
            logger.error("file fetch failed: %s", e)
            raise HTTPException(status_code=502, detail="File temporarily unavailable")
        headers = {"Cache-Control": "public, max-age=86400"}
        if ctype == "application/pdf":
            headers["Content-Disposition"] = f'inline; filename="{rec.get("name", "notes.pdf")}"'
        return Response(content=content, media_type=rec.get("contentType") or ctype, headers=headers)

    return router, files_router, seed_admin
