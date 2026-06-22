/**
 * Auth client library — JWT-based authentication
 * Wraps API calls for login, register, logout, refresh, and token management
 */

const API = "/api";
const ACCESS_KEY  = "mr7_access";
const REFRESH_KEY = "mr7_refresh";
const USER_KEY    = "mr7_user";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "user" | "admin";
  subscription: "free" | "pro" | "enterprise" | "starter" | "professional" | "elite";
  subscriptionExpiresAt?: string;
  tokensUsed: number;
  tokensLimit: number;
  profileImageUrl?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ── Token storage ─────────────────────────────────────────────────────────────
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function saveTokens(data: AuthResponse) {
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Authenticated fetch — auto-refreshes on 401 ───────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json() as { accessToken: string; refreshToken: string };
    localStorage.setItem(ACCESS_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", headers.get("Content-Type") ?? "application/json");

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await doRefresh();
      isRefreshing = false;
      refreshQueue.forEach(cb => cb(newToken));
      refreshQueue = [];
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetch(url, { ...init, headers });
      }
    } else {
      return new Promise(resolve => {
        refreshQueue.push((newToken) => {
          if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
          resolve(fetch(url, { ...init, headers }));
        });
      });
    }
  }
  return res;
}

// ── Auth API calls ─────────────────────────────────────────────────────────────
export async function register(data: {
  email: string; password: string; firstName?: string; lastName?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json() as AuthResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Registration failed");
  saveTokens(json);
  return json;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json() as AuthResponse & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "Login failed");
  saveTokens(json);
  return json;
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${API}/auth/logout`, { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await authFetch(`${API}/auth/me`);
    if (!res.ok) return null;
    const user = await res.json() as AuthUser;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return null;
  }
}

export async function updateProfile(data: {
  firstName?: string; lastName?: string; currentPassword?: string; newPassword?: string;
}): Promise<void> {
  const res = await authFetch(`${API}/auth/me`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await res.json() as { error?: string };
    throw new Error(j.error ?? "Update failed");
  }
}

// ── Subscription helpers ───────────────────────────────────────────────────────
export function isSubscribed(user: AuthUser | null, tier: "pro" | "enterprise" = "pro"): boolean {
  if (!user) return false;
  if (user.subscription === "enterprise") return true;
  if (tier === "pro" && (user.subscription === "pro" || user.subscription === "professional" || user.subscription === "starter" || user.subscription === "elite")) return true;
  return false;
}

export function tokenUsagePercent(user: AuthUser | null): number {
  if (!user || user.tokensLimit === 0) return 0;
  return Math.min(100, Math.round((user.tokensUsed / user.tokensLimit) * 100));
}

// ── Plans ──────────────────────────────────────────────────────────────────────
export async function getPlans() {
  const res = await fetch(`${API}/stripe/plans`);
  return res.json();
}

export async function createCheckout(planId: string): Promise<string> {
  const res = await authFetch(`${API}/stripe/create-checkout`, {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
  return data.url;
}
