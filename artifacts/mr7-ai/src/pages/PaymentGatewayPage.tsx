/**
 * PaymentGatewayPage — 3D Holographic Payment Portal
 * Subscription plans · payment history · billing · crypto/bank/PayPal
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, X, Zap, Crown, Star, Shield, Check, ChevronRight, Clock, DollarSign, Bitcoin, Copy, CheckCircle2, ArrowRight } from "lucide-react";

type Plan = "starter" | "professional" | "elite";
type PayMethod = "usdt_trc20" | "usdt_bep20" | "btc" | "paypal" | "bank";

interface PlanDef { id: Plan; name: string; price: number; yearlyPrice: number; tokens: string; color: string; icon: React.ElementType; features: string[] }

const PLANS: PlanDef[] = [
  { id: "starter", name: "Starter", price: 25, yearlyPrice: 20, tokens: "300K توكن/شهر", color: "#3b82f6", icon: Zap, features: ["5 نماذج AI", "توليد الصور", "OCR", "5 حلقات عميل", "دعم عبر التيليجرام"] },
  { id: "professional", name: "Professional", price: 90, yearlyPrice: 72, tokens: "1.5M توكن/شهر", color: "#8b5cf6", icon: Star, features: ["كل نماذج Elite", "Agent IDE", "بحث الويب المظلم", "Shell Generator", "وضع Council+Fusion", "أولوية الدعم"] },
  { id: "elite", name: "Elite", price: 150, yearlyPrice: 120, tokens: "3M توكن/شهر", color: "#e21227", icon: Crown, features: ["Godmode Mode", "كل شيء غير محدود", "تشفير متقدم", "API مخصص", "دعم 24/7 مخصص", "لوحة مخصصة"] },
];

const PAYMENT_INFO: Record<PayMethod, { label: string; value: string; network?: string }> = {
  usdt_trc20: { label: "USDT TRC-20", value: "TXXXxxxYYYzzzAAABBBCCCDDDeeeFFFGGG", network: "Tron Network" },
  usdt_bep20: { label: "USDT BEP-20", value: "0xXXXxxxYYYzzzAAABBBCCCDDDeeeFFF", network: "BNB Smart Chain" },
  btc: { label: "Bitcoin", value: "bc1qXXXxxxYYYzzzAAABBBCCCDDDeeeFF", network: "Bitcoin Network" },
  paypal: { label: "PayPal", value: "pay@mr7.ai", network: "PayPal.me/mr7ai" },
  bank: { label: "تحويل بنكي", value: "IBAN: SA00 0000 0000 0000 0000 00", network: "البنك الأهلي — رقم الحساب" },
};

interface Props { onClose?: () => void }

export function PaymentGatewayPage({ onClose }: Props) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("usdt_trc20");
  const [step, setStep] = useState<"plans" | "payment" | "confirm">("plans");
  const [copied, setCopied] = useState(false);

  const copy = (v: string) => { navigator.clipboard.writeText(v).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const selPlan = PLANS.find(p => p.id === selected);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 10%,rgba(245,158,11,.05) 0%,transparent 50%),radial-gradient(ellipse at 80% 90%,rgba(226,18,39,.04) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><CreditCard className="w-5 h-5 text-amber-400" /></div>
          <div><h2 className="text-base font-bold text-white">بوابة الدفع — 3D</h2><p className="text-xs text-zinc-600">اختر خطتك وطريقة الدفع</p></div>
        </div>
        <div className="flex items-center gap-3">
          {step !== "plans" && <button onClick={() => setStep("plans")} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">رجوع</button>}
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {step === "plans" && (
          <>
            <div className="flex items-center justify-center">
              <div className="flex p-1 rounded-xl bg-white/5 border border-white/8">
                {[["monthly", "شهري"], ["yearly", "سنوي (وفر 20%)"]].map(([v, l]) => (
                  <button key={v} onClick={() => setBilling(v as "monthly" | "yearly")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${billing === v ? "bg-amber-500/25 border border-amber-500/30 text-amber-400" : "text-zinc-500"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan, i) => {
                const price = billing === "yearly" ? plan.yearlyPrice : plan.price;
                return (
                  <motion.div key={plan.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={`relative p-5 rounded-2xl border cursor-pointer transition-all ${selected === plan.id ? "scale-[1.02]" : "hover:scale-[1.01]"}`}
                    style={{ background: selected === plan.id ? `${plan.color}12` : "rgba(255,255,255,0.02)", borderColor: selected === plan.id ? `${plan.color}50` : "rgba(255,255,255,0.08)", boxShadow: selected === plan.id ? `0 0 30px ${plan.color}20` : "none" }}
                    onClick={() => setSelected(plan.id)}>
                    {plan.id === "professional" && <div className="absolute -top-2 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-[10px] font-bold text-white">الأكثر شيوعاً</div>}
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                        <plan.icon className="w-5 h-5" style={{ color: plan.color }} />
                      </div>
                      <p className="text-base font-black text-white">{plan.name}</p>
                    </div>
                    <p className="text-3xl font-black text-white mb-0.5">${price}<span className="text-sm font-medium text-zinc-500">/شهر</span></p>
                    <p className="text-xs text-zinc-500 mb-4">{plan.tokens}</p>
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <Check className="w-3 h-3 flex-shrink-0" style={{ color: plan.color }} />{f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                      style={{ backgroundColor: selected === plan.id ? plan.color : `${plan.color}20`, color: selected === plan.id ? "#fff" : plan.color, borderColor: `${plan.color}40` }}
                      onClick={e => { e.stopPropagation(); setSelected(plan.id); setStep("payment"); }}>
                      اختر {plan.name}
                    </button>
                  </motion.div>
                );
              })}
            </div>
            <div className="text-center text-xs text-zinc-600">ضمان استرداد المال خلال 7 أيام · دعم 24/7 عبر التيليجرام</div>
          </>
        )}

        {step === "payment" && selPlan && (
          <div className="max-w-md mx-auto space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r" style={{ backgroundImage: `linear-gradient(135deg, ${selPlan.color}15, rgba(0,0,0,0.3))`, border: `1px solid ${selPlan.color}25` }}>
              <div className="flex items-center gap-3">
                <selPlan.icon className="w-8 h-8" style={{ color: selPlan.color }} />
                <div>
                  <p className="text-lg font-black text-white">{selPlan.name}</p>
                  <p className="text-sm text-zinc-400">${billing === "yearly" ? selPlan.yearlyPrice : selPlan.price}/شهر · {selPlan.tokens}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-400 mb-2">طريقة الدفع</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(PAYMENT_INFO) as PayMethod[]).map(m => (
                  <button key={m} onClick={() => setPayMethod(m)} className={`py-2 px-1.5 rounded-lg text-[10px] font-medium text-center border transition-all ${payMethod === m ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "bg-white/3 border-white/8 text-zinc-500 hover:text-zinc-300"}`}>
                    {m === "btc" ? "₿" : m === "paypal" ? "PP" : m === "bank" ? "بنك" : m === "usdt_trc20" ? "USDT T" : "USDT B"}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-white/6">
              <p className="text-xs text-zinc-400 mb-2">{PAYMENT_INFO[payMethod].label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-white font-mono bg-black/30 px-3 py-2 rounded-lg break-all">{PAYMENT_INFO[payMethod].value}</code>
                <button onClick={() => copy(PAYMENT_INFO[payMethod].value)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-all">
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {PAYMENT_INFO[payMethod].network && <p className="text-[10px] text-zinc-600 mt-1.5">{PAYMENT_INFO[payMethod].network}</p>}
            </div>
            <button onClick={() => setStep("confirm")} className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${selPlan.color}, ${selPlan.color}aa)`, boxShadow: `0 0 20px ${selPlan.color}30` }}>
              لقد أرسلت الدفع <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="max-w-md mx-auto text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">شكراً لك!</h3>
              <p className="text-sm text-zinc-400">سيتم مراجعة عملية الدفع خلال 1-24 ساعة. ستتلقى كود التفعيل عبر التيليجرام أو البريد الإلكتروني.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/3 border border-white/6 text-right">
              <p className="text-xs text-zinc-400 mb-1">للدعم والمتابعة</p>
              <p className="text-sm font-medium text-white">t.me/mr7ai_support</p>
              <p className="text-sm font-medium text-white">support@mr7.ai</p>
            </div>
            <button onClick={() => setStep("plans")} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">العودة للخطط</button>
          </div>
        )}
      </div>
    </div>
  );
}
