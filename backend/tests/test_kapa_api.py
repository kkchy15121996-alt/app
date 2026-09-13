"""Kapa Learning API end-to-end backend tests."""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://edu-supply-shop-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api/v1"


# ---------- health ----------
class TestHealth:
    def test_root(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- darkstore ----------
class TestDarkStore:
    def test_nearest_returns_sla(self, api_client):
        r = api_client.get(f"{API}/darkstore/nearest")
        assert r.status_code == 200
        data = r.json()
        assert "slaMinutes" in data
        assert data["slaMinutes"]
        assert "id" in data and "name" in data
        assert isinstance(data.get("lat"), (int, float))


# ---------- categories ----------
class TestCategories:
    def test_categories_seeded_8(self, api_client):
        r = api_client.get(f"{API}/categories")
        assert r.status_code == 200
        cats = r.json()
        assert isinstance(cats, list)
        assert len(cats) == 8, f"Expected 8, got {len(cats)}"
        ids = {c["id"] for c in cats}
        assert "cat-ncert" in ids
        for c in cats:
            assert set(["id", "name", "icon", "image", "color"]).issubset(c.keys())


# ---------- products ----------
class TestProducts:
    def test_products_by_category(self, api_client):
        r = api_client.get(f"{API}/products", params={"categoryId": "cat-ncert"})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        for p in items:
            assert p["category"] == "cat-ncert"
            assert p["salePrice"] <= p["mrp"]
            assert p["discountPercentage"] >= 0

    def test_featured_returns_8(self, api_client):
        r = api_client.get(f"{API}/products/featured")
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 8

    def test_search_products(self, api_client):
        r = api_client.get(f"{API}/products", params={"q": "NCERT"})
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 1


# ---------- cart ----------
class TestCartSync:
    def test_cart_sync_totals(self, api_client):
        prods = api_client.get(f"{API}/products", params={"categoryId": "cat-ncert"}).json()
        p = prods[0]
        payload = {"items": [{"productId": p["id"], "quantity": 2, "unitPrice": p["salePrice"]}]}
        r = api_client.post(f"{API}/cart/sync", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["itemTotal"] == pytest.approx(2 * p["salePrice"])
        assert data["items"][0]["quantity"] == 2
        assert data["items"][0]["title"]

    def test_cart_sync_invalid_product_skipped(self, api_client):
        payload = {"items": [{"productId": "nonexistent-xyz", "quantity": 1, "unitPrice": 100}]}
        r = api_client.post(f"{API}/cart/sync", json=payload)
        assert r.status_code == 200
        assert r.json()["items"] == []
        assert r.json()["itemTotal"] == 0


# ---------- orders ----------
@pytest.fixture(scope="module")
def created_order():
    s = requests.Session()
    prods = s.get(f"{API}/products", params={"categoryId": "cat-ncert"}).json()
    p = prods[0]
    payload = {
        "userId": "guest",
        "deliveryAddress": {"street": "TEST_Street 1", "pincode": "110042", "lat": 28.6139, "lng": 77.2090, "instructions": ["Leave at door"]},
        "items": [{"productId": p["id"], "quantity": 2, "unitPrice": p["salePrice"]}],
        "tipAmount": 20,
        "handlingFee": 9,
        "totalAmount": 2 * p["salePrice"] + 20 + 9,
        "paymentMethod": "UPI",
    }
    r = s.post(f"{API}/orders/create", json=payload)
    assert r.status_code == 200, r.text
    return r.json()


class TestOrders:
    def test_create_order_returns_intent(self, created_order):
        assert "orderId" in created_order
        assert created_order["paymentIntent"]["status"] == "success"
        assert created_order["paymentIntent"]["method"] == "UPI"
        assert created_order["order"]["status"] == "confirmed"

    def test_live_tracking(self, api_client, created_order):
        oid = created_order["orderId"]
        r = api_client.get(f"{API}/orders/{oid}/live-tracking")
        assert r.status_code == 200
        data = r.json()
        assert data["orderId"] == oid
        assert len(data["stages"]) == 4
        assert data["stages"][0]["completed"] is True
        assert "progress" in data
        assert 0 <= data["progress"] <= 1
        assert data["etaMinutes"] >= 1
        assert data["rider"]["name"]
        assert "lat" in data["rider"] and "lng" in data["rider"]

    def test_tracking_404_for_bad_order(self, api_client):
        r = api_client.get(f"{API}/orders/does-not-exist-xyz/live-tracking")
        assert r.status_code == 404

    def test_list_orders_contains_created(self, api_client, created_order):
        r = api_client.get(f"{API}/orders", params={"userId": "guest"})
        assert r.status_code == 200
        orders = r.json()
        assert isinstance(orders, list)
        ids = [o["id"] for o in orders]
        assert created_order["orderId"] in ids

    def test_create_order_free_delivery_above_199(self, api_client):
        prods = api_client.get(f"{API}/products/featured").json()
        p = prods[0]
        payload = {
            "userId": "guest",
            "deliveryAddress": {"street": "TEST_A", "pincode": "110042", "instructions": []},
            "items": [{"productId": p["id"], "quantity": 3, "unitPrice": p["salePrice"]}],
            "tipAmount": 0,
            "handlingFee": 9,
            "totalAmount": 3 * p["salePrice"] + 9,
            "paymentMethod": "COD",
        }
        r = api_client.post(f"{API}/orders/create", json=payload)
        assert r.status_code == 200
        order = r.json()["order"]
        # deliveryCharge should be 0 since totalAmount clearly >= 199
        if payload["totalAmount"] >= 199:
            assert order["deliveryCharge"] == 0
