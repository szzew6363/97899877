import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { AuthUser } from "@/lib/auth";
import { fetchMe, getCachedUser, clearTokens, getAccessToken } from "@/lib/auth";

interface AuthContext {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

let _authCtx: AuthContext | null = null;

export function useAuth(): AuthContext {
  const [user, setUser] = useState<AuthUser | null>(() => getCachedUser());
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!getAccessToken()) { setUser(null); return; }
    setLoading(true);
    try {
      const u = await fetchMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    clearTokens();
    setUser(null);
    window.dispatchEvent(new CustomEvent("mr7:signout"));
  }, []);

  useEffect(() => {
    if (getAccessToken() && !user) {
      refresh();
    }
  }, []);

  // Listen for auth events from other components
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<AuthUser>;
      setUser(ce.detail ?? null);
    };
    window.addEventListener("mr7:auth", handler);
    window.addEventListener("mr7:signout", () => setUser(null));
    return () => {
      window.removeEventListener("mr7:auth", handler);
      window.removeEventListener("mr7:signout", () => setUser(null));
    };
  }, []);

  return { user, loading, refresh, signOut };
}

export function dispatchAuthUser(user: AuthUser) {
  window.dispatchEvent(new CustomEvent("mr7:auth", { detail: user }));
}
