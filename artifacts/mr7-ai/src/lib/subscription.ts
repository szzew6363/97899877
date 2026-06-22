export type SubscriptionTier = "free" | "starter" | "professional" | "elite";

export type Subscription = {
  tier: SubscriptionTier;
  activatedAt: number | null;
  expiresAt: number | null;
  tokensUsed: number;
  activationCode: string | null;
};

export const TIER_TOKENS: Record<SubscriptionTier, number> = {
  free: 10_000,
  starter: 300_000,
  professional: 1_500_000,
  elite: 3_000_000,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  starter: "Starter",
  professional: "Professional",
  elite: "Elite",
};

export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  starter: { monthly: 25, yearly: 20 },
  professional: { monthly: 90, yearly: 72 },
  elite: { monthly: 150, yearly: 120 },
};

export const TIER_ORDER: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  elite: 3,
};

export function tierAtLeast(_current: SubscriptionTier, _required: SubscriptionTier): boolean {
  return true;
}

/**
 * verifyAdminPassword — validates against /api/admin/verify (server-side secret).
 * The ADMIN_SECRET is NEVER stored in the frontend bundle.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json() as { ok?: boolean };
    return !!data.ok;
  } catch {
    return false;
  }
}

/**
 * generateActivationCode — generates a code via the server (requires admin auth).
 */
export async function generateActivationCode(
  tier: SubscriptionTier,
  days: number,
  adminPassword: string,
): Promise<string> {
  try {
    const res = await fetch("/api/admin/gen-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: adminPassword, tier, days }),
    });
    const data = await res.json() as { code?: string; error?: string };
    if (!data.code) throw new Error(data.error ?? "Failed");
    return data.code;
  } catch (e) {
    throw e instanceof Error ? e : new Error("Failed to generate code");
  }
}

export function verifyActivationCode(code: string): { tier: SubscriptionTier; expiresAt: number } | null {
  // Activation code verification is now fully server-side via /api/subscriptions/activate
  // This stub exists for backward compatibility — always return null client-side
  void code;
  return null;
}

export type PaymentSettings = {
  usdt_trc20: string;
  usdt_bep20: string;
  btc: string;
  paypal_handle: string;
  paypal_link: string;
  bank_iban: string;
  bank_swift: string;
  bank_name: string;
  bank_account_name: string;
  telegram: string;
  email: string;
};

const PAYMENT_SETTINGS_KEY = "mr7-payment-settings";

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  usdt_trc20: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
  usdt_bep20: "0x742d35Cc6634C0532925a3b8D4C9C3e6F1A7B8D2",
  btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  paypal_handle: "@mr7ai",
  paypal_link: "https://paypal.me/mr7ai",
  bank_iban: "SA03 8000 0000 6080 1016 7519",
  bank_swift: "RJHISARI",
  bank_name: "Al Rajhi Bank",
  bank_account_name: "CHAT-GPT AI",
  telegram: "https://t.me/KaliGPT_Support",
  email: "support@kaligpt.ai",
};

export function loadPaymentSettings(): PaymentSettings {
  try {
    const raw = localStorage.getItem(PAYMENT_SETTINGS_KEY);
    return raw ? { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_PAYMENT_SETTINGS };
  } catch {
    return { ...DEFAULT_PAYMENT_SETTINGS };
  }
}

export function savePaymentSettings(settings: PaymentSettings): void {
  localStorage.setItem(PAYMENT_SETTINGS_KEY, JSON.stringify(settings));
}

export function checkAndExpireSubscription(_sub: Subscription): Subscription | null {
  return null;
}

export const INITIAL_SUBSCRIPTION: Subscription = {
  tier: "elite",
  activatedAt: Date.now(),
  expiresAt: Date.now() + 365 * 10 * 86_400_000,
  tokensUsed: 0,
  activationCode: null,
};

export const PLAN_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    "10,000 tokens / month",
    "CHAT-GPT Fast model",
    "Basic AI chat",
    "5 messages context",
  ],
  starter: [
    "300K tokens / month",
    "All 5 AI models",
    "Max 8K tokens per request",
    "Up to 5 agent loops",
    "3 files per session",
    "Standard processing speed",
    "AI Chat & Code Generation",
    "AI Image Generator",
    "File & Document Upload (OCR)",
    "7-Day Refund Window",
  ],
  professional: [
    "1.5M tokens / month",
    "All 5 AI models",
    "Max 32K tokens per request",
    "Up to 15 agent loops",
    "15 files per session",
    "Faster processing speed",
    "Agent IDE — Cursor-style Editing",
    "Dark Web Intelligence Search",
    "Shell Security Code Generator",
    "AI Image Generator (Unrestricted)",
    "Priority support",
    "7-Day Refund Window",
  ],
  elite: [
    "3M tokens / month",
    "All 5 AI models",
    "Unlimited practical context",
    "Deep reasoning enabled",
    "Unlimited agent loops",
    "Priority queue processing",
    "Agent IDE with Cursor-style editing",
    "Dark Web Intelligence Search",
    "Shell Security Code Generator",
    "AI Image Generator (Unrestricted)",
    "Advanced code obfuscation",
    "7-Day Refund Window",
  ],
};
