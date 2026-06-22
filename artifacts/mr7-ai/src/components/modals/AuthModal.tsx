import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Eye, EyeOff, Shield, Zap, ChevronRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { register, login, type AuthResponse } from "@/lib/auth";
import { dispatchAuthUser } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onClose, defaultTab = "login" }: Props) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);
  useEffect(() => { setError(null); setSuccess(null); }, [tab]);

  // Holographic particle field
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.3, alpha: Math.random(),
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${p.alpha * 0.6})`;
        ctx.fill();
      });
      // Draw connecting lines
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(226,18,39,${(1 - d / 80) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let res: AuthResponse;
      if (tab === "login") {
        res = await login(email, password);
      } else {
        res = await register({ email, password, firstName, lastName });
      }
      setSuccess(tab === "login" ? `مرحباً ${res.user.firstName || res.user.email}!` : "تم إنشاء حسابك بنجاح!");
      dispatchAuthUser(res.user);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ ما. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-900/40 bg-[#0a0a0a] shadow-[0_0_60px_rgba(226,18,39,0.15)]"
          initial={{ scale: 0.92, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          {/* Particle canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />

          {/* Top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

          {/* Header */}
          <div className="relative p-6 pb-0">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="font-bold text-white text-base tracking-wide">KaliGPT</div>
                  <div className="text-xs text-zinc-500 font-mono">mr7.ai / v3.0</div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t
                      ? "bg-red-600 text-white shadow-[0_0_15px_rgba(226,18,39,0.4)]"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {t === "login" ? "تسجيل الدخول" : "حساب جديد"}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative p-6 pt-0 space-y-4">
            {tab === "register" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: firstName, set: setFirstName, label: "الاسم الأول", id: "fn" },
                  { val: lastName, set: setLastName, label: "الاسم الأخير", id: "ln" },
                ].map(f => (
                  <div key={f.id} className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      value={f.val} onChange={e => f.set(e.target.value)}
                      placeholder={f.label}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-all"
                      dir="rtl"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني" required
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-all"
                dir="ltr"
              />
            </div>

            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="كلمة المرور (8 أحرف على الأقل)" required minLength={8}
                className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pr-10 pl-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-all"
                dir="ltr"
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error/Success */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(226,18,39,0.3)] hover:shadow-[0_0_30px_rgba(226,18,39,0.5)]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {loading ? "جارٍ المعالجة..." : tab === "login" ? "دخول" : "إنشاء الحساب"}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Footer */}
            <div className="text-center text-xs text-zinc-600 pt-1">
              باستخدامك KaliGPT توافق على{" "}
              <span className="text-red-500/70 cursor-pointer hover:text-red-400">شروط الخدمة</span>
              {" "}و{" "}
              <span className="text-red-500/70 cursor-pointer hover:text-red-400">سياسة الخصوصية</span>
            </div>
          </form>

          {/* Bottom glow */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
