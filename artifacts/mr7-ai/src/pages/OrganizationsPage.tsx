/**
 * OrganizationsPage — 3D Holographic Team Workspace
 * Organizations · teams · member management · roles · invite system
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Plus, Settings, Shield, Crown, UserCheck, Mail, Trash2, ChevronRight, Building2, Globe, Lock } from "lucide-react";

interface Member { id: string; name: string; email: string; role: "owner" | "admin" | "member" | "viewer"; avatar: string; status: "active" | "invited" | "suspended"; joinedAt: string }
interface Org { id: string; name: string; slug: string; plan: string; members: Member[]; createdAt: string }

const MOCK_ORG: Org = {
  id: "1", name: "KaliGPT Security Team", slug: "kaligpt-sec", plan: "elite",
  createdAt: "2024-01-15",
  members: [
    { id: "1", name: "مدير النظام", email: "admin@mr7.ai", role: "owner", avatar: "م", status: "active", joinedAt: "2024-01-15" },
    { id: "2", name: "أحمد الكردي", email: "ahmed@example.com", role: "admin", avatar: "أ", status: "active", joinedAt: "2024-02-10" },
    { id: "3", name: "سارة المنصور", email: "sara@example.com", role: "member", avatar: "س", status: "active", joinedAt: "2024-03-05" },
    { id: "4", name: "محمد العلي", email: "mohd@example.com", role: "member", avatar: "م", status: "active", joinedAt: "2024-04-01" },
    { id: "5", name: "فاطمة النجدي", email: "fatima@example.com", role: "viewer", avatar: "ف", status: "invited", joinedAt: "2024-06-10" },
  ],
};

const ROLE_COLORS: Record<string, string> = { owner: "#e21227", admin: "#8b5cf6", member: "#3b82f6", viewer: "#6b7280" };
const ROLE_LABELS: Record<string, string> = { owner: "مالك", admin: "مشرف", member: "عضو", viewer: "قارئ" };
const ROLE_ICONS: Record<string, React.ElementType> = { owner: Crown, admin: Shield, member: UserCheck, viewer: Globe };

interface Props { onClose?: () => void }

export function OrganizationsPage({ onClose }: Props) {
  const [org, setOrg] = useState<Org>(MOCK_ORG);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "viewer">("member");
  const [showInvite, setShowInvite] = useState(false);
  const [tab, setTab] = useState<"members" | "settings" | "billing">("members");

  const invite = useCallback(() => {
    if (!inviteEmail.trim()) return;
    const newMember: Member = { id: crypto.randomUUID(), name: inviteEmail.split("@")[0], email: inviteEmail, role: inviteRole, avatar: inviteEmail[0].toUpperCase(), status: "invited", joinedAt: new Date().toISOString() };
    setOrg(o => ({ ...o, members: [...o.members, newMember] }));
    setInviteEmail(""); setShowInvite(false);
  }, [inviteEmail, inviteRole]);

  const remove = (id: string) => setOrg(o => ({ ...o, members: o.members.filter(m => m.id !== id) }));
  const changeRole = (id: string, role: Member["role"]) => setOrg(o => ({ ...o, members: o.members.map(m => m.id === id ? { ...m, role } : m) }));

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 15%,rgba(249,115,22,.05) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center"><Building2 className="w-5 h-5 text-orange-400" /></div>
          <div>
            <h2 className="text-base font-bold text-white">{org.name}</h2>
            <p className="text-xs text-zinc-600">{org.members.length} أعضاء · خطة {org.plan}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["members", "settings", "billing"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "bg-orange-500/20 border border-orange-500/25 text-orange-400" : "text-zinc-500 hover:text-zinc-300"}`}>
              {t === "members" ? "الأعضاء" : t === "settings" ? "الإعدادات" : "الفاتورة"}
            </button>
          ))}
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">

        {tab === "members" && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {["owner", "admin", "member", "viewer"].map(r => {
                  const count = org.members.filter(m => m.role === r).length;
                  return count > 0 ? (
                    <span key={r} className="text-[10px] px-2 py-0.5 rounded-full border font-medium" style={{ borderColor: `${ROLE_COLORS[r]}30`, backgroundColor: `${ROLE_COLORS[r]}12`, color: ROLE_COLORS[r] }}>
                      {count} {ROLE_LABELS[r]}
                    </span>
                  ) : null;
                })}
              </div>
              <button onClick={() => setShowInvite(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 border border-orange-500/25 text-orange-400 hover:bg-orange-500/30 transition-all">
                <Plus className="w-3.5 h-3.5" />دعوة
              </button>
            </div>
            <AnimatePresence>
              {showInvite && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="p-4 rounded-xl bg-orange-500/6 border border-orange-500/20 flex gap-2 items-end">
                  <div className="flex-1">
                    <p className="text-[10px] text-zinc-500 mb-1">البريد الإلكتروني</p>
                    <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && invite()} placeholder="user@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-1">الدور</p>
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as "member" | "viewer")} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                      <option value="member">عضو</option><option value="viewer">قارئ</option>
                    </select>
                  </div>
                  <button onClick={invite} className="px-4 py-2 rounded-lg bg-orange-500/25 border border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/35 transition-all">دعوة</button>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="space-y-2">
              {org.members.map((m, i) => {
                const RoleIcon = ROLE_ICONS[m.role] || UserCheck;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-white/3 border border-white/6 hover:border-white/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: `${ROLE_COLORS[m.role]}20`, color: ROLE_COLORS[m.role] }}>{m.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{m.name}</p>
                      <p className="text-[10px] text-zinc-500">{m.email}</p>
                    </div>
                    <select value={m.role} onChange={e => changeRole(m.id, e.target.value as Member["role"])} disabled={m.role === "owner"}
                      className="bg-transparent border-0 text-xs font-medium outline-none cursor-pointer disabled:cursor-default" style={{ color: ROLE_COLORS[m.role] }}>
                      {["owner", "admin", "member", "viewer"].map(r => <option key={r} value={r} className="bg-zinc-900 text-white">{ROLE_LABELS[r]}</option>)}
                    </select>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${m.status === "active" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>{m.status === "active" ? "نشط" : "دعوة معلقة"}</span>
                    {m.role !== "owner" && <button onClick={() => remove(m.id)} className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {tab === "settings" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/3 border border-white/6 space-y-3">
              <p className="text-xs font-semibold text-zinc-400">معلومات المنظمة</p>
              <div><p className="text-[10px] text-zinc-500 mb-1">الاسم</p><input defaultValue={org.name} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-orange-500/40" /></div>
              <div><p className="text-[10px] text-zinc-500 mb-1">المعرّف (Slug)</p><input defaultValue={org.slug} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-orange-500/40" /></div>
              <button className="px-4 py-2 rounded-lg bg-orange-500/20 border border-orange-500/25 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-all">حفظ التغييرات</button>
            </div>
            <div className="p-4 rounded-xl bg-red-500/6 border border-red-500/20">
              <p className="text-xs font-semibold text-red-400 mb-1">منطقة الخطر</p>
              <p className="text-xs text-zinc-500 mb-3">حذف المنظمة سيحذف جميع البيانات والأعضاء بشكل دائم</p>
              <button className="px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-all">حذف المنظمة</button>
            </div>
          </div>
        )}

        {tab === "billing" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/30 to-purple-950/20 border border-red-500/15">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-zinc-400">الخطة الحالية</p><p className="text-xl font-black text-white capitalize mt-0.5">{org.plan}</p></div>
                <div className="text-right"><p className="text-xs text-zinc-400">تجديد في</p><p className="text-sm font-bold text-white mt-0.5">1 يوليو 2026</p></div>
              </div>
            </div>
            {["Starter — $25/شهر", "Professional — $90/شهر", "Elite — $150/شهر"].map((plan, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-white/3 border border-white/6 flex items-center justify-between">
                <p className="text-sm text-zinc-300">{plan}</p>
                <button className="px-3 py-1 rounded-lg text-xs font-medium bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all">ترقية</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
