"""Iteration 3: Regression tests for the refactored cart/sync ($in) and kits (batched product lookup) endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://edu-supply-shop-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api/v1"


# ---------- Cart Sync (single $in query) ----------
class TestCartSyncRefactored:
    """POST /api/v1/cart/sync now performs a single {id: {$in: [...]}} lookup."""

    def _three_products(self, api_client):
        prods = api_client.get(f"{API}/products/featured").json()
        assert len(prods) >= 3
        return prods[0], prods[1], prods[2]

    def test_valid_and_unknown_mix_with_clamping(self, api_client):
        p1, p2, p3 = self._three_products(api_client)
        # p2 quantity is intentionally above stockQuantity to verify clamping
        over_qty = p2["stockQuantity"] + 100
        payload = {"items": [
            {"productId": p1["id"], "quantity": 2, "unitPrice": p1["salePrice"]},
            {"productId": p2["id"], "quantity": over_qty, "unitPrice": p2["salePrice"]},
            {"productId": p3["id"], "quantity": 1, "unitPrice": p3["salePrice"]},
            {"productId": "unknown-product-zzz", "quantity": 5, "unitPrice": 999},
        ]}
        r = api_client.post(f"{API}/cart/sync", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()

        items = data["items"]
        assert len(items) == 3, f"unknown productId should be filtered out, got {len(items)}"
        by_id = {it["productId"]: it for it in items}
        assert set(by_id.keys()) == {p1["id"], p2["id"], p3["id"]}
        assert "unknown-product-zzz" not in by_id

        # p1: qty unchanged
        assert by_id[p1["id"]]["quantity"] == 2
        assert by_id[p1["id"]]["unitPrice"] == p1["salePrice"]
        assert by_id[p1["id"]]["lineTotal"] == 2 * p1["salePrice"]

        # p2: clamped to stockQuantity
        assert by_id[p2["id"]]["quantity"] == p2["stockQuantity"]
        assert by_id[p2["id"]]["unitPrice"] == p2["salePrice"]
        assert by_id[p2["id"]]["lineTotal"] == p2["stockQuantity"] * p2["salePrice"]

        # p3: qty unchanged
        assert by_id[p3["id"]]["quantity"] == 1
        assert by_id[p3["id"]]["unitPrice"] == p3["salePrice"]
        assert by_id[p3["id"]]["lineTotal"] == 1 * p3["salePrice"]

        # itemTotal = sum of lineTotals
        expected_total = sum(it["lineTotal"] for it in items)
        assert data["itemTotal"] == pytest.approx(expected_total)

    def test_empty_items(self, api_client):
        r = api_client.post(f"{API}/cart/sync", json={"items": []})
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["itemTotal"] == 0

    def test_all_unknown(self, api_client):
        payload = {"items": [
            {"productId": "ghost-1", "quantity": 1, "unitPrice": 10},
            {"productId": "ghost-2", "quantity": 2, "unitPrice": 20},
        ]}
        r = api_client.post(f"{API}/cart/sync", json=payload)
        assert r.status_code == 200
        assert r.json()["items"] == []
        assert r.json()["itemTotal"] == 0


# ---------- Kits (batched product lookup for the list endpoint) ----------
class TestKitsRefactored:
    """GET /api/v1/kits now uses a single {sku: {$in: [...]}} lookup shared across all kits."""

    def test_list_six_kits_fully_resolved(self, api_client):
        r = api_client.get(f"{API}/kits")
        assert r.status_code == 200
        kits = r.json()
        assert isinstance(kits, list)
        assert len(kits) == 6

        for k in kits:
            assert k["items"], f"Kit {k['id']} has no items"
            # itemCount == sum of quantities
            assert k["itemCount"] == sum(i["quantity"] for i in k["items"])
            # kitPrice == sum(salePrice*qty), mrpTotal == sum(mrp*qty), savings correct
            calc_kit = sum(i["product"]["salePrice"] * i["quantity"] for i in k["items"])
            calc_mrp = sum(i["product"]["mrp"] * i["quantity"] for i in k["items"])
            assert k["kitPrice"] == round(calc_kit)
            assert k["mrpTotal"] == round(calc_mrp)
            assert k["savings"] == round(calc_mrp - calc_kit)
            assert k["savings"] >= 0
            assert k["mrpTotal"] >= k["kitPrice"]
            # each item must have a resolved product with sku/title/salePrice/mrp
            for it in k["items"]:
                p = it["product"]
                for field in ("sku", "title", "salePrice", "mrp"):
                    assert field in p and p[field] is not None, f"Missing {field} in {k['id']}"
                assert it["quantity"] >= 1

    def test_get_kit_class10_seven_items(self, api_client):
        r = api_client.get(f"{API}/kits/kit-class10")
        assert r.status_code == 200
        kit = r.json()
        assert kit["id"] == "kit-class10"
        assert kit["itemCount"] == 7
        assert len(kit["items"]) == 7
        # totals sanity
        calc_kit = sum(i["product"]["salePrice"] * i["quantity"] for i in kit["items"])
        assert kit["kitPrice"] == round(calc_kit)

    def test_unknown_kit_returns_404(self, api_client):
        r = api_client.get(f"{API}/kits/unknown")
        assert r.status_code == 404
