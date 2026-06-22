import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, User, Eye, EyeOff, Shield, Zap, ChevronRight, AlertCircle, CheckCircle2, Loader2, KeyRound, AtSign } from "lucide-react";
import { register, login, forgotPassword, resetPassword, type AuthResponse } from "@/lib/auth";
import { dispatchAuthUser } from "@/hooks/useAuth";

type ModalTab = "login" | "register" | "forgot" | "reset" | "totp";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ open, onClose, defaultTab = "login" }: Props) {
  const [tab, setTab] = useState<ModalTab>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { setTab(defaultTab); }, [defaultTab]);
  useEffect(() => { setError(null); setSuccess(null); setAttemptsLeft(null); }, [tab]);

  // Particle canvas animation
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.3, a: Math.random(),
    }));
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${p.a * 0.6})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 80) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(226,18,39,${(1 - d / 80) * 0.15})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const handleLogin = async () => {
    setLoading(true); setError(null);
    try {
      const res = await login(email, password, totpCode || undefined);
      if ("requiresTOTP" in res && res.requiresTOTP) {
        setTab("totp"); setLoading(false); return;
      }
      const authRes = res as AuthResponse;
      setSuccess(`مرحباً ${authRes.user.firstName || authRes.user.email}!`);
      dispatchAuthUser(authRes.user);
      setTimeout(onClose, 1000);
    } catch (err) {
      const e = err as Error & { attemptsLeft?: number; lockedUntil?: string };
      setError(e.message);
      if (e.attemptsLeft !== undefined) setAttemptsLeft(e.attemptsLeft);
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setLoading(true); setError(null);
    try {
      const res = await register({ email, password, firstName, lastName, username: username || undefined });
      setSuccess("تم إنشاء حسابك! 🎉 تحقق من بريدك للتأكيد.");
      dispatchAuthUser(res.user);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("أدخل بريدك الإلكتروني"); return; }
    setLoading(true); setError(null);
    try {
      await forgotPassword(email);
      setSuccess("إذا كان البريد مسجلاً، سيصلك رابط الإعادة خلال لحظات.");
    } catch { setError("حدث خطأ. حاول مرة أخرى."); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!resetToken || !newPassword) { setError("أدخل الرمز وكلمة المرور الجديدة"); return; }
    if (newPassword.length < 8) { setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setLoading(true); setError(null);
    try {
      await resetPassword(resetToken, newPassword);
      setSuccess("✅ تم إعادة تعيين كلمة المرور. يمكنك تسجيل الدخول الآن.");
      setTimeout(() => setTab("login"), 1500);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleTOTP = async () => {
    if (!totpCode) return;
    setLoading(true); setError(null);
    try {
      const res = await login(email, password, totpCode);
      const authRes = res as AuthResponse;
      setSuccess(`مرحباً ${authRes.user.firstName || authRes.user.email}!`);
      dispatchAuthUser(authRes.user);
      setTimeout(onClose, 1000);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") handleLogin();
    else if (tab === "register") handleRegister();
    else if (tab === "forgot") handleForgotPassword();
    else if (tab === "reset") handleResetPassword();
    else if (tab === "totp") handleTOTP();
  };

  if (!open) return null;

  const titles: Record<ModalTab, string> = {
    login: "تسجيل الدخول",
    register: "حساب جديد",
    forgot: "نسيت كلمة المرور؟",
    reset: "إعادة تعيين كلمة المرور",
    totp: "رمز المصادقة الثنائية",
  };

  const submitLabels: Record<ModalTab, string> = {
    login: "دخول",
    register: "إنشاء الحساب",
    forgot: "إرسال رابط الإعادة",
    reset: "تعيين كلمة المرور الجديدة",
    totp: "تأكيد",
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-900/40 bg-[#0a0a0a] shadow-[0_0_60px_rgba(226,18,39,0.15)]"
          initial={{ scale: 0.92, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

          {/* Header */}
          <div className="relative p-6 pb-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="font-bold text-white tracking-wide">KaliGPT</div>
                  <div className="text-xs text-zinc-500 font-mono">mr7.ai / v3.0</div>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Main tabs — only for login/register */}
            {(tab === "login" || tab === "register") && (
              <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-5">
                {(["login", "register"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      tab === t ? "bg-red-600 text-white shadow-[0_0_15px_rgba(226,18,39,0.4)]" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t === "login" ? "تسجيل الدخول" : "حساب جديد"}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-page header */}
            {(tab === "forgot" || tab === "reset" || tab === "totp") && (
              <div className="mb-5">
                <button onClick={() => setTab("login")} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-3 transition-colors">
                  <ChevronRight className="w-3 h-3 rotate-180" /> العودة لتسجيل الدخول
                </button>
                <div className="text-base font-semibold text-white">{titles[tab]}</div>
                {tab === "totp" && <p className="text-xs text-zinc-500 mt-1">افتح تطبيق المصادقة وأدخل الرمز المكون من 6 أرقام</p>}
                {tab === "forgot" && <p className="text-xs text-zinc-500 mt-1">أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة</p>}
                {tab === "reset" && <p className="text-xs text-zinc-500 mt-1">أدخل الرمز الذي وصلك والرمز يصلح لـ 10 دقائق فقط</p>}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative p-6 pt-0 space-y-3.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-3.5"
              >
                {/* Register: name fields */}
                {tab === "register" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <InField icon={<User className="w-4 h-4" />} value={firstName} onChange={setFirstName} placeholder="الاسم الأول" />
                      <InField icon={<User className="w-4 h-4" />} value={lastName} onChange={setLastName} placeholder="الاسم الأخير" />
                    </div>
                    <InField icon={<AtSign className="w-4 h-4" />} value={username} onChange={setUsername} placeholder="اسم المستخدم (اختياري)" dir="ltr" />
                  </>
                )}

                {/* Email field */}
                {(tab === "login" || tab === "register" || tab === "forgot") && (
                  <InField icon={<Mail className="w-4 h-4" />} type="email" value={email} onChange={setEmail} placeholder="البريد الإلكتروني" required dir="ltr" />
                )}

                {/* Password */}
                {(tab === "login" || tab === "register") && (
                  <div className="relative">
                    <InField
                      icon={<Lock className="w-4 h-4" />}
                      type={showPw ? "text" : "password"}
                      value={password} onChange={setPassword}
                      placeholder="كلمة المرور (8 أحرف على الأقل)"
                      required minLength={8} dir="ltr"
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 z-10">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Forgot password link */}
                {tab === "login" && (
                  <div className="flex justify-end">
                    <button type="button" onClick={() => setTab("forgot")} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                )}

                {/* Reset password: token + new password */}
                {tab === "reset" && (
                  <>
                    <InField icon={<KeyRound className="w-4 h-4" />} value={resetToken} onChange={setResetToken} placeholder="رمز الإعادة من البريد" dir="ltr" />
                    <div className="relative">
                      <InField
                        icon={<Lock className="w-4 h-4" />}
                        type={showPw ? "text" : "password"}
                        value={newPassword} onChange={setNewPassword}
                        placeholder="كلمة المرور الجديدة" minLength={8} dir="ltr"
                      />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 z-10">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}

                {/* TOTP code */}
                {tab === "totp" && (
                  <InField
                    icon={<Shield className="w-4 h-4" />}
                    value={totpCode}
                    onChange={v => setTotpCode(v.replace(/\D/g, "").slice(0, 6))}
                    placeholder="رمز المصادقة (6 أرقام)"
                    dir="ltr"
                    maxLength={6}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Attempts warning */}
            {attemptsLeft !== null && attemptsLeft > 0 && (
              <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                ⚠️ تبقى {attemptsLeft} محاولة قبل قفل الحساب
              </div>
            )}

            {/* Error / Success */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(226,18,39,0.3)] hover:shadow-[0_0_30px_rgba(226,18,39,0.5)]">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              {loading ? "جارٍ المعالجة..." : submitLabels[tab]}
              {!loading && tab !== "totp" && <ChevronRight className="w-4 h-4" />}
            </button>

            {/* Reset password link from forgot */}
            {tab === "forgot" && !success && (
              <div className="text-center">
                <button type="button" onClick={() => setTab("reset")} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                  لديّ رمز الإعادة بالفعل →
                </button>
              </div>
            )}

            <div className="text-center text-xs text-zinc-600 pt-1">
              باستخدامك KaliGPT توافق على{" "}
              <span className="text-red-500/70 cursor-pointer hover:text-red-400">شروط الخدمة</span>
              {" "}و{" "}
              <span className="text-red-500/70 cursor-pointer hover:text-red-400">سياسة الخصوصية</span>
            </div>
          </form>

          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function InField({
  icon, type = "text", value, onChange, placeholder, required, minLength, maxLength, dir,
}: {
  icon?: React.ReactNode; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; minLength?: number; maxLength?: number; dir?: string;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">{icon}</span>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required} minLength={minLength} maxLength={maxLength}
        dir={dir ?? "rtl"}
        className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pr-10 pl-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 focus:bg-white/8 transition-all"
      />
    </div>
  );
}
