import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE, type Category, type ClassSession, type Product } from "@/src/lib/api";

const TOKEN_KEY = "kapa_admin_token";

export async function getToken(): Promise<string | null> {
  return Platform.OS === "web" ? AsyncStorage.getItem(TOKEN_KEY) : SecureStore.getItemAsync(TOKEN_KEY);
}
export async function saveToken(token: string) {
  if (Platform.OS === "web") await AsyncStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken() {
  if (Platform.OS === "web") await AsyncStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) return data.detail.map((d: any) => d.msg).join(", ");
  } catch {}
  return `Request failed (${res.status})`;
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new AdminApiError(401, "Not signed in");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}/admin${path}`, { ...init, headers });
  if (res.status === 401) {
    await clearToken();
    throw new AdminApiError(401, "Session expired, please sign in again");
  }
  if (!res.ok) throw new AdminApiError(res.status, await parseError(res));
  return (await res.json()) as T;
}

export type AdminProduct = Product & { featured: boolean; isActive: boolean; sortOrder: number; updatedAt?: string };
export type AdminOrder = {
  id: string;
  userId: string;
  items: { productId: string; quantity: number; unitPrice: number; title: string; image: string | null }[];
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: "paid" | "pending";
  status: string;
  address: { street: string; pincode: string; instructions?: string[] };
  createdAt: string;
  streakDiscount?: number;
  tipAmount?: number;
};
export type AdminStats = { products: number; lowStock: number; orders: number; pendingOrders: number; revenue: number; classes: number };
export type ClassInput = Omit<ClassSession, "id">;

export const adminApi = {
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    if (!res.ok) throw new AdminApiError(res.status, await parseError(res));
    const data = await res.json();
    await saveToken(data.access_token);
    return data as { email: string };
  },
  me: () => adminFetch<{ email: string; role: string }>("/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    adminFetch<{ ok: boolean }>("/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
  stats: () => adminFetch<AdminStats>("/stats"),

  products: () => adminFetch<AdminProduct[]>("/products"),
  categories: () => adminFetch<Category[]>("/categories"),
  createProduct: (body: Record<string, unknown>) => adminFetch<AdminProduct>("/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Record<string, unknown>) =>
    adminFetch<AdminProduct>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: string) => adminFetch<{ id: string }>(`/products/${id}`, { method: "DELETE" }),
  moveProduct: (id: string, direction: "up" | "down") =>
    adminFetch<{ moved: boolean }>(`/products/${id}/move`, { method: "POST", body: JSON.stringify({ direction }) }),

  classes: () => adminFetch<ClassSession[]>("/classes"),
  createClass: (body: ClassInput) => adminFetch<ClassSession>("/classes", { method: "POST", body: JSON.stringify(body) }),
  updateClass: (id: string, body: ClassInput) => adminFetch<ClassSession>(`/classes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteClass: (id: string) => adminFetch<{ deleted: string }>(`/classes/${id}`, { method: "DELETE" }),

  orders: () => adminFetch<AdminOrder[]>("/orders"),
  setOrderStatus: (id: string, status: string) =>
    adminFetch<AdminOrder>(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  upload: (form: FormData) => adminFetch<{ path: string; url: string; name: string; contentType: string }>("/upload", { method: "POST", body: form }),
};
