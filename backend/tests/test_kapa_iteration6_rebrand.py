"""Iteration 6: Rebrand regression - Kapa Learning -> Kapa Book Bazaar.

Explicit backend contract checks for:
- Service name at GET /api/
- Darkstore SLA label '2-3 HRS'
- Admin auth on new email admin@kapabookbazaar.in; old email rejected
- CORS allowlist (kapabookbazaar.in), regex (*.emergentagent.com), rejection for random origins
- Orders create returns slaMinutes 150; live-tracking etaMinutes <= 150 and stage label contains 'Kapa Book Bazaar Store'.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://edu-supply-shop-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api/v1"

NEW_ADMIN_EMAIL = "admin@kapabookbazaar.in"
OLD_ADMIN_EMAIL = "admin@kapalearning.com"
ADMIN_PASSWORD = "Kapa@Admin2026"


# ---------- Rebrand: root service ----------
class TestRebrandRoot:
    def test_root_service_name(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body.get("service") == "Kapa Book Bazaar API", body


# ---------- Rebrand: darkstore SLA ----------
class TestRebrandDarkstore:
    def test_nearest_sla_is_hours(self):
        r = requests.get(f"{API}/darkstore/nearest", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("slaMinutes") == "2-3 HRS", data


# ---------- Rebrand: admin auth ----------
class TestRebrandAdminAuth:
    def test_new_email_login_success(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": NEW_ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("email") == NEW_ADMIN_EMAIL
        assert isinstance(body.get("access_token"), str) and len(body["access_token"]) > 20

    def test_old_email_login_rejected(self):
        r = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": OLD_ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 401, r.text


# ---------- Rebrand: CORS ----------
class TestRebrandCORS:
    def _preflight(self, origin):
        return requests.options(
            f"{API}/categories",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=15,
        )

    def test_allow_kapabookbazaar_in(self):
        r = self._preflight("https://kapabookbazaar.in")
        allow = r.headers.get("access-control-allow-origin")
        assert allow == "https://kapabookbazaar.in", f"got {allow!r} status={r.status_code}"

    def test_allow_emergent_regex(self):
        # NOTE: The Emergent platform ingress blocks Origin: *.preview.emergentagent.com
        # at the edge (returns 400 "Disallowed CORS origin") even though the backend
        # regex accepts it locally. Use a non-preview *.emergentagent.com origin to
        # verify the backend regex is actually wired up correctly through the public URL.
        origin = "https://random.emergentagent.com"
        r = self._preflight(origin)
        allow = r.headers.get("access-control-allow-origin")
        assert allow == origin, f"got {allow!r} status={r.status_code}"

    def test_backend_regex_matches_preview_locally(self):
        # Confirm the backend CORS regex matches the actual preview host that
        # the frontend uses (localhost bypasses the platform ingress).
        r = requests.options(
            "http://localhost:8001/api/v1/categories",
            headers={
                "Origin": "https://edu-supply-shop-1.preview.emergentagent.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=10,
        )
        assert r.status_code == 200
        assert r.headers.get("access-control-allow-origin") == "https://edu-supply-shop-1.preview.emergentagent.com"

    def test_reject_random_origin(self):
        r = self._preflight("https://evil.example.com")
        allow = r.headers.get("access-control-allow-origin")
        assert allow is None, f"unexpected allow-origin header for random origin: {allow!r}"


# ---------- Rebrand: order SLA + tracking stage label ----------
@pytest.fixture(scope="module")
def rebrand_order():
    s = requests.Session()
    prods = s.get(f"{API}/products", params={"categoryId": "cat-ncert"}, timeout=15).json()
    p = prods[0]
    payload = {
        "userId": "rebrand-test-user",
        "deliveryAddress": {"street": "TEST_Iter6 Rd", "pincode": "110042", "instructions": []},
        "items": [{"productId": p["id"], "quantity": 1, "unitPrice": p["salePrice"]}],
        "tipAmount": 0,
        "handlingFee": 9,
        "totalAmount": p["salePrice"] + 9,
        "paymentMethod": "UPI",
    }
    r = s.post(f"{API}/orders/create", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


class TestRebrandOrders:
    def test_order_sla_minutes_150(self, rebrand_order):
        assert rebrand_order["order"]["slaMinutes"] == 150, rebrand_order["order"]

    def test_live_tracking_eta_and_stage_label(self, rebrand_order):
        oid = rebrand_order["orderId"]
        r = requests.get(f"{API}/orders/{oid}/live-tracking", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["etaMinutes"] <= 150, data
        labels = [s.get("label", "") for s in data.get("stages", [])]
        packed = next((s for s in data["stages"] if s.get("key") == "packed"), None)
        assert packed is not None, data
        assert "Kapa Book Bazaar Store" in packed["label"], packed
        # No stale brand string in any label
        for lbl in labels:
            assert "Kapa Learning" not in lbl, labels
