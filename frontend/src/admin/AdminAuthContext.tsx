import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApi, clearToken, getToken } from "@/src/admin/adminApi";

type AdminAuthState = {
  ready: boolean;
  email: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await adminApi.me();
          setEmail(me.email);
        }
      } catch {
        setEmail(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = useCallback(async (e: string, p: string) => {
    const data = await adminApi.login(e, p);
    setEmail(data.email);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setEmail(null);
  }, []);

  return <Ctx.Provider value={{ ready, email, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
