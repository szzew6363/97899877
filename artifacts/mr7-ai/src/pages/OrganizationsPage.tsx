import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users, UserPlus, Crown, Shield, Trash2, RefreshCw, Mail, Settings, BarChart3, Copy, Check } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Member { id: string; user_id: string; email: string; first_name?: string; last_name?: string; role: string; status: string; created_at: string; last_login_at?: string }
interface Invite { id: string; email: string; role: string; status: string; expires_at: string }
interface Org { id: string; name: string; slug: string; description?: string; plan: string; max_members: number; owner_id: string; member_role: string }

interface Props { onClose?: () => void }

export function OrganizationsPage({ onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [usage, setUsage] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "members" | "invites" | "usage">("overview");
  const [creating, setCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDesc, setOrgDesc] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const loadOrg = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/orgs/me");
      if (res.ok) {
        const d = await res.json() as { org?: Org; members?: Member[]; invites?: Invite[] };
        setOrg(d.org || null); setMembers(d.members || []); setInvites(d.invites || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const loadUsage = useCallback(async () => {
    try {
      const res = await authFetch("/api/orgs/usage");
      if (res.ok) { const d = await res.json() as { members?: Record<string, unknown>[] }; setUsage(d.members || []); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadOrg(); }, []);
  useEffect(() => { if (tab === "usage") loadUsage(); }, [tab]);

  const createOrg = async () => {
    if (!orgName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/orgs", { method: "POST", body: JSON.stringify({ name: orgName, description: orgDesc }) });
      if (res.ok) { toast({ title: "✅ تم إنشاء المنظمة" }); await loadOrg(); }
      else { const e = await res.json() as { error?: string }; toast({ title: e.error || "فشل الإنشاء", variant: "destructive" }); }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await authFetch("/api/orgs/invite", { method: "POST", body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      if (res.ok) {
        const d = await res.json() as { inviteUrl?: string };
        setInviteLink(window.location.origin + (d.inviteUrl || ""));
        setInviteEmail(""); toast({ title: "✅ تم إرسال الدعوة" }); await loadOrg();
      } else {
        const e = await res.json() as { error?: string };
        toast({ title: e.error || "فشل الإرسال", variant: "destructive" });
      }
    } catch { toast({ title: "فشل", variant: "destructive" }); }
    finally { setInviting(false); }
  };

  const removeMember = async (userId: string) => {
    try {
      await authFetch(`/api/orgs/members/${userId}`, { method: "DELETE" });
      setMembers(m => m.filter(x => x.user_id !== userId));
      toast({ title: "تم إزالة العضو" });
    } catch { toast({ title: "فشل", variant: "destructive" }); }
  };

  const changeRole = async (userId: string, role: string) => {
    try {
      await authFetch(`/api/orgs/members/${userId}`, { method: "PUT", body: JSON.stringify({ role }) });
      setMembers(m => m.map(x => x.user_id === userId ? { ...x, role } : x));
      toast({ title: "✅ تم تغيير الدور" });
    } catch { toast({ title: "فشل", variant: "destructive" }); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
    toast({ title: "📋 تم نسخ رابط الدعوة" });
  };

  // Create flow
  if (!org) {
    return (
      <div className="flex items-center justify-center min-h-[500px]" dir="rtl">
        <div className="w-full max-w-md space-y-6 text-center">
          <Building2 className="w-16 h-16 text-red-500 mx-auto" />
          <div>
            <h2 className="text-2xl font-black">أنشئ منظمتك</h2>
            <p className="text-gray-400 mt-2 text-sm">تعاون مع فريقك على منصة KaliGPT</p>
          </div>
          <div className="space-y-3 text-right">
            <input value={orgName} onChange={e => setOrgName(e.target.value)}
              placeholder="اسم المنظمة" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
            <textarea value={orgDesc} onChange={e => setOrgDesc(e.target.value)}
              placeholder="وصف (اختياري)" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
            <button onClick={createOrg} disabled={creating || !orgName}
              className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl font-semibold text-sm transition-colors">
              {creating ? "جاري الإنشاء..." : "إنشاء المنظمة"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = org.member_role === "admin" || org.member_role === "owner";

  return (
    <div className="flex h-full" dir="rtl">
      <aside className="w-44 shrink-0 border-l border-white/10 bg-black/30 p-3 space-y-1">
        {[
          { id: "overview", label: "نظرة عامة", icon: Building2 },
          { id: "members", label: "الأعضاء", icon: Users },
          { id: "invites", label: "الدعوات", icon: Mail },
          { id: "usage", label: "الاستخدام", icon: BarChart3 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? "bg-red-600/20 text-red-400" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {tab === "overview" && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-2xl font-black">
                    {org.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{org.name}</h2>
                    <div className="text-sm text-gray-400">@{org.slug} · خطة {org.plan}</div>
                  </div>
                </div>
                {org.description && <p className="text-gray-300 text-sm">{org.description}</p>}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "الأعضاء", value: `${members.length}/${org.max_members}` },
                    { label: "دورك", value: org.member_role },
                    { label: "الخطة", value: org.plan },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-white/3 border border-white/10 rounded-xl text-center">
                      <div className="text-xl font-bold capitalize">{item.value}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "members" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">الأعضاء ({members.length})</h2>
                  <button onClick={loadOrg} className="p-2 hover:bg-white/5 rounded-lg">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold shrink-0">
                        {(m.first_name?.[0] || m.email[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : m.email}</div>
                        <div className="text-xs text-gray-400 truncate">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.role === "owner" && <Crown className="w-4 h-4 text-amber-400" />}
                        {m.role === "admin" && <Shield className="w-4 h-4 text-blue-400" />}
                        {isAdmin && m.role !== "owner" && m.user_id !== user?.id && (
                          <>
                            <select value={m.role} onChange={e => changeRole(m.user_id, e.target.value)}
                              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none">
                              <option value="member">عضو</option>
                              <option value="admin">مدير</option>
                            </select>
                            <button onClick={() => removeMember(m.user_id)} className="p-1.5 hover:bg-red-600/20 rounded-lg text-gray-500 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        {!isAdmin && <span className="text-xs text-gray-400 capitalize">{m.role}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "invites" && isAdmin && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">دعوة أعضاء</h2>
                <div className="flex gap-3">
                  <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="بريد العضو الجديد" dir="ltr"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none">
                    <option value="member">عضو</option>
                    <option value="admin">مدير</option>
                  </select>
                  <button onClick={sendInvite} disabled={inviting || !inviteEmail}
                    className="px-4 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center gap-2">
                    {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    دعوة
                  </button>
                </div>
                {inviteLink && (
                  <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex-1 text-xs font-mono text-gray-300 truncate">{inviteLink}</div>
                    <button onClick={copyLink} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                {invites.length > 0 && (
                  <div>
                    <h3 className="text-sm text-gray-400 mb-3">دعوات معلقة ({invites.length})</h3>
                    <div className="space-y-2">
                      {invites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl">
                          <div>
                            <div className="text-sm">{inv.email}</div>
                            <div className="text-xs text-gray-400 capitalize">{inv.role} · تنتهي {new Date(inv.expires_at).toLocaleDateString("ar")}</div>
                          </div>
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">معلقة</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "usage" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold">استخدام الأعضاء</h2>
                {!usage ? (
                  <div className="text-center py-8 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto" /></div>
                ) : (
                  <div className="space-y-2">
                    {(usage as Record<string, unknown>[]).map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-4 bg-white/3 border border-white/10 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold">
                          {String(m.first_name?.[0] || m.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{String(m.email)}</div>
                          <div className="text-xs text-gray-400">{Number(m.tokens_used || 0).toLocaleString()} توكن</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-red-400">{Number(m.tokens_used || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
