import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Key, Bell, Activity, Smartphone, Trash2, LogOut,
  Check, X, Eye, EyeOff, QrCode, Copy, RefreshCw, Lock, Mail,
  ChevronRight, AlertTriangle, Clock, Globe, Monitor,
} from "lucide-react";
import {
  fetchMe, updateProfile, verifyEmail, resendVerification,
  getSessions, revokeSession, revokeAllSessions,
  getSecurityEvents, setupTOTP, verifyTOTP, disableTOTP,
  forgotPassword, getEventLabel,
  type AuthUser, type UserSession, type SecurityEvent,
} from "@/lib/auth";
import { useAuth, dispatchAuthUser } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { tokenUsagePercent } from "@/lib/auth";

const TABS = [
  { id: "profile", label: "الملف الشخصي", icon: User },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "sessions", label: "الجلسات", icon: Smartphone },
  { id: "events", label: "سجل النشاط", icon: Activity },
  { id: "notifications", label: "الإشعارات", icon: Bell },
] as const;

type TabId = typeof TABS[number]["id"];

interface Props { onClose?: () => void }

export function AccountSettingsPage({ onClose }: Props) {
  const { user, refresh } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Email verification
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  // TOTP
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpAuthUrl: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [disablePw, setDisablePw] = useState("");
  const [showDisable2FA, setShowDisable2FA] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Security events
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setUsername(user.username ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "sessions" && sessions.length === 0) loadSessions();
    if (activeTab === "events" && events.length === 0) loadEvents();
  }, [activeTab]);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try { setSessions(await getSessions()); } catch { /* ignore */ } finally { setSessionsLoading(false); }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try { setEvents(await getSecurityEvents()); } catch { /* ignore */ } finally { setEventsLoading(false); }
  }, []);

  // ── Profile save ──────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (newPw && newPw !== confirmPw) { toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" }); return; }
    setProfileLoading(true);
    try {
      await updateProfile({
        firstName, lastName, username,
        ...(newPw ? { currentPassword: curPw, newPassword: newPw } : {}),
      });
      await refresh();
      setCurPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "✅ تم حفظ التغييرات" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setProfileLoading(false); }
  };

  // ── Email verify ──────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyCode) return;
    setVerifyLoading(true);
    try {
      await verifyEmail(verifyCode);
      await refresh();
      toast({ title: "✅ تم التحقق من البريد الإلكتروني" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setVerifyLoading(false); }
  };

  // ── TOTP ──────────────────────────────────────────────────────────────────
  const startTOTPSetup = async () => {
    setTotpLoading(true);
    try { setTotpSetup(await setupTOTP()); } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setTotpLoading(false); }
  };

  const confirmTOTP = async () => {
    if (!totpCode) return;
    setTotpLoading(true);
    try {
      await verifyTOTP(totpCode);
      setTotpSetup(null); setTotpCode("");
      await refresh();
      toast({ title: "🔐 تم تفعيل المصادقة الثنائية بنجاح" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setTotpLoading(false); }
  };

  const handleDisable2FA = async () => {
    if (!disablePw) return;
    setTotpLoading(true);
    try {
      await disableTOTP(disablePw);
      setDisablePw(""); setShowDisable2FA(false);
      await refresh();
      toast({ title: "🔓 تم إيقاف المصادقة الثنائية" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally { setTotpLoading(false); }
  };

  // ── Sessions ──────────────────────────────────────────────────────────────
  const handleRevokeSession = async (id: string) => {
    try {
      await revokeSession(id);
      setSessions(s => s.filter(x => x.id !== id));
      toast({ title: "🚫 تم إلغاء الجلسة" });
    } catch {
      toast({ title: "فشل إلغاء الجلسة", variant: "destructive" });
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeAllSessions();
      setSessions([]);
      toast({ title: "🚫 تم إلغاء جميع الجلسات" });
    } catch {
      toast({ title: "فشل", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "📋 تم النسخ" });
  };

  if (!user) return null;

  const pct = tokenUsagePercent(user);

  return (
    <div className="min-h-screen bg-black text-white" dir="rtl">
      {/* Header */}
      <div className="border-b border-red-900/30 bg-black/95 sticky top-0 z-10 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold">
              {user.firstName?.[0] ?? user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.email}</div>
              <div className="text-xs text-gray-500">{user.email} · {user.subscription}</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-52 shrink-0">
          <nav className="space-y-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  activeTab === t.id
                    ? "bg-red-600/20 text-red-400 border border-red-600/30"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </nav>

          {/* Token usage */}
          <div className="mt-6 p-3 bg-white/3 rounded-lg border border-white/10">
            <div className="text-xs text-gray-500 mb-2">استهلاك التوكن</div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-white">{pct}%</span>
              <span className="text-gray-500">{user.tokensLimit.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {/* ── PROFILE ── */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">الملف الشخصي</h2>

                  {/* Email verification banner */}
                  {!user.emailVerified && (
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-amber-300">البريد الإلكتروني غير مُتحقق منه</div>
                        <p className="text-xs text-amber-300/70 mt-1">أدخل الرمز المُرسل إلى بريدك</p>
                        <div className="flex gap-2 mt-3">
                          <input
                            value={verifyCode}
                            onChange={e => setVerifyCode(e.target.value)}
                            placeholder="الرمز المكون من 6 أرقام"
                            className="flex-1 bg-black/40 border border-amber-500/30 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                            maxLength={6}
                          />
                          <button
                            onClick={handleVerify}
                            disabled={verifyLoading || verifyCode.length < 6}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-sm font-medium rounded-lg transition-colors"
                          >
                            {verifyLoading ? "..." : "تحقق"}
                          </button>
                          <button
                            onClick={() => resendVerification().then(() => toast({ title: "📧 تم إرسال رمز جديد" }))}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-sm rounded-lg transition-colors"
                          >
                            إعادة إرسال
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="الاسم الأول" value={firstName} onChange={setFirstName} />
                    <Field label="الاسم الأخير" value={lastName} onChange={setLastName} />
                    <Field label="اسم المستخدم" value={username} onChange={setUsername} placeholder="@username" className="col-span-2" />
                    <Field label="البريد الإلكتروني" value={user.email} disabled className="col-span-2"
                      suffix={user.emailVerified ? <span className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" />مُتحقق</span> : <span className="text-xs text-amber-400">غير مُتحقق</span>} />
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="font-medium mb-4">تغيير كلمة المرور</h3>
                    <div className="space-y-3">
                      <PasswordField label="كلمة المرور الحالية" value={curPw} onChange={setCurPw} show={showPw} toggle={() => setShowPw(!showPw)} />
                      <PasswordField label="كلمة المرور الجديدة" value={newPw} onChange={setNewPw} show={showPw} toggle={() => setShowPw(!showPw)} />
                      <PasswordField label="تأكيد كلمة المرور الجديدة" value={confirmPw} onChange={setConfirmPw} show={showPw} toggle={() => setShowPw(!showPw)} />
                    </div>
                  </div>

                  <button
                    onClick={saveProfile}
                    disabled={profileLoading}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {profileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    حفظ التغييرات
                  </button>
                </div>
              )}

              {/* ── SECURITY (2FA) ── */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">الأمان</h2>

                  {/* 2FA Card */}
                  <div className="p-5 bg-white/3 border border-white/10 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Shield className="w-5 h-5 text-red-400" />
                          المصادقة الثنائية (2FA)
                          {user.totpEnabled && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">مُفعّلة</span>}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {user.totpEnabled
                            ? "حسابك محمي بالمصادقة الثنائية عبر تطبيق TOTP"
                            : "أضف طبقة حماية إضافية بتطبيق Google Authenticator أو Authy"}
                        </p>
                      </div>
                      {user.totpEnabled ? (
                        <button
                          onClick={() => setShowDisable2FA(!showDisable2FA)}
                          className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition-colors"
                        >
                          إيقاف 2FA
                        </button>
                      ) : (
                        <button
                          onClick={startTOTPSetup}
                          disabled={totpLoading}
                          className="px-3 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg transition-colors"
                        >
                          {totpLoading ? "..." : "تفعيل 2FA"}
                        </button>
                      )}
                    </div>

                    {/* TOTP Setup flow */}
                    {totpSetup && !user.totpEnabled && (
                      <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                        <p className="text-sm text-gray-300">افتح Google Authenticator أو Authy وامسح الـ QR code:</p>
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-4 bg-white rounded-xl">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(totpSetup.otpAuthUrl)}`}
                              alt="TOTP QR Code"
                              className="w-44 h-44"
                            />
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1">أو أدخل الكود يدوياً:</div>
                            <div className="flex items-center gap-2 font-mono text-sm bg-black/50 border border-white/10 px-3 py-2 rounded-lg">
                              <span className="text-red-300 break-all">{totpSetup.secret}</span>
                              <button onClick={() => copyToClipboard(totpSetup.secret)} className="shrink-0 text-gray-500 hover:text-white">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={totpCode}
                            onChange={e => setTotpCode(e.target.value.replace(/\D/g, ""))}
                            placeholder="أدخل الرمز من التطبيق"
                            maxLength={6}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                          />
                          <button
                            onClick={confirmTOTP}
                            disabled={totpLoading || totpCode.length < 6}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm rounded-lg transition-colors"
                          >
                            {totpLoading ? "..." : "تأكيد"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Disable 2FA */}
                    {showDisable2FA && user.totpEnabled && (
                      <div className="mt-5 border-t border-white/10 pt-5 space-y-3">
                        <p className="text-sm text-red-300">أدخل كلمة مرورك لإيقاف المصادقة الثنائية:</p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={disablePw}
                            onChange={e => setDisablePw(e.target.value)}
                            placeholder="كلمة المرور"
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                          />
                          <button
                            onClick={handleDisable2FA}
                            disabled={totpLoading || !disablePw}
                            className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-sm rounded-lg transition-colors"
                          >
                            {totpLoading ? "..." : "إيقاف"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Password reset link */}
                  <div className="p-5 bg-white/3 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <Key className="w-5 h-5 text-red-400" />
                          إعادة تعيين كلمة المرور
                        </div>
                        <p className="text-sm text-gray-400 mt-1">أرسل رابط إعادة التعيين لبريدك الإلكتروني</p>
                      </div>
                      <button
                        onClick={() => forgotPassword(user.email).then(() => toast({ title: "📧 تم إرسال رابط الإعادة" }))}
                        className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                      >
                        إرسال رابط
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SESSIONS ── */}
              {activeTab === "sessions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">الجلسات النشطة</h2>
                    <div className="flex gap-2">
                      <button onClick={loadSessions} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${sessionsLoading ? "animate-spin" : ""}`} />
                      </button>
                      {sessions.length > 0 && (
                        <button
                          onClick={handleRevokeAll}
                          className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          إلغاء الكل
                        </button>
                      )}
                    </div>
                  </div>

                  {sessionsLoading ? (
                    <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">لا توجد جلسات نشطة</div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map(s => (
                        <div key={s.id} className="flex items-center gap-4 p-4 bg-white/3 border border-white/10 rounded-xl hover:border-white/20 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            {s.device_type === "mobile" ? <Smartphone className="w-5 h-5 text-gray-400" /> : <Monitor className="w-5 h-5 text-gray-400" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{s.device_name ?? "جهاز غير معروف"}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                              {s.ip_address && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{s.ip_address}</span>}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(s.last_active_at).toLocaleString("ar-SA")}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeSession(s.id)}
                            className="p-2 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── SECURITY EVENTS ── */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">سجل الأحداث الأمنية</h2>
                    <button onClick={loadEvents} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${eventsLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>

                  {eventsLoading ? (
                    <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
                  ) : events.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">لا توجد أحداث مسجلة</div>
                  ) : (
                    <div className="space-y-2">
                      {events.map(e => (
                        <div key={e.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                          e.success ? "bg-white/3 border-white/10" : "bg-red-900/10 border-red-900/30"
                        }`}>
                          <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${e.success ? "bg-green-400" : "bg-red-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{getEventLabel(e.event_type)}</div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                              {e.ip_address && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{e.ip_address}</span>}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(e.created_at).toLocaleString("ar-SA")}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTIFICATIONS ── */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold">إعدادات الإشعارات</h2>
                  <div className="space-y-3">
                    {[
                      { id: "quota", label: "تحذير استهلاك التوكن", desc: "عند الوصول لـ 80% و95% من الحد الشهري" },
                      { id: "login", label: "تنبيه تسجيل الدخول", desc: "عند تسجيل الدخول من جهاز جديد" },
                      { id: "payment", label: "إشعارات الدفع", desc: "تأكيد الدفع وتجديد الاشتراك" },
                      { id: "security", label: "التنبيهات الأمنية", desc: "محاولات الدخول الفاشلة والأحداث الأمنية" },
                      { id: "agent", label: "اكتمال مهام الوكيل", desc: "عند انتهاء مهام الوكيل الطويلة" },
                    ].map(item => (
                      <NotifRow key={item.id} label={item.label} desc={item.desc} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, disabled, placeholder, className, suffix }: {
  label: string; value: string; onChange?: (v: string) => void;
  disabled?: boolean; placeholder?: string; className?: string;
  suffix?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {suffix && <div className="absolute left-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 pr-10"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function NotifRow({ label, desc }: { label: string; desc: string }) {
  const [on, setOn] = useState(true);
  return (
    <div className="flex items-center justify-between p-4 bg-white/3 border border-white/10 rounded-xl">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`w-11 h-6 rounded-full relative transition-colors ${on ? "bg-red-600" : "bg-white/10"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? "right-0.5" : "left-0.5"}`} />
      </button>
    </div>
  );
}
