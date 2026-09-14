"""Iteration 4: Admin console auth, products, classes, orders, uploads."""
import base64
import io
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://edu-supply-shop-1.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@kapabookbazaar.in"
ADMIN_PASSWORD = "Kapa@Admin2026"


# Minimal 1x1 red PNG (base64)
PNG_1PX = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
)


# ---------- session-level admin auth ----------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"admin login failed ({r.status_code}): {r.text}")
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


def _get_version():
    r = requests.get(f"{BASE_URL}/api/v1/catalog/version", timeout=15)
    assert r.status_code == 200, r.text
    return r.json().get("version")


# =========================================================================
# Admin Auth
# =========================================================================
class TestAdminAuth:
    def test_login_success(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("token_type") == "bearer"
        assert data.get("email") == ADMIN_EMAIL
        assert isinstance(data.get("access_token"), str) and len(data["access_token"]) > 20

    def test_login_wrong_password(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": ADMIN_EMAIL, "password": "totally-wrong-pw"},
            timeout=30,
        )
        assert r.status_code == 401, r.text

    def test_me_without_token(self):
        r = requests.get(f"{BASE_URL}/api/admin/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("email") == ADMIN_EMAIL

    def test_me_with_tampered_token(self, admin_token):
        # flip the last character of the signature portion to invalidate it
        tampered = admin_token[:-1] + ("A" if admin_token[-1] != "A" else "B")
        r = requests.get(
            f"{BASE_URL}/api/admin/auth/me",
            headers={"Authorization": f"Bearer {tampered}"},
            timeout=15,
        )
        assert r.status_code == 401, r.text

    def test_stats(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("products", "lowStock", "orders", "pendingOrders", "revenue", "classes"):
            assert k in d, f"missing {k}"
        assert isinstance(d["products"], int)


# =========================================================================
# Admin Products
# =========================================================================
@pytest.fixture(scope="class", autouse=False)
def _cleanup_test_products(admin_token):
    """Class-level teardown that guarantees TEST_ products are marked isActive=False, featured=False."""
    yield
    try:
        h = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/api/admin/products", headers=h, timeout=15)
        for p in r.json():
            if p.get("title", "").startswith("TEST_") and (p.get("isActive") or p.get("featured")):
                requests.put(
                    f"{BASE_URL}/api/admin/products/{p['id']}",
                    json={"isActive": False, "featured": False},
                    headers=h,
                    timeout=10,
                )
    except Exception as e:  # noqa: BLE001
        print(f"cleanup warning: {e}")


@pytest.mark.usefixtures("_cleanup_test_products")
class TestAdminProducts:
    created_id: str | None = None
    created_sku: str | None = None
    prev_sibling_id: str | None = None

    def test_list_products(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        p = items[0]
        for k in ("id", "sortOrder", "featured", "isActive"):
            assert k in p, f"missing {k} in admin products"

    def test_create_product_success_and_version_bumps(self, auth_headers):
        v0 = _get_version()
        # capture existing pen so we can move up against it
        r = requests.get(f"{BASE_URL}/api/v1/products?categoryId=cat-pens", timeout=15)
        pens = [p for p in r.json() if p.get("isActive") is not False]
        assert pens, "expected at least one active pen"
        TestAdminProducts.prev_sibling_id = pens[-1]["id"]

        payload = {
            "title": "TEST_Iter4 Pen",
            "category": "cat-pens",
            "mrp": 100,
            "salePrice": 80,
            "stockQuantity": 10,
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/products", json=payload, headers=auth_headers, timeout=20
        )
        assert r.status_code == 201, r.text
        doc = r.json()
        assert doc["discountPercentage"] == 20
        assert doc["sku"] and doc["sku"].startswith("KL-")
        assert doc["isActive"] is True
        assert doc["category"] == "cat-pens"
        TestAdminProducts.created_id = doc["id"]
        TestAdminProducts.created_sku = doc["sku"]

        v1 = _get_version()
        assert v1 > v0, f"catalog version did not bump ({v0} -> {v1})"

    def test_create_product_sale_gt_mrp(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/products",
            json={"title": "TEST_bad", "category": "cat-pens", "mrp": 50, "salePrice": 80, "stockQuantity": 1},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 422, r.text

    def test_create_product_unknown_category(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/admin/products",
            json={"title": "TEST_uc", "category": "cat-does-not-exist", "mrp": 100, "salePrice": 80, "stockQuantity": 1},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 422, r.text

    def test_update_product_recalcs_discount(self, auth_headers):
        pid = TestAdminProducts.created_id
        assert pid, "requires create test to have run"
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{pid}",
            json={"salePrice": 70},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["discountPercentage"] == 30

    def test_move_up_swaps_sortorder(self, auth_headers):
        pid = TestAdminProducts.created_id
        prev = TestAdminProducts.prev_sibling_id
        assert pid and prev
        # get sortOrders before
        all_r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers, timeout=15).json()
        by_id = {p["id"]: p for p in all_r}
        so_new_before = by_id[pid]["sortOrder"]
        so_prev_before = by_id[prev]["sortOrder"]
        assert so_new_before > so_prev_before

        r = requests.post(
            f"{BASE_URL}/api/admin/products/{pid}/move",
            json={"direction": "up"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("moved") is True

        all_r = requests.get(f"{BASE_URL}/api/admin/products", headers=auth_headers, timeout=15).json()
        by_id = {p["id"]: p for p in all_r}
        # they should now be swapped in some way (our new one should be earlier than prev)
        assert by_id[pid]["sortOrder"] < by_id[prev]["sortOrder"]

    def test_featured_appears_in_public_featured(self, auth_headers):
        pid = TestAdminProducts.created_id
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{pid}",
            json={"featured": True},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        r = requests.get(f"{BASE_URL}/api/v1/products/featured", timeout=15)
        assert r.status_code == 200
        ids = {p["id"] for p in r.json()}
        assert pid in ids, "featured product not in /products/featured"

    def test_inactive_disappears_from_public(self, auth_headers):
        pid = TestAdminProducts.created_id
        v0 = _get_version()
        # also un-feature so we don't pollute /products/featured count expectations of other tests
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{pid}",
            json={"isActive": False, "featured": False},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        v1 = _get_version()
        assert v1 > v0

        r = requests.get(f"{BASE_URL}/api/v1/products?categoryId=cat-pens", timeout=15)
        assert r.status_code == 200
        ids = {p["id"] for p in r.json()}
        assert pid not in ids, "inactive product still returned by public list"


# =========================================================================
# Admin Classes
# =========================================================================
class TestAdminClasses:
    class_id: str | None = None

    def test_create_class_success(self, auth_headers):
        payload = {
            "title": "TEST_Iter4 Physics Session",
            "subject": "Physics",
            "grade": "10",
            "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
            "videoType": "youtube",
            "scheduledAt": "2026-09-25T10:00:00Z",
            "durationMinutes": 45,
            "notes": [],
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/classes", json=payload, headers=auth_headers, timeout=15
        )
        assert r.status_code == 201, r.text
        doc = r.json()
        assert doc["title"] == payload["title"]
        assert doc["videoType"] == "youtube"
        assert doc.get("isPublished") is True
        TestAdminClasses.class_id = doc["id"]

    def test_public_list_includes_published(self):
        cid = TestAdminClasses.class_id
        assert cid
        r = requests.get(f"{BASE_URL}/api/v1/classes", timeout=15)
        assert r.status_code == 200, r.text
        ids = {c["id"] for c in r.json()}
        assert cid in ids

    def test_update_class(self, auth_headers):
        cid = TestAdminClasses.class_id
        payload = {
            "title": "TEST_Iter4 Physics Session (Updated)",
            "subject": "Physics",
            "grade": "10",
            "videoUrl": "https://youtu.be/dQw4w9WgXcQ",
            "videoType": "youtube",
            "scheduledAt": "2026-09-25T11:00:00Z",
            "durationMinutes": 60,
            "notes": [],
            "isPublished": True,
        }
        r = requests.put(
            f"{BASE_URL}/api/admin/classes/{cid}", json=payload, headers=auth_headers, timeout=15
        )
        assert r.status_code == 200, r.text
        assert r.json()["durationMinutes"] == 60

    def test_unpublished_class_hidden_from_public(self, auth_headers):
        # create a new unpublished class
        payload = {
            "title": "TEST_Iter4 Hidden",
            "subject": "Math",
            "grade": "10",
            "videoUrl": "https://youtu.be/xxxxxxxxxxx",
            "videoType": "youtube",
            "scheduledAt": "2026-10-01T10:00:00Z",
            "durationMinutes": 30,
            "notes": [],
            "isPublished": False,
        }
        r = requests.post(
            f"{BASE_URL}/api/admin/classes", json=payload, headers=auth_headers, timeout=15
        )
        assert r.status_code == 201, r.text
        hidden_id = r.json()["id"]
        r = requests.get(f"{BASE_URL}/api/v1/classes", timeout=15)
        assert hidden_id not in {c["id"] for c in r.json()}
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/classes/{hidden_id}", headers=auth_headers, timeout=15
        )

    def test_delete_class_and_re_delete_404(self, auth_headers):
        cid = TestAdminClasses.class_id
        r = requests.delete(
            f"{BASE_URL}/api/admin/classes/{cid}", headers=auth_headers, timeout=15
        )
        assert r.status_code == 200, r.text
        r = requests.delete(
            f"{BASE_URL}/api/admin/classes/{cid}", headers=auth_headers, timeout=15
        )
        assert r.status_code == 404


# =========================================================================
# Admin Orders
# =========================================================================
class TestAdminOrders:
    order_id: str | None = None

    def _seed_order(self):
        r = requests.get(f"{BASE_URL}/api/v1/products?categoryId=cat-pens", timeout=15)
        p = next(x for x in r.json() if x.get("isActive") is not False)
        body = {
            "userId": "guest",
            "deliveryAddress": {"street": "TEST_Iter4 Rd", "pincode": "110001", "instructions": []},
            "items": [{"productId": p["id"], "quantity": 1, "unitPrice": p["salePrice"]}],
            "tipAmount": 0,
            "handlingFee": 9,
            "totalAmount": p["salePrice"] + 9,
            "paymentMethod": "COD",
        }
        r = requests.post(f"{BASE_URL}/api/v1/orders/create", json=body, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # response shape: { orderId, order: {...} }
        return data.get("orderId") or data["order"]["id"]

    def test_admin_orders_list_shape(self, auth_headers):
        TestAdminOrders.order_id = self._seed_order()
        r = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        orders = r.json()
        assert isinstance(orders, list) and orders
        seed = next((o for o in orders if o["id"] == TestAdminOrders.order_id), None)
        assert seed, "seeded order not found"
        assert "paymentStatus" in seed
        assert seed["items"] and "title" in seed["items"][0]

    def test_dispatch_then_live_tracking(self, auth_headers):
        oid = TestAdminOrders.order_id
        r = requests.put(
            f"{BASE_URL}/api/admin/orders/{oid}/status",
            json={"status": "dispatched"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "dispatched"
        r = requests.get(f"{BASE_URL}/api/v1/orders/{oid}/live-tracking", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["currentStage"] >= 2

    def test_deliver_then_live_tracking_complete(self, auth_headers):
        oid = TestAdminOrders.order_id
        r = requests.put(
            f"{BASE_URL}/api/admin/orders/{oid}/status",
            json={"status": "delivered"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        r = requests.get(f"{BASE_URL}/api/v1/orders/{oid}/live-tracking", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["progress"] == 1.0
        assert data["currentStage"] == 3

    def test_invalid_status_422(self, auth_headers):
        oid = TestAdminOrders.order_id
        r = requests.put(
            f"{BASE_URL}/api/admin/orders/{oid}/status",
            json={"status": "bogus"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 422


# =========================================================================
# Admin Upload
# =========================================================================
class TestAdminUpload:
    def test_no_token_401(self):
        files = {"file": ("t.png", io.BytesIO(PNG_1PX), "image/png")}
        r = requests.post(f"{BASE_URL}/api/admin/upload", files=files, timeout=30)
        assert r.status_code == 401

    def test_reject_text_415(self, admin_token):
        files = {"file": ("t.txt", io.BytesIO(b"hello"), "text/plain")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files,
            timeout=30,
        )
        assert r.status_code == 415

    def test_upload_png_and_fetch(self, admin_token):
        files = {"file": ("test.png", io.BytesIO(PNG_1PX), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/admin/upload",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files,
            timeout=60,
        )
        # Storage may be unavailable/exhausted; skip in that case rather than fail
        if r.status_code in (402, 502):
            pytest.skip(f"object storage unavailable: {r.status_code} {r.text}")
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("path") and body.get("url", "").startswith("/api/files/")
        r2 = requests.get(f"{BASE_URL}{body['url']}", timeout=30)
        assert r2.status_code == 200, r2.text
        assert r2.headers.get("Content-Type", "").startswith("image/png")
