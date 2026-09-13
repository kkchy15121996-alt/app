import Constants from "expo-constants";

const RAW_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_BACKEND_URL ||
  "";

export const API_BASE = `${RAW_URL.replace(/\/$/, "")}/api`;

export type Product = {
  id: string;
  sku: string;
  title: string;
  subtitle: string;
  mrp: number;
  salePrice: number;
  discountPercentage: number;
  category: string;
  images: string[];
  stockQuantity: number;
  darkStoreId: string;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  image: string;
  color: string;
};

export type DarkStore = {
  id: string;
  name: string;
  slaMinutes: string;
  lat: number;
  lng: number;
};

export type CartItem = { productId: string; quantity: number; unitPrice: number };

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export const api = {
  nearestStore: () => request<DarkStore>("/v1/darkstore/nearest"),
  categories: () => request<Category[]>("/v1/categories"),
  products: (categoryId?: string, q?: string) => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (q) params.set("q", q);
    const query = params.toString();
    return request<Product[]>(`/v1/products${query ? `?${query}` : ""}`);
  },
  featured: () => request<Product[]>("/v1/products/featured"),
  createOrder: (payload: any) =>
    request<{ orderId: string; paymentIntent: any; order: any }>("/v1/orders/create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  tracking: (orderId: string) => request<any>(`/v1/orders/${orderId}/live-tracking`),
  orders: () => request<any[]>(`/v1/orders`),
};
