import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, Crown, Building2, Star, CreditCard, Loader2, Shield, ArrowRight } from "lucide-react";
import { authFetch, getPlans, createCheckout } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Plan {
  id: string; name: string; nameEn?: string; price: number; currency: string;
  tokensLimit: number; features: string[]; stripePriceId: string | null;
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star, pro: Zap, starter: Zap, professional: Crown, elite: Crown, enterprise: Building2,
};
const PLAN_COLORS: Record<string, string> = {
  free: "from-gray-700 to-gray-800",
  starter: "from-blue-800 to-blue-900",
  pro: "from-purple-800 to-purple-900",
  professional: "from-red-800 to-red-900",
  elite: "from-red-700 to-red-950",
  enterprise: "from-amber-700 to-amber-900",
};

interface Props { onClose?: () => void }

export function PaymentGatewayPage({ onClose }: Props) {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "billing">("plans");
  const [invoices, setInvoices] = useState<Record<string, unknown>[]>([]);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);
  const [activateCode, setActivateCode] = useState("");
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadPlans();
    if (tab === "billing") loadBilling();
  }, [tab]);

  const loadPlans = async () => {
    try {
      const d = await getPlans() as { plans?: Plan[] };
      setPlans(d.plans || []);
    } catch { /* ignore */ }
  };

  const loadBilling = async () => {
    setLoading(true);
    try {
      const [invRes, subRes] = await Promise.all([
        authFetch("/api/billing/invoices"),
        authFetch("/api/billing/subscription"),
      ]);
      if (invRes.ok) { const d = await invRes.json() as { invoices?: Record<string, unknown>[] }; setInvoices(d.invoices || []); }
      if (subRes.ok) { const d = await subRes.json() as { subscription?: Record<string, unknown> }; setSubscription(d.subscription || null); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSubscribe = async (plan: Plan) => {
    if (!user) { toast({ title: "سجّل دخولك أولاً", variant: "destructive" }); return; }
    if (!plan.stripePriceId) { toast({ title: "هذه الخطة غير متاحة للشراء حالياً" }); return; }
    setLoadingPlan(plan.id);
    try {
      const url = await createCheckout(plan.id);
      window.open(url, "_blank");
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setLoadingPlan(null); }
  };

  const handleActivateCode = async () => {
    if (!activateCode.trim()) return;
    setActivating(true);
    try {
      const res = await authFetch("/api/subscriptions/activate", {
        method: "POST",
        body: JSON.stringify({ code: activateCode.trim() }),
      });
      if (res.ok) {
        toast({ title: "✅ تم تفعيل الاشتراك بنجاح!" });
        setActivateCode("");
        await refresh();
      } else {
        const d = await res.json() as { error?: string };
        toast({ title: d.error || "كود غير صالح", variant: "destructive" });
      }
    } catch { toast({ title: "فشل التفعيل", variant: "destructive" }); }
    finally { setActivating(false); }
  };

  const handleBillingPortal = async () => {
    try {
      const res = await authFetch("/api/billing/portal");
      const d = await res.json() as { url?: string };
      if (d.url) window.open(d.url, "_blank");
    } catch { toast({ title: "فشل فتح بوابة الفوترة", variant: "destructive" }); }
  };

  const usagePct = user ? Math.round((user.tokensUsed / user.tokensLimit) * 100) : 0;

  return (
    <div className="min-h-full bg-black" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-2">خطط KaliGPT</h1>
          <p className="text-gray-400">ابدأ مجاناً. ارقِّ عند الحاجة.</p>
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm">
              <span className="text-gray-400">خطتك الحالية:</span>
              <span className="text-red-400 font-semibold capitalize">{user.subscription}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400">{usagePct}% مستخدم</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-8 max-w-xs mx-auto">
          {[{ id: "plans", label: "الخطط" }, { id: "billing", label: "الفواتير" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as "plans" | "billing")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-red-600 text-white" : "text-gray-400 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Plans */}
        {tab === "plans" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(plan => {
                const Icon = PLAN_ICONS[plan.id] || Zap;
                const isCurrent = user?.subscription === plan.id;
                const isPremium = ["elite", "enterprise"].includes(plan.id);
                return (
                  <motion.div key={plan.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className={`relative p-6 rounded-2xl border transition-all ${
                      isPremium
                        ? "border-red-500/50 bg-gradient-to-br " + PLAN_COLORS[plan.id]
                        : "border-white/10 bg-white/3 hover:border-white/20"
                    }`}>
                    {isPremium && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                        الأكثر شيوعاً
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremium ? "bg-white/20" : "bg-white/5"}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{plan.name}</div>
                        <div className="text-xs text-gray-400">{plan.nameEn}</div>
                      </div>
                    </div>
                    <div className="mb-5">
                      <span className="text-3xl font-black text-white">${plan.price}</span>
                      <span className="text-gray-400 text-sm">/شهر</span>
                    </div>
                    <div className="text-sm text-gray-300 mb-4">
                      {(plan.tokensLimit / 1000).toLocaleString()}K توكن/شهر
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={isCurrent || loadingPlan === plan.id}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-default"
                          : isPremium
                          ? "bg-white text-black hover:bg-gray-100"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                      }`}>
                      {loadingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> :
                        isCurrent ? <><Check className="w-4 h-4" />خطتك الحالية</> :
                        plan.price === 0 ? "ابدأ مجاناً" :
                        <><CreditCard className="w-4 h-4" />اشترك الآن</>}
                    </button>
                  </motion.div>
                );
              })}
            </div>

            {/* Activation code */}
            <div className="max-w-md mx-auto p-5 bg-white/3 border border-white/10 rounded-2xl">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Key className="w-4 h-4 text-red-400" />
                تفعيل بكود
              </h3>
              <div className="flex gap-2">
                <input value={activateCode} onChange={e => setActivateCode(e.target.value)}
                  placeholder="أدخل كود التفعيل" dir="ltr"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                <button onClick={handleActivateCode} disabled={activating || !activateCode}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors">
                  {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : "تفعيل"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing */}
        {tab === "billing" && (
          <div className="space-y-6">
            {subscription && (
              <div className="p-5 bg-white/3 border border-white/10 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">اشتراكك الحالي</h3>
                  <button onClick={handleBillingPortal} className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
                    إدارة الفوترة <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ["الخطة", String(subscription.subscription || "—")],
                    ["الحالة", String(subscription.sub_status || "active")],
                    ["التوكن المستخدمة", `${Number(subscription.tokens_used || 0).toLocaleString()} / ${Number(subscription.tokens_limit || 0).toLocaleString()}`],
                    ["الاستهلاك", `${subscription.usage_percent || 0}%`],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div className="text-gray-400 text-xs mb-1">{k}</div>
                      <div className="text-white font-medium capitalize">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Number(subscription.usage_percent || 0))}%` }} />
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">سجل الفواتير</h3>
              {loading ? <div className="text-center py-8 text-gray-400">جاري التحميل...</div> :
              invoices.length === 0 ? <div className="text-center py-8 text-gray-400">لا توجد فواتير بعد</div> : (
                <div className="space-y-2">
                  {invoices.map((inv, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                      <div>
                        <div className="font-medium text-sm">{String(inv.description || "اشتراك شهري")}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(String(inv.created_at)).toLocaleDateString("ar")}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">${Number(inv.amount || 0).toFixed(2)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                          {String(inv.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Key({ className }: { className?: string }) {
  return <Shield className={className} />;
}
