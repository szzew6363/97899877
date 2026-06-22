/**
 * Auth client library — JWT-based authentication
 * Full system: Login, Register, TOTP, Sessions, Security Events, Password Reset
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
  username?: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "banned";
  subscription: "free" | "starter" | "professional" | "elite" | "pro" | "enterprise";
  subscriptionExpiresAt?: string;
  tokensUsed: number;
  tokensLimit: number;
  profileImageUrl?: string;
  emailVerified: boolean;
  totpEnabled: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  verifyCodeSent?: boolean;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface UserSession {
  id: string;
  device_name?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  location?: string;
  last_active_at: string;
  expires_at: string;
  created_at: string;
}

// ── Token storage ─────────────────────────────────────────────────────────────
export function getAccessToken(): string | null  { return localStorage.getItem(ACCESS_KEY); }
export function getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

export function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
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
  } catch { clearTokens(); return null; }
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

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
        refreshQueue.push(newToken => {
          if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
          resolve(fetch(url, { ...init, headers }));
        });
      });
    }
  }
  return res;
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export async function register(data: {
  email: string; password: string; firstName?: string; lastName?: string; username?: string;
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

export async function login(
  email: string,
  password: string,
  totpCode?: string,
): Promise<AuthResponse & { requiresTOTP?: boolean }> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, totpCode }),
  });
  const json = await res.json() as AuthResponse & { requiresTOTP?: boolean; error?: string; attemptsLeft?: number; lockedUntil?: string };
  if (json.requiresTOTP) return json;
  if (!res.ok) throw Object.assign(new Error(json.error ?? "Login failed"), { attemptsLeft: json.attemptsLeft, lockedUntil: json.lockedUntil });
  saveTokens(json);
  return json;
}

export async function logout(): Promise<void> {
  try {
    const rt = getRefreshToken();
    await authFetch(`${API}/auth/logout`, {
      method: "POST",
      body: JSON.stringify({ refreshToken: rt }),
    });
  } finally { clearTokens(); }
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await authFetch(`${API}/auth/me`);
    if (!res.ok) return null;
    const user = await res.json() as AuthUser;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch { return null; }
}

export async function updateProfile(data: {
  firstName?: string; lastName?: string; username?: string;
  currentPassword?: string; newPassword?: string;
}): Promise<void> {
  const res = await authFetch(`${API}/auth/me`, { method: "PUT", body: JSON.stringify(data) });
  if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Update failed"); }
  // Refresh cached user
  await fetchMe();
}

export async function verifyEmail(code: string): Promise<void> {
  const res = await authFetch(`${API}/auth/verify-email`, { method: "POST", body: JSON.stringify({ code }) });
  if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Verification failed"); }
}

export async function resendVerification(): Promise<void> {
  await authFetch(`${API}/auth/resend-verify`, { method: "POST" });
}

export async function forgotPassword(email: string): Promise<void> {
  await fetch(`${API}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Reset failed"); }
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function getSessions(): Promise<UserSession[]> {
  const res = await authFetch(`${API}/auth/sessions`);
  const j = await res.json() as { sessions: UserSession[] };
  return j.sessions ?? [];
}

export async function revokeSession(sessionId: string): Promise<void> {
  await authFetch(`${API}/auth/sessions/${sessionId}`, { method: "DELETE" });
}

export async function revokeAllSessions(): Promise<void> {
  await authFetch(`${API}/auth/sessions`, { method: "DELETE" });
}

// ── Security events ───────────────────────────────────────────────────────────
export async function getSecurityEvents(limit = 50): Promise<SecurityEvent[]> {
  const res = await authFetch(`${API}/auth/security-events?limit=${limit}`);
  const j = await res.json() as { events: SecurityEvent[] };
  return j.events ?? [];
}

// ── TOTP ──────────────────────────────────────────────────────────────────────
export async function setupTOTP(): Promise<{ secret: string; otpAuthUrl: string }> {
  const res = await authFetch(`${API}/auth/totp/setup`, { method: "POST" });
  if (!res.ok) throw new Error("TOTP setup failed");
  return res.json() as Promise<{ secret: string; otpAuthUrl: string }>;
}

export async function verifyTOTP(code: string): Promise<void> {
  const res = await authFetch(`${API}/auth/totp/verify`, { method: "POST", body: JSON.stringify({ code }) });
  if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Invalid code"); }
}

export async function disableTOTP(password: string): Promise<void> {
  const res = await authFetch(`${API}/auth/totp`, { method: "DELETE", body: JSON.stringify({ password }) });
  if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? "Failed"); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function isSubscribed(user: AuthUser | null, tier: "pro" | "enterprise" = "pro"): boolean {
  if (!user) return false;
  if (user.subscription === "enterprise" || user.subscription === "elite") return true;
  if (tier === "pro") return ["pro", "professional", "starter"].includes(user.subscription);
  return false;
}

export function tokenUsagePercent(user: AuthUser | null): number {
  if (!user || user.tokensLimit === 0) return 0;
  return Math.min(100, Math.round((user.tokensUsed / user.tokensLimit) * 100));
}

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

export function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    login_success: "✅ تسجيل دخول ناجح",
    login_fail: "❌ محاولة دخول فاشلة",
    register: "🆕 تسجيل حساب جديد",
    logout: "🚪 تسجيل خروج",
    password_change: "🔑 تغيير كلمة المرور",
    password_reset_request: "📧 طلب إعادة تعيين كلمة المرور",
    password_reset_success: "✅ إعادة تعيين كلمة المرور",
    email_verified: "📬 تم التحقق من البريد",
    totp_enabled: "🔐 تفعيل المصادقة الثنائية",
    totp_disabled: "🔓 إيقاف المصادقة الثنائية",
    totp_fail: "❌ رمز TOTP خاطئ",
    session_revoked: "🚫 إلغاء جلسة",
    all_sessions_revoked: "🚫 إلغاء جميع الجلسات",
  };
  return labels[type] ?? type;
}
