from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Kapa Learning API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ===================== MODELS =====================
class Product(BaseModel):
    id: str
    sku: str
    title: str
    subtitle: str
    mrp: float
    salePrice: float
    discountPercentage: int
    category: str
    images: List[str]
    stockQuantity: int
    darkStoreId: str


class Category(BaseModel):
    id: str
    name: str
    icon: str
    image: str
    color: str


class DarkStore(BaseModel):
    id: str
    name: str
    slaMinutes: str
    lat: float
    lng: float


class CartItem(BaseModel):
    productId: str
    quantity: int
    unitPrice: float


class DeliveryAddress(BaseModel):
    street: str
    pincode: str
    lat: float = 28.6139
    lng: float = 77.2090
    instructions: List[str] = []


class OrderPayload(BaseModel):
    userId: str = "guest"
    deliveryAddress: DeliveryAddress
    items: List[CartItem]
    tipAmount: float = 0
    handlingFee: float = 9
    totalAmount: float
    paymentMethod: Literal["UPI", "CARD", "COD"]


class OrderRecord(BaseModel):
    id: str
    userId: str
    items: List[CartItem]
    tipAmount: float
    handlingFee: float
    deliveryCharge: float
    totalAmount: float
    paymentMethod: str
    address: DeliveryAddress
    status: str
    createdAt: str
    slaMinutes: int


class CartSyncRequest(BaseModel):
    items: List[CartItem]


# ===================== SEED DATA =====================
DARK_STORES = [
    {"id": "ds-delhi-swaroop", "name": "Swaroop Nagar Dark Store", "slaMinutes": "10-12 MINS", "lat": 28.7085, "lng": 77.1930},
]

