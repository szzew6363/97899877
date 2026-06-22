import { useState } from "react";
import { ModalShell } from "@/components/ModalShell";
import { AdminDashboard } from "@/components/AdminDashboard";
import {
  Shield, Lock, Check, Copy, RefreshCw, Crown, Users, Zap, AlertCircle,
  CreditCard, Save, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  verifyAdminPassword, generateActivationCode,
  type SubscriptionTier, TIER_LABELS, TIER_TOKENS,
  loadPaymentSettings, savePaymentSettings, type PaymentSettings,
} from "@/lib/subscription";

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIERS: SubscriptionTier[] = ["free", "starter", "professional", "elite"];

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [logging, setLogging] = useState(false);
  const [genTier, setGenTier] = useState<SubscriptionTier>("starter");
  const [genDays, setGenDays] = useState(30);
  const [generatedCode, setGeneratedCode] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [setTier, setSetTier] = useState<SubscriptionTier>(state.subscription.tier);
  const [setDays, setSetDays] = useState(30);
  const [payOpen, setPayOpen] = useState(false);
  const [paySettings, setPaySettings] = useState<PaymentSettings>(loadPaymentSettings());
  const [savedPassword, setSavedPassword] = useState("");
  const [showDash, setShowDash] = useState(false);

  async function login() {
    setLogging(true);
    setPwError(false);
    const ok = await verifyAdminPassword(password);
    if (ok) {
      setAuthed(true);
      setSavedPassword(password);
      setPassword("");
      setPaySettings(loadPaymentSettings());
    } else {
      setPwError(true);
    }
    setLogging(false);
  }

  function handleClose(v: boolean) {
    if (!v) {
      setAuthed(false);
      setPassword("");
      setPwError(false);
      setGeneratedCode("");
      setPayOpen(false);
    }
    onOpenChange(v);
  }

  function activateTier() {
    const expiresAt = setTier === "free" ? null : Date.now() + setDays * 86_400_000;
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: {
        tier: setTier,
        activatedAt: setTier === "free" ? null : Date.now(),
        expiresAt,
        tokensUsed: 0,
        activationCode: `ADMIN-MANUAL-${Date.now()}`,
      },
    });
    toast({ description: `Subscription set to ${TIER_LABELS[setTier]}${setTier !== "free" ? ` for ${setDays} days` : ""}.` });
  }

  async function genCode() {
    setGenLoading(true);
    try {
      const code = await generateActivationCode(genTier, genDays, savedPassword);
      setGeneratedCode(code);
    } catch {
      toast({ description: "فشل إنشاء الكود — تحقق من صلاحيات الأدمن", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(generatedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function resetSubscription() {
    dispatch({
      type: "SET_SUBSCRIPTION",
      patch: { tier: "free", activatedAt: null, expiresAt: null, tokensUsed: 0, activationCode: null },
    });
    toast({ description: "Subscription reset to Free." });
  }

  function savePaySettings() {
    savePaymentSettings(paySettings);
    toast({ description: "Payment settings saved. Will take effect immediately." });
  }

  const sub = state.subscription;
  const tierColor: Record<SubscriptionTier, string> = {
    free: "text-muted-foreground",
    starter: "text-emerald-400",
    professional: "text-blue-400",
    elite: "text-amber-400",
  };

  const PayField = ({
    label, field, placeholder,
  }: { label: string; field: keyof PaymentSettings; placeholder?: string }) => (
    <div>
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      <input
        value={paySettings[field]}
        onChange={(e) => setPaySettings((p) => ({ ...p, [field]: e.target.value }))}
        placeholder={placeholder ?? label}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-[12px] outline-none focus:border-primary font-mono"
      />
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={() => handleClose(false)}
      title="Owner Admin Panel"
      subtitle="PRIVATE — Master access required"
      iconColor="#e21227"
      icon={<Shield className="w-4.5 h-4.5 text-primary" />}
    >
      <div className="p-4 space-y-4">
        {!authed ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Enter the owner master password</div>
            </div>

            <div className="space-y-2">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPwError(false); }}
                onKeyDown={(e) => e.key === "Enter" && login()}
                placeholder="Master password"
                className={`w-full bg-background border ${pwError ? "border-red-500" : "border-border"} rounded-xl px-4 py-3 text-sm outline-none focus:border-primary font-mono`}
                autoFocus
              />
              {pwError && (
                <div className="flex items-center gap-1.5 text-red-400 text-[12px]">
                  <AlertCircle className="w-3.5 h-3.5" /> Incorrect password
                </div>
              )}
            </div>

            <button
              onClick={login}
              disabled={logging}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {logging ? "Verifying…" : "Authenticate"}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-[12px] text-emerald-400">
              <Check className="w-4 h-4 shrink-0" /> Authenticated as Owner
            </div>

            {/* Dashboard Tab Toggle */}
            <div>
              <button onClick={() => setShowDash(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-white/6 bg-white/2 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors">
                <span className="flex items-center gap-1.5">
                  <span>📊</span> Platform Dashboard
                </span>
                <span className="text-zinc-600">{showDash ? "▲" : "▼"}</span>
              </button>
              {showDash && (
                <div className="mt-3">
                  <AdminDashboard adminPassword={savedPassword} />
                </div>
              )}
            </div>

            {/* Current subscription */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Current Device Subscription
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-black ${tierColor[sub.tier]}`}>{TIER_LABELS[sub.tier]}</span>
                {sub.expiresAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Expires: {new Date(sub.expiresAt).toLocaleDateString()} · {Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 86_400_000))}d left
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tokens used: {sub.tokensUsed.toLocaleString()} / {TIER_TOKENS[sub.tier].toLocaleString()}
              </div>
            </div>

            {/* Activate tier on this device */}
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Activate Tier on This Device
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Tier</label>
                  <select
                    value={setTier}
                    onChange={(e) => setSetTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{TIER_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={setDays}
                    onChange={(e) => setSetDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={setTier === "free"}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={activateTier}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  Activate {TIER_LABELS[setTier]}
                </button>
                <button
                  onClick={resetSubscription}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-accent transition-colors text-sm"
                  title="Reset to free"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Generate customer code */}
            <div className="border-t border-border pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Generate Customer Activation Code
              </div>
              <div className="text-[11px] text-muted-foreground">
                Generate a code to send to a paying customer. They enter it in the app to activate their plan.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Plan</label>
                  <select
                    value={genTier}
                    onChange={(e) => setGenTier(e.target.value as SubscriptionTier)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    {TIERS.filter((t) => t !== "free").map((t) => (
                      <option key={t} value={t}>{TIER_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Valid for (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={genDays}
                    onChange={(e) => setGenDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
              <button
                onClick={genCode}
                disabled={genLoading}
                className="w-full py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {genLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {genLoading ? "Generating…" : "Generate Code"}
              </button>
              {generatedCode && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-xl">
                    <code className="flex-1 text-[11px] font-mono text-cyan-400 break-all">{generatedCode}</code>
                    <button
                      onClick={copyCode}
                      className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-muted-foreground bg-amber-400/5 border border-amber-400/20 rounded-lg p-2">
                    Send this code to your customer. They enter it via Account → Activate tab. Valid for {genDays} days from now.
                  </div>
                </div>
              )}
            </div>

            {/* Payment Settings */}
            <div className="border-t border-border pt-4 space-y-3">
              <button
                onClick={() => setPayOpen((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-bold hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-violet-400" /> Payment Settings
                </span>
                {payOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {payOpen && (
                <div className="space-y-3">
                  <div className="text-[11px] text-muted-foreground">
                    Edit your payment addresses. Changes take effect immediately without redeployment.
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">USDT / Crypto</div>
                    <PayField label="USDT TRC20 Address" field="usdt_trc20" placeholder="T..." />
                    <PayField label="USDT BEP20 Address" field="usdt_bep20" placeholder="0x..." />
                    <PayField label="Bitcoin (BTC) Address" field="btc" placeholder="bc1..." />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">PayPal</div>
                    <PayField label="PayPal Handle" field="paypal_handle" placeholder="@YourPayPal" />
                    <PayField label="PayPal.me Link" field="paypal_link" placeholder="https://paypal.me/..." />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Bank Transfer</div>
                    <PayField label="Bank Name" field="bank_name" placeholder="Bank Name" />
                    <PayField label="Account Name" field="bank_account_name" placeholder="Account Holder Name" />
                    <PayField label="IBAN" field="bank_iban" placeholder="SA..." />
                    <PayField label="SWIFT / BIC" field="bank_swift" placeholder="XXXXXXXX" />
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-2.5">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Support Contacts</div>
                    <PayField label="Telegram Support Link" field="telegram" placeholder="https://t.me/..." />
                    <PayField label="Support Email" field="email" placeholder="support@..." />
                  </div>

                  <button
                    onClick={savePaySettings}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Payment Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
