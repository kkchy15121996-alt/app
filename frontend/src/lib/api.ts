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

export type AddressLabel = "Home" | "Office" | "Hostel" | "Other";

export type Address = {
  id: string;
  userId: string;
  label: AddressLabel;
  street: string;
  landmark: string;
  pincode: string;
  lat: number;
  lng: number;
  isDefault: boolean;
  createdAt: string;
};

export type KitItem = { product: Product; quantity: number };

export type Kit = {
  id: string;
  grade: string;
  title: string;
  tagline: string;
  color: string;
  image: string;
  items: KitItem[];
  itemCount: number;
  mrpTotal: number;
  kitPrice: number;
  savings: number;
};

export type StreakStatus = {
  examName: string | null;
  examDate: string | null;
  daysLeft: number | null;
  streak: number;
  active: boolean;
  discountPercent: number;
  potentialPercent: number;
  nextDiscountPercent: number;
  maxPercent: number;
  studyCategories: string[];
};

export const USER_ID = "guest";

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
    request<{ orderId: string; paymentIntent: any; order: any; reward: { applied: boolean; discount: number; streak: number; nextDiscountPercent: number } }>(
      "/v1/orders/create",
      { method: "POST", body: JSON.stringify(payload) },
    ),
  tracking: (orderId: string) => request<any>(`/v1/orders/${orderId}/live-tracking`),
  orders: () => request<any[]>(`/v1/orders?userId=${USER_ID}`),
  reorderItems: (orderId: string) =>
    request<{ orderId: string; items: KitItem[]; unavailableCount: number }>(`/v1/orders/${orderId}/reorder-items`),

  addresses: () => request<Address[]>(`/v1/addresses?userId=${USER_ID}`),
  createAddress: (payload: { label: AddressLabel; street: string; landmark: string; pincode: string }) =>
    request<Address>("/v1/addresses", { method: "POST", body: JSON.stringify({ ...payload, userId: USER_ID }) }),
  selectAddress: (id: string) =>
    request<Address>(`/v1/addresses/${id}/select?userId=${USER_ID}`, { method: "PUT" }),
  deleteAddress: (id: string) =>
    request<{ deleted: string }>(`/v1/addresses/${id}?userId=${USER_ID}`, { method: "DELETE" }),

  kits: () => request<Kit[]>("/v1/kits"),

  streak: () => request<StreakStatus>(`/v1/rewards/streak?userId=${USER_ID}`),
  setExamDate: (examName: string, examDate: string) =>
    request<StreakStatus>("/v1/rewards/exam-date", {
      method: "PUT",
      body: JSON.stringify({ userId: USER_ID, examName, examDate }),
    }),
  clearExamDate: () =>
    request<StreakStatus>(`/v1/rewards/exam-date?userId=${USER_ID}`, { method: "DELETE" }),
};
