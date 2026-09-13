"""Iteration 2: Addresses, Kits, Reorder, Streak Rewards backend tests."""
import os
import pytest
import requests
from datetime import date, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://edu-supply-shop-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api/v1"


# ---------- Addresses ----------
class TestAddresses:
    def test_list_returns_default_home(self, api_client):
        r = api_client.get(f"{API}/addresses", params={"userId": "guest"})
        assert r.status_code == 200
        addrs = r.json()
        assert isinstance(addrs, list)
        assert len(addrs) >= 1
        home = next((a for a in addrs if a["label"] == "Home"), None)
        assert home is not None, "Home address not seeded"
        assert home["isDefault"] is True
        assert home["street"] == "B-42, Swaroop Nagar"

    def test_create_select_delete_flow(self, api_client):
        payload = {
            "userId": "guest",
            "label": "Hostel",
            "street": "TEST_Room 12, DU North Campus",
            "pincode": "110007",
        }
        r = api_client.post(f"{API}/addresses", json=payload)
        assert r.status_code == 201, r.text
        addr = r.json()
        assert addr["label"] == "Hostel"
        assert addr["isDefault"] is False  # existing Home is default
        aid = addr["id"]

        # select this new address
        r2 = api_client.put(f"{API}/addresses/{aid}/select", params={"userId": "guest"})
        assert r2.status_code == 200
        assert r2.json()["isDefault"] is True

        # verify others are false
        list_r = api_client.get(f"{API}/addresses", params={"userId": "guest"})
        defaults = [a for a in list_r.json() if a["isDefault"]]
        assert len(defaults) == 1
        assert defaults[0]["id"] == aid

        # delete this new one (should succeed since Home still remains)
        d = api_client.delete(f"{API}/addresses/{aid}", params={"userId": "guest"})
        assert d.status_code == 200
        assert d.json()["deleted"] == aid

        # verify Home is now default again (auto-promoted)
        after = api_client.get(f"{API}/addresses", params={"userId": "guest"}).json()
        assert any(a["label"] == "Home" and a["isDefault"] for a in after)

    def test_delete_last_address_returns_400(self, api_client):
        # Get current addresses; only Home should be left. If more, clean up TEST_ ones first.
        addrs = api_client.get(f"{API}/addresses", params={"userId": "guest"}).json()
        for a in addrs:
            if a["label"] != "Home":
                api_client.delete(f"{API}/addresses/{a['id']}", params={"userId": "guest"})
        addrs = api_client.get(f"{API}/addresses", params={"userId": "guest"}).json()
        assert len(addrs) == 1
        home_id = addrs[0]["id"]
        r = api_client.delete(f"{API}/addresses/{home_id}", params={"userId": "guest"})
        assert r.status_code == 400

    def test_invalid_pincode_returns_422(self, api_client):
        payload = {
            "userId": "guest",
            "label": "Other",
            "street": "TEST_Bad Pincode Ave",
            "pincode": "11007",  # only 5 digits
        }
        r = api_client.post(f"{API}/addresses", json=payload)
        assert r.status_code == 422


# ---------- Kits ----------
class TestKits:
    def test_list_returns_6_resolved_kits(self, api_client):
        r = api_client.get(f"{API}/kits")
        assert r.status_code == 200
        kits = r.json()
        assert isinstance(kits, list)
        assert len(kits) == 6
        for k in kits:
            assert k["items"], f"Kit {k['id']} has no items"
            assert k["itemCount"] > 0
            assert k["kitPrice"] > 0
            assert k["mrpTotal"] >= k["kitPrice"]
            assert k["savings"] > 0
            # each item must have a resolved product object
            for it in k["items"]:
                assert "product" in it
                assert "id" in it["product"]
                assert "salePrice" in it["product"]
                assert it["quantity"] >= 1

    def test_get_kit_class10(self, api_client):
        r = api_client.get(f"{API}/kits/kit-class10")
        assert r.status_code == 200
        kit = r.json()
        assert kit["id"] == "kit-class10"
        # 4 NCERTs + CBSE + register + pens => 7 items expected
        assert kit["itemCount"] == 7

    def test_kit_unknown_404(self, api_client):
        r = api_client.get(f"{API}/kits/unknown")
        assert r.status_code == 404


