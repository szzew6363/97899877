import { FullPageOverlay } from "@/components/FullPageOverlay";
import {
  Crown, MessageSquare, Brain, Bookmark, Zap, Key, Check, AlertCircle,
  Lock, Unlock, ChevronRight, User, BarChart3, Star, Shield, X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { TIER_LABELS, TIER_TOKENS, TIER_PRICES, tierAtLeast, verifyActivationCode } from "@/lib/subscription";
import type { SubscriptionTier } from "@/lib/subscription";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const PROFILE_KEY = "mr7-profile";
const AVATAR_COLORS = [
  { id: "red", label: "Crimson", from: "#e21227", to: "#7f0718", text: "#fff" },
  { id: "blue", label: "Midnight", from: "#1d4ed8", to: "#1e3a8a", text: "#fff" },
  { id: "emerald", label: "Emerald", from: "#10b981", to: "#065f46", text: "#fff" },
  { id: "amber", label: "Gold", from: "#f59e0b", to: "#92400e", text: "#000" },
  { id: "violet", label: "Violet", from: "#7c3aed", to: "#3b0764", text: "#fff" },
  { id: "cyan", label: "Cyan", from: "#06b6d4", to: "#164e63", text: "#000" },
];

type Profile = { displayName: string; avatarColorId: string };

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : { displayName: "KaliGPT User", avatarColorId: "red" };
  } catch {
    return { displayName: "KaliGPT User", avatarColorId: "red" };
  }
}
function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

const TIER_FEATURES: Record<SubscriptionTier, { label: string; tier: SubscriptionTier }[]> = {
  free: [],
  starter: [
    { label: "All 5 AI Models", tier: "starter" },
    { label: "AI Image Generator", tier: "starter" },
    { label: "File & OCR Upload", tier: "starter" },
    { label: "Voice Chat with AI", tier: "starter" },
    { label: "300K tokens / month", tier: "starter" },
  ],
  professional: [
    { label: "Agent IDE Mode", tier: "professional" },
    { label: "Red Team Mode", tier: "professional" },
    { label: "Fusion Mode (105 Brains)", tier: "professional" },
    { label: "Council Mode (AI Parliament)", tier: "professional" },
    { label: "Dark Web Intelligence Search", tier: "professional" },
    { label: "Shell Security Code Generator", tier: "professional" },
    { label: "1.5M tokens / month", tier: "professional" },
  ],
  elite: [
    { label: "Godmode (Ultra AI Race)", tier: "elite" },
    { label: "Malware Arsenal (10 tools)", tier: "elite" },
    { label: "Advanced Code Obfuscation", tier: "elite" },
    { label: "Priority Processing Queue", tier: "elite" },
    { label: "Unlimited Agent Loops", tier: "elite" },
    { label: "3M tokens / month", tier: "elite" },
  ],
};

const ALL_FEATURES = [
  ...TIER_FEATURES.starter,
  ...TIER_FEATURES.professional,
  ...TIER_FEATURES.elite,
];