CATEGORIES = [
    {"id": "cat-ncert", "name": "NCERT Books", "icon": "book", "image": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400", "color": "#FDE68A"},
    {"id": "cat-registers", "name": "Registers", "icon": "journal", "image": "https://images.unsplash.com/photo-1612367980327-7454a7276aa7?w=400", "color": "#BBF7D0"},
    {"id": "cat-pens", "name": "Pens & Markers", "icon": "create", "image": "https://images.unsplash.com/photo-1654608904845-7872f07475bc?w=400", "color": "#BFDBFE"},
    {"id": "cat-art", "name": "Art & Drafting", "icon": "color-palette", "image": "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400", "color": "#FBCFE8"},
    {"id": "cat-exam", "name": "Exam Kits", "icon": "trophy", "image": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400", "color": "#FED7AA"},
    {"id": "cat-office", "name": "Office Essentials", "icon": "briefcase", "image": "https://images.unsplash.com/photo-1497091071254-cc9b2ba7c48a?w=400", "color": "#DDD6FE"},
    {"id": "cat-geometry", "name": "Geometry Sets", "icon": "compass", "image": "https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400", "color": "#A7F3D0"},
    {"id": "cat-lunch", "name": "Lunch & Bottles", "icon": "water", "image": "https://images.unsplash.com/photo-1602253057119-44d745d9b860?w=400", "color": "#FECACA"},
]

PRODUCTS_SEED = [
    # NCERT
    {"sku": "NCERT-M10", "title": "NCERT Class 10 Mathematics", "subtitle": "Textbook | Latest 2025 Edition", "mrp": 240, "salePrice": 189, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400"], "stock": 45},
    {"sku": "NCERT-S10", "title": "NCERT Class 10 Science", "subtitle": "Textbook | Latest 2025 Edition", "mrp": 250, "salePrice": 199, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400"], "stock": 30},
    {"sku": "NCERT-E10", "title": "NCERT Class 10 English First Flight", "subtitle": "Textbook | Latest 2025 Edition", "mrp": 220, "salePrice": 175, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400"], "stock": 40},
    {"sku": "NCERT-SST10", "title": "NCERT Class 10 Social Science", "subtitle": "Combo Pack of 4 Books", "mrp": 480, "salePrice": 359, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400"], "stock": 22},
    {"sku": "NCERT-EXP12", "title": "NCERT Exemplar Class 12 Physics", "subtitle": "Practice Problems Book", "mrp": 320, "salePrice": 259, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1532153259564-a5f24f261f51?w=400"], "stock": 18},
    {"sku": "NCERT-H10", "title": "NCERT Class 10 Hindi Kshitij", "subtitle": "Textbook | Latest 2025 Edition", "mrp": 210, "salePrice": 169, "category": "cat-ncert", "images": ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400"], "stock": 25},

    # Registers
    {"sku": "REG-CM-S5", "title": "Classmate Spiral Registers", "subtitle": "Pack of 5 | 180 Pages | A4", "mrp": 750, "salePrice": 549, "category": "cat-registers", "images": ["https://images.unsplash.com/photo-1612367980327-7454a7276aa7?w=400"], "stock": 60},
    {"sku": "REG-HB-LT", "title": "Hardbound Long Register", "subtitle": "300 Pages | Ruled", "mrp": 320, "salePrice": 249, "category": "cat-registers", "images": ["https://images.unsplash.com/photo-1517842645767-c639042777db?w=400"], "stock": 35},
    {"sku": "REG-ND-3S", "title": "Navneet Register Pack of 3", "subtitle": "160 Pages | Single Line", "mrp": 450, "salePrice": 335, "category": "cat-registers", "images": ["https://images.unsplash.com/photo-1568871391327-04b30d5f9d1e?w=400"], "stock": 42},
    {"sku": "REG-4L-100", "title": "Four Line Practice Register", "subtitle": "100 Pages | Junior", "mrp": 90, "salePrice": 69, "category": "cat-registers", "images": ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=400"], "stock": 80},
    {"sku": "REG-MSQ", "title": "Maths Square Register", "subtitle": "160 Pages | 1 CM Squares", "mrp": 120, "salePrice": 95, "category": "cat-registers", "images": ["https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=400"], "stock": 55},

    # Pens
    {"sku": "PEN-RB-BL5", "title": "Reynolds Blue Gel Pens", "subtitle": "Pack of 5 | 0.5mm Fine Tip", "mrp": 125, "salePrice": 89, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1654608904845-7872f07475bc?w=400"], "stock": 120},
    {"sku": "PEN-CE-BK10", "title": "Cello Black Ball Pens", "subtitle": "Pack of 10 | Smooth Writing", "mrp": 100, "salePrice": 79, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1583485088034-697b5bc36b92?w=400"], "stock": 95},
    {"sku": "PEN-HL-5C", "title": "Highlighter Set 5 Colours", "subtitle": "Fluorescent | Chisel Tip", "mrp": 250, "salePrice": 179, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1568871391327-04b30d5f9d1e?w=400"], "stock": 40},
    {"sku": "PEN-PL-M2", "title": "Parker Beta Gel Pens", "subtitle": "Pack of 2 | Premium", "mrp": 400, "salePrice": 299, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1583485088034-697b5bc36b92?w=400"], "stock": 28},
    {"sku": "PEN-PM-12", "title": "Permanent Markers Set", "subtitle": "12 Colours | Assorted", "mrp": 480, "salePrice": 349, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1591414046769-a0e8cbb47da1?w=400"], "stock": 32},
    {"sku": "PEN-PC-10", "title": "Camlin Pencils HB", "subtitle": "Pack of 10 | With Eraser", "mrp": 90, "salePrice": 69, "category": "cat-pens", "images": ["https://images.unsplash.com/photo-1592339744955-0e4a44e01ba5?w=400"], "stock": 150},

    # Art
    {"sku": "ART-WC-24", "title": "Camlin Water Colours 24 Shades", "subtitle": "Cake | With Brush", "mrp": 320, "salePrice": 235, "category": "cat-art", "images": ["https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400"], "stock": 45},
    {"sku": "ART-CR-48", "title": "Faber Castell Crayons", "subtitle": "48 Shades | Premium", "mrp": 550, "salePrice": 399, "category": "cat-art", "images": ["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400"], "stock": 38},
    {"sku": "ART-SP-A4", "title": "Drawing Sheets A4 Pack", "subtitle": "Pack of 20 | 200 GSM", "mrp": 200, "salePrice": 149, "category": "cat-art", "images": ["https://images.unsplash.com/photo-1499744937866-d7e566a20a61?w=400"], "stock": 60},
    {"sku": "ART-BR-10", "title": "Paint Brush Set", "subtitle": "10 Piece | Round & Flat", "mrp": 380, "salePrice": 275, "category": "cat-art", "images": ["https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400"], "stock": 25},
    {"sku": "ART-OP-24", "title": "Oil Pastels 24 Shades", "subtitle": "Vibrant Colours | Kids", "mrp": 220, "salePrice": 165, "category": "cat-art", "images": ["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400"], "stock": 55},

    # Exam
    {"sku": "EXM-UPSC-P", "title": "UPSC Prelims Mock Papers", "subtitle": "10 Sets | Detailed Solutions", "mrp": 550, "salePrice": 399, "category": "cat-exam", "images": ["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400"], "stock": 30},
    {"sku": "EXM-JEE-M", "title": "JEE Main Chapterwise Solutions", "subtitle": "Physics Chem Maths Combo", "mrp": 899, "salePrice": 649, "category": "cat-exam", "images": ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400"], "stock": 22},
    {"sku": "EXM-NEET", "title": "NEET Mock Test Papers", "subtitle": "15 Sets | With OMR Sheets", "mrp": 750, "salePrice": 549, "category": "cat-exam", "images": ["https://images.unsplash.com/photo-1532153259564-a5f24f261f51?w=400"], "stock": 18},
    {"sku": "EXM-CBSE10", "title": "CBSE Class 10 Sample Papers", "subtitle": "All Subjects | 2025", "mrp": 420, "salePrice": 319, "category": "cat-exam", "images": ["https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400"], "stock": 40},
    {"sku": "EXM-OMR-50", "title": "OMR Practice Sheets", "subtitle": "Pack of 50 | Standard", "mrp": 150, "salePrice": 99, "category": "cat-exam", "images": ["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400"], "stock": 90},

    # Office
    {"sku": "OFF-SN-A4", "title": "A4 Printing Paper Ream", "subtitle": "500 Sheets | 75 GSM", "mrp": 380, "salePrice": 289, "category": "cat-office", "images": ["https://images.unsplash.com/photo-1497091071254-cc9b2ba7c48a?w=400"], "stock": 50},
    {"sku": "OFF-STP", "title": "Stapler with Pins", "subtitle": "Medium Duty | Metal", "mrp": 220, "salePrice": 165, "category": "cat-office", "images": ["https://images.unsplash.com/photo-1568871391327-04b30d5f9d1e?w=400"], "stock": 35},
    {"sku": "OFF-STK", "title": "Sticky Notes Pack", "subtitle": "4 Pads | 400 Sheets", "mrp": 180, "salePrice": 125, "category": "cat-office", "images": ["https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=400"], "stock": 65},
    {"sku": "OFF-FF-5", "title": "File Folders Pack of 5", "subtitle": "A4 | Plastic | Assorted", "mrp": 250, "salePrice": 179, "category": "cat-office", "images": ["https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=400"], "stock": 45},
    {"sku": "OFF-TP", "title": "Transparent Tape Roll", "subtitle": "Pack of 4 | 1 Inch", "mrp": 120, "salePrice": 85, "category": "cat-office", "images": ["https://images.unsplash.com/photo-1568001902957-c1c68432e17e?w=400"], "stock": 80},

    # Geometry
    {"sku": "GEO-CAM", "title": "Camlin Geometry Box", "subtitle": "10 Piece Set | Metal", "mrp": 280, "salePrice": 199, "category": "cat-geometry", "images": ["https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=400"], "stock": 40},
    {"sku": "GEO-STD", "title": "Student Compass Divider", "subtitle": "Steel Point | Precision", "mrp": 150, "salePrice": 109, "category": "cat-geometry", "images": ["https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400"], "stock": 55},
    {"sku": "GEO-PRT", "title": "Protractor 180 Degree", "subtitle": "15 CM | Transparent", "mrp": 60, "salePrice": 45, "category": "cat-geometry", "images": ["https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400"], "stock": 100},

    # Lunch
    {"sku": "LUN-BT-750", "title": "Milton Water Bottle", "subtitle": "750 ml | Steel | Kids", "mrp": 450, "salePrice": 349, "category": "cat-lunch", "images": ["https://images.unsplash.com/photo-1602253057119-44d745d9b860?w=400"], "stock": 42},
    {"sku": "LUN-BOX", "title": "Insulated Lunch Box", "subtitle": "3 Compartments | Leakproof", "mrp": 580, "salePrice": 425, "category": "cat-lunch", "images": ["https://images.unsplash.com/photo-1596460107916-430662021049?w=400"], "stock": 30},
    {"sku": "LUN-SP", "title": "Spoon Fork Set Kids", "subtitle": "Stainless Steel | Travel", "mrp": 180, "salePrice": 129, "category": "cat-lunch", "images": ["https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400"], "stock": 60},
]


async def seed_db():
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many(CATEGORIES)
        logger.info("Seeded categories")

    if await db.darkstores.count_documents({}) == 0:
        await db.darkstores.insert_many(DARK_STORES)
        logger.info("Seeded dark stores")

    if await db.products.count_documents({}) == 0:
        docs = []
        for p in PRODUCTS_SEED:
            discount = round(((p["mrp"] - p["salePrice"]) / p["mrp"]) * 100)
            docs.append({
                "id": str(uuid.uuid4()),
                "sku": p["sku"],
                "title": p["title"],
                "subtitle": p["subtitle"],
                "mrp": p["mrp"],
                "salePrice": p["salePrice"],
                "discountPercentage": discount,
                "category": p["category"],
                "images": p["images"],
                "stockQuantity": p["stock"],
                "darkStoreId": "ds-delhi-swaroop",
            })
        await db.products.insert_many(docs)
        logger.info(f"Seeded {len(docs)} products")


@app.on_event("startup")
async def startup_event():
    await seed_db()


# ===================== ROUTES =====================
@api_router.get("/")
async def root():
    return {"service": "Kapa Learning API", "status": "ok"}


@api_router.get("/v1/darkstore/nearest")
async def get_nearest_darkstore(lat: float = 28.7085, lng: float = 77.1930):
    store = await db.darkstores.find_one({}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="No dark store available")
    return store


@api_router.get("/v1/categories")
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats


@api_router.get("/v1/products")
async def get_products(categoryId: Optional[str] = None, darkStoreId: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if categoryId:
        query["category"] = categoryId
    if darkStoreId:
        query["darkStoreId"] = darkStoreId
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"subtitle": {"$regex": q, "$options": "i"}},
        ]
    products = await db.products.find(query, {"_id": 0}).to_list(500)
    return products


@api_router.get("/v1/products/featured")
async def get_featured_products():
    products = await db.products.find({}, {"_id": 0}).limit(8).to_list(8)
    return products


@api_router.post("/v1/cart/sync")
async def sync_cart(payload: CartSyncRequest):
    valid_items = []
    total = 0.0
    for item in payload.items:
        product = await db.products.find_one({"id": item.productId}, {"_id": 0})
        if not product:
            continue
        available_qty = min(item.quantity, product["stockQuantity"])
        line_total = available_qty * product["salePrice"]
        total += line_total
        valid_items.append({
            "productId": item.productId,
            "quantity": available_qty,
            "unitPrice": product["salePrice"],
            "title": product["title"],
            "lineTotal": line_total,
        })
    return {"items": valid_items, "itemTotal": round(total, 2)}


@api_router.post("/v1/orders/create")
async def create_order(payload: OrderPayload):
    order_id = str(uuid.uuid4())
    delivery_charge = 0 if payload.totalAmount >= 199 else 25
    order_doc = {
        "id": order_id,
        "userId": payload.userId,
        "items": [item.dict() for item in payload.items],
        "tipAmount": payload.tipAmount,
        "handlingFee": payload.handlingFee,
        "deliveryCharge": delivery_charge,
        "totalAmount": payload.totalAmount,
        "paymentMethod": payload.paymentMethod,
        "address": payload.deliveryAddress.dict(),
        "status": "confirmed",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "slaMinutes": 11,
    }
    await db.orders.insert_one(order_doc.copy())
    order_doc.pop("_id", None)
    return {"orderId": order_id, "paymentIntent": {"status": "success", "method": payload.paymentMethod}, "order": order_doc}


@api_router.get("/v1/orders/{orderId}/live-tracking")
async def get_order_tracking(orderId: str):
    order = await db.orders.find_one({"id": orderId}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    created = datetime.fromisoformat(order["createdAt"])
    now = datetime.now(timezone.utc)
    elapsed = (now - created).total_seconds()

    # 4 stages, each ~ slaMinutes/4 minutes
    stage_duration = (order["slaMinutes"] * 60) / 4
    current_stage = min(int(elapsed / stage_duration), 3)
    progress = min(elapsed / (order["slaMinutes"] * 60), 1.0)

    stages = [
        {"key": "placed", "label": "Order Placed & Confirmed", "completed": True},
        {"key": "packed", "label": "Order Packed at Kapa Dark Store", "completed": current_stage >= 1},
        {"key": "out", "label": "Out for Delivery - Rider Assigned", "completed": current_stage >= 2},
        {"key": "arrived", "label": "Arrived at Your Gate", "completed": current_stage >= 3},
    ]

    # Rider position along route
    rider_progress = progress
    rider_lat = 28.7085 + (order["address"].get("lat", 28.6139) - 28.7085) * rider_progress
    rider_lng = 77.1930 + (order["address"].get("lng", 77.2090) - 77.1930) * rider_progress

    return {
        "orderId": orderId,
        "status": order["status"],
        "currentStage": current_stage,
        "stages": stages,
        "progress": progress,
        "rider": {"name": "Ravi Kumar", "phone": "+91 98XXXXXX21", "lat": rider_lat, "lng": rider_lng},
        "store": {"lat": 28.7085, "lng": 77.1930},
        "destination": {"lat": order["address"].get("lat", 28.6139), "lng": order["address"].get("lng", 77.2090)},
        "etaMinutes": max(1, int(order["slaMinutes"] * (1 - progress))),
        "createdAt": order["createdAt"],
    }


@api_router.get("/v1/orders")
async def list_orders(userId: str = "guest"):
    orders = await db.orders.find({"userId": userId}, {"_id": 0}).sort("createdAt", -1).limit(20).to_list(20)
    return orders


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