# ---------- Streak Rewards ----------
class TestStreakRewards:
    def test_inactive_initially(self, api_client):
        # ensure any prior exam is cleared
        api_client.delete(f"{API}/rewards/exam-date", params={"userId": "guest"})
        r = api_client.get(f"{API}/rewards/streak", params={"userId": "guest"})
        assert r.status_code == 200
        s = r.json()
        assert s["active"] is False
        assert s["discountPercent"] == 0
        assert s["potentialPercent"] == 3

    def test_set_future_exam_activates(self, api_client):
        future = (date.today() + timedelta(days=30)).isoformat()
        r = api_client.put(f"{API}/rewards/exam-date", json={
            "userId": "guest", "examName": "CBSE Boards", "examDate": future,
        })
        assert r.status_code == 200
        s = r.json()
        assert s["active"] is True
        assert s["discountPercent"] == 3
        assert s["examName"] == "CBSE Boards"

    def test_past_exam_date_returns_422(self, api_client):
        past = (date.today() - timedelta(days=1)).isoformat()
        r = api_client.put(f"{API}/rewards/exam-date", json={
            "userId": "guest", "examName": "Old", "examDate": past,
        })
        assert r.status_code == 422

    def test_order_with_study_product_applies_discount_and_increments_streak(self, api_client):
        # Ensure exam is set to a future date
        future = (date.today() + timedelta(days=30)).isoformat()
        api_client.put(f"{API}/rewards/exam-date", json={
            "userId": "guest", "examName": "CBSE Boards", "examDate": future,
        })
        # get streak baseline
        before = api_client.get(f"{API}/rewards/streak", params={"userId": "guest"}).json()
        base_streak = before["streak"]
        base_percent = before["discountPercent"]

        prods = api_client.get(f"{API}/products", params={"categoryId": "cat-ncert"}).json()
        p = prods[0]
        qty = 2
        study_subtotal = qty * p["salePrice"]
        payload = {
            "userId": "guest",
            "deliveryAddress": {"street": "TEST_streak", "pincode": "110042", "instructions": []},
            "items": [{"productId": p["id"], "quantity": qty, "unitPrice": p["salePrice"]}],
            "tipAmount": 0,
            "handlingFee": 9,
            "totalAmount": study_subtotal + 9,
            "paymentMethod": "UPI",
        }
        r = api_client.post(f"{API}/orders/create", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["reward"]["applied"] is True
        expected_discount = round(study_subtotal * base_percent / 100)
        assert body["reward"]["discount"] == expected_discount
        assert body["order"]["streakDiscount"] == expected_discount
        # streak increments in returned body
        assert body["reward"]["streak"] == base_streak + 1

        # now streak GET should reflect +1 streak and +1% discount
        after = api_client.get(f"{API}/rewards/streak", params={"userId": "guest"}).json()
        assert after["streak"] == base_streak + 1
        assert after["discountPercent"] == base_percent + 1

    def test_delete_exam_date_deactivates(self, api_client):
        r = api_client.delete(f"{API}/rewards/exam-date", params={"userId": "guest"})
        assert r.status_code == 200
        s = r.json()
        assert s["active"] is False
        assert s["examName"] is None


# ---------- Reorder ----------
class TestReorder:
    def test_reorder_items_populated(self, api_client):
        # Create a fresh order first
        prods = api_client.get(f"{API}/products", params={"categoryId": "cat-pens"}).json()
        p = prods[0]
        payload = {
            "userId": "guest",
            "deliveryAddress": {"street": "TEST_reorder", "pincode": "110042", "instructions": []},
            "items": [{"productId": p["id"], "quantity": 3, "unitPrice": p["salePrice"]}],
            "tipAmount": 0,
            "handlingFee": 9,
            "totalAmount": 3 * p["salePrice"] + 9,
            "paymentMethod": "COD",
        }
        create = api_client.post(f"{API}/orders/create", json=payload).json()
        oid = create["orderId"]

        r = api_client.get(f"{API}/orders/{oid}/reorder-items")
        assert r.status_code == 200
        data = r.json()
        assert data["orderId"] == oid
        assert isinstance(data["items"], list)
        assert len(data["items"]) >= 1
        for it in data["items"]:
            assert "product" in it and "id" in it["product"]
            assert it["quantity"] >= 1

    def test_reorder_unknown_order_404(self, api_client):
        r = api_client.get(f"{API}/orders/nonexistent-order-id/reorder-items")
        assert r.status_code == 404


# ---------- Final cleanup ----------
class TestZZCleanup:
    """Run last (alphabetical order) to leave DB clean per iteration 2 request."""
    def test_cleanup_exam_and_addresses(self, api_client):
        # clear exam date
        api_client.delete(f"{API}/rewards/exam-date", params={"userId": "guest"})
        s = api_client.get(f"{API}/rewards/streak", params={"userId": "guest"}).json()
        assert s["active"] is False

        # delete all non-Home addresses
        addrs = api_client.get(f"{API}/addresses", params={"userId": "guest"}).json()
        for a in addrs:
            if a["label"] != "Home":
                api_client.delete(f"{API}/addresses/{a['id']}", params={"userId": "guest"})
        remaining = api_client.get(f"{API}/addresses", params={"userId": "guest"}).json()
        assert len(remaining) == 1
        assert remaining[0]["label"] == "Home"
        assert remaining[0]["isDefault"] is True