const tierBadgeStyle: Record<SubscriptionTier, string> = {
  free: "border-border bg-background text-muted-foreground",
  starter: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  professional: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  elite: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

const tierGlow: Record<SubscriptionTier, string> = {
  free: "",
  starter: "shadow-[0_0_20px_rgba(16,185,129,0.12)]",
  professional: "shadow-[0_0_20px_rgba(59,130,246,0.12)]",
  elite: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
};

type Tab = "profile" | "features" | "activate";

export function AccountModal({
  open,
  onOpenChange,
  onUpgrade,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpgrade: () => void;
}) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeSuccess, setCodeSuccess] = useState(false);

  useEffect(() => {
    if (open) setProfile(loadProfile());
  }, [open]);

  const sub = state.subscription;
  const tokenLimit = TIER_TOKENS[sub.tier];
  const used = sub.tokensUsed;
  const usedPct = Math.min(100, (used / tokenLimit) * 100);

  const totalChats = state.chats.length;
  const totalMessages = state.chats.reduce((a, c) => a + c.messages.length, 0);
  const totalBookmarks = state.chats.reduce((a, c) => a + c.messages.filter((m) => m.bookmarked).length, 0);
  const totalMemory = state.memory.length;

  const avatarColor = AVATAR_COLORS.find((c) => c.id === profile.avatarColorId) ?? AVATAR_COLORS[0];
  const initials = profile.displayName.trim().split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  function saveName() {
    if (!nameInput.trim()) return;
    const next = { ...profile, displayName: nameInput.trim() };
    setProfile(next);
    saveProfile(next);
    setEditingName(false);
    toast({ description: "Display name updated." });
  }

  function pickColor(id: string) {
    const next = { ...profile, avatarColorId: id };
    setProfile(next);
    saveProfile(next);
  }

  function activateCode() {
    const result = verifyActivationCode(codeInput.trim());
    if (!result) {
      setCodeError("Invalid or expired code.");
      return;
    }
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: {
        tier: result.tier,
        activatedAt: Date.now(),
        expiresAt: result.expiresAt,
        tokensUsed: 0,
        activationCode: codeInput.trim(),
      },
    });
    setCodeSuccess(true);
    setCodeError("");
    setCodeInput("");
    toast({ description: `${TIER_LABELS[result.tier]} plan activated!` });
  }

  const daysLeft = sub.expiresAt
    ? Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 86_400_000))
    : null;

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-sm font-bold text-white">حسابي</h2>
          <button onClick={() => onOpenChange(false)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white hover:border-[#e21227] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">

        {/* Avatar + Plan Header */}
        <div className={`mx-5 mt-4 p-4 rounded-2xl border border-border bg-card ${tierGlow[sub.tier]}`}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black border-2 border-white/10 shrink-0 select-none"
              style={{ background: `linear-gradient(135deg, ${avatarColor.from}, ${avatarColor.to})`, color: avatarColor.text }}
            >
              {initials || "K"}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex gap-2 mb-1">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                    className="flex-1 bg-background border border-primary rounded-lg px-2 py-1 text-sm outline-none font-semibold"
                    maxLength={32}
                  />
                  <button onClick={saveName} className="px-2 py-1 rounded-lg bg-primary text-white text-xs font-bold">Save</button>
                </div>
              ) : (
                <button
                  onClick={() => { setNameInput(profile.displayName); setEditingName(true); }}
                  className="font-bold text-lg leading-tight hover:text-primary transition-colors text-left truncate max-w-full block"
                  title="Click to edit name"
                >
                  {profile.displayName}
                </button>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${tierBadgeStyle[sub.tier]}`}>
                  {TIER_LABELS[sub.tier]} plan
                </span>
                {daysLeft !== null && (
                  <span className={`text-[10px] font-mono ${daysLeft < 7 ? "text-red-400" : "text-muted-foreground"}`}>
                    {daysLeft}d left
                  </span>
                )}
                {sub.tier === "free" && (
                  <span className="text-[10px] text-muted-foreground">No expiry</span>
                )}
              </div>
            </div>
          </div>

          {/* Avatar color picker */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avatar</span>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickColor(c.id)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${profile.avatarColorId === c.id ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Token bar */}
        <div className="mx-5 mt-3 p-3 rounded-xl bg-card border border-border space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1.5"><BarChart3 className="w-3 h-3" /> Token balance</span>
            <span className="font-mono font-semibold">{(tokenLimit - used).toLocaleString()} <span className="text-muted-foreground">/ {tokenLimit.toLocaleString()}</span></span>
          </div>
          <div className="h-1.5 rounded-full bg-accent overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usedPct > 80 ? "bg-red-500" : usedPct > 50 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.max(2, 100 - usedPct)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{used.toLocaleString()} tokens used · resets monthly</div>
        </div>

        {/* Tabs */}
        <div className="flex mx-5 mt-3 bg-card border border-border rounded-xl p-1 gap-1">
          {([
            { id: "profile" as Tab, icon: User, label: "Stats" },
            { id: "features" as Tab, icon: Star, label: "Features" },
            { id: "activate" as Tab, icon: Key, label: "Activate" },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${tab === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 mt-3 space-y-3">
          {tab === "profile" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: MessageSquare, label: "Total Chats", value: totalChats, color: "text-blue-400" },
                  { icon: Zap, label: "Messages Sent", value: totalMessages, color: "text-emerald-400" },
                  { icon: Bookmark, label: "Bookmarked", value: totalBookmarks, color: "text-amber-400" },
                  { icon: Brain, label: "Memory Items", value: totalMemory, color: "text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-card border border-border p-3">
                    <s.icon className={`w-4 h-4 mb-1.5 ${s.color}`} />
                    <div className="font-mono text-lg font-black leading-tight">{s.value.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-card border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
                  <Shield className="w-3 h-3" /> Plan Details
                </div>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span className={`font-bold ${tierBadgeStyle[sub.tier].split(" ").at(-1)}`}>{TIER_LABELS[sub.tier]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly tokens</span>
                    <span className="font-mono">{tokenLimit.toLocaleString()}</span>
                  </div>
                  {sub.tier !== "free" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price</span>
                        <span className="font-mono">${TIER_PRICES[sub.tier].monthly}/mo</span>
                      </div>
                      {sub.activatedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Activated</span>
                          <span className="font-mono">{new Date(sub.activatedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      {sub.expiresAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expires</span>
                          <span className={`font-mono ${daysLeft && daysLeft < 7 ? "text-red-400" : ""}`}>
                            {new Date(sub.expiresAt).toLocaleDateString()} ({daysLeft}d)
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === "features" && (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground mb-1">
                Your current plan unlocks the following features:
              </div>
              {ALL_FEATURES.map((feat) => {
                const unlocked = tierAtLeast(sub.tier, feat.tier);
                return (
                  <div
                    key={feat.label}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${unlocked ? "bg-card border-border" : "bg-background border-border/50 opacity-60"}`}
                  >
                    {unlocked
                      ? <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <span className={`text-[12px] font-medium flex-1 ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{feat.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      feat.tier === "starter" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                      feat.tier === "professional" ? "border-blue-500/30 text-blue-400 bg-blue-500/10" :
                      "border-amber-500/30 text-amber-400 bg-amber-500/10"
                    }`}>
                      {TIER_LABELS[feat.tier].toUpperCase()}
                    </span>
                  </div>
                );
              })}
              {!tierAtLeast(sub.tier, "elite") && (
                <button
                  onClick={() => { onOpenChange(false); onUpgrade(); }}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-primary to-rose-600 text-white text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to unlock all features
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {tab === "activate" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-card border border-border text-[12px] text-muted-foreground">
                Enter an activation code you received after payment to upgrade your plan instantly.
              </div>
              <div className="space-y-2">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Activation Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); setCodeSuccess(false); }}
                    onKeyDown={(e) => e.key === "Enter" && activateCode()}
                    placeholder="Enter your code here"
                    className={`flex-1 bg-background border ${codeError ? "border-red-500/60" : "border-border"} focus:border-primary rounded-xl px-3 py-2.5 text-[12px] outline-none font-mono tracking-wider`}
                  />
                  <button
                    onClick={activateCode}
                    disabled={!codeInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    <Key className="w-3.5 h-3.5" /> Apply
                  </button>
                </div>
                {codeError && (
                  <div className="flex items-center gap-1.5 text-red-400 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" /> {codeError}
                  </div>
                )}
                {codeSuccess && (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <Check className="w-3.5 h-3.5" /> Plan activated successfully!
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3 space-y-2">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">Don't have a code?</div>
                <button
                  onClick={() => { onOpenChange(false); onUpgrade(); }}
                  className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  {sub.tier === "free" ? "Upgrade Plan" : "Upgrade to Higher Plan"}
                </button>
                <div className="text-[10px] text-center text-muted-foreground">
                  After payment, you'll receive an activation code via Telegram or email.
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
