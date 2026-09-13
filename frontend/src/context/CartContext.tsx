import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Product } from "@/src/lib/api";

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartState = {
  lines: Record<string, CartLine>;
  totalCount: number;
  totalPrice: number;
  addOne: (product: Product) => void;
  removeOne: (productId: string) => void;
  setQuantity: (productId: string, qty: number) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
};

const CartCtx = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Record<string, CartLine>>({});

  const addOne = useCallback((product: Product) => {
    setLines((prev) => {
      const existing = prev[product.id];
      const nextQty = (existing?.quantity ?? 0) + 1;
      if (nextQty > product.stockQuantity) return prev;
      return { ...prev, [product.id]: { product, quantity: nextQty } };
    });
  }, []);

  const removeOne = useCallback((productId: string) => {
    setLines((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const nextQty = existing.quantity - 1;
      if (nextQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...existing, quantity: nextQty } };
    });
  }, []);

  const setQuantity = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...existing, quantity: qty } };
    });
  }, []);

  const clear = useCallback(() => setLines({}), []);

  const quantityOf = useCallback((productId: string) => lines[productId]?.quantity ?? 0, [lines]);

  const totals = useMemo(() => {
    let count = 0;
    let price = 0;
    Object.values(lines).forEach((l) => {
      count += l.quantity;
      price += l.quantity * l.product.salePrice;
    });
    return { totalCount: count, totalPrice: Math.round(price * 100) / 100 };
  }, [lines]);

  const value: CartState = {
    lines,
    ...totals,
    addOne,
    removeOne,
    setQuantity,
    clear,
    quantityOf,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
