/**
 * CollaborationPage — 3D Holographic Realtime Collaboration
 * Live cursors · shared editing · presence indicator · team activity feed
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, MessageSquare, Edit3, Eye, Circle, Send, Activity, Wifi, WifiOff, Clock } from "lucide-react";

interface Collaborator { id: string; name: string; avatar: string; color: string; cursor?: { x: number; y: number }; status: "active" | "idle" | "away"; lastSeen: string }
interface Activity { id: string; user: string; action: string; target: string; time: string; color: string }

const COLORS = ["#e21227", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];
const MOCK_COLLABS: Collaborator[] = [
  { id: "1", name: "أنت", avatar: "أ", color: "#e21227", status: "active", lastSeen: new Date().toISOString() },
  { id: "2", name: "أحمد الكردي", avatar: "أ", color: "#3b82f6", cursor: { x: 45, y: 30 }, status: "active", lastSeen: new Date(Date.now() - 30000).toISOString() },
  { id: "3", name: "سارة المنصور", avatar: "س", color: "#10b981", cursor: { x: 70, y: 60 }, status: "active", lastSeen: new Date(Date.now() - 60000).toISOString() },
  { id: "4", name: "محمد العلي", avatar: "م", color: "#f59e0b", status: "idle", lastSeen: new Date(Date.now() - 300000).toISOString() },
];
const MOCK_ACTIVITIES: Activity[] = [
  { id: "1", user: "أحمد", action: "عدّل", target: "تقرير اختبار الاختراق", time: "منذ دقيقة", color: "#3b82f6" },
  { id: "2", user: "سارة", action: "أضافت تعليقاً على", target: "تحليل CVE-2025-1337", time: "منذ 3 دقائق", color: "#10b981" },
  { id: "3", user: "أنت", action: "فتحت", target: "لوحة التحليلات 3D", time: "منذ 5 دقائق", color: "#e21227" },
  { id: "4", user: "محمد", action: "أكمل مهمة", target: "مسح ثغرات النظام", time: "منذ 10 دقائق", color: "#f59e0b" },
  { id: "5", user: "أحمد", action: "شارك", target: "تقرير OSINT للعميل", time: "منذ 20 دقيقة", color: "#3b82f6" },
];

// ── Live Presence Canvas ──────────────────────────────────────────────────────
function PresenceCanvas({ collabs }: { collabs: Collaborator[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const posRef = useRef<{ x: number; y: number; vx: number; vy: number; id: string }[]>([]);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = cv.offsetWidth * DPR; cv.height = cv.offsetHeight * DPR;
    cv.style.width = cv.offsetWidth + "px"; cv.style.height = cv.offsetHeight + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    const W = cv.offsetWidth, H = cv.offsetHeight;

    posRef.current = collabs.map((c, i) => ({
      id: c.id,
      x: 50 + (i / collabs.length) * (W - 100),
      y: H / 2 + Math.sin(i) * 40,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.5,
    }));

    let t = 0;
    function draw() {
      t += 0.02; ctx.clearRect(0, 0, W, H);
      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      posRef.current.forEach(p => {
        p.x += p.vx + Math.sin(t * 0.7 + p.y * 0.01) * 0.3;
        p.y += p.vy + Math.cos(t * 0.5 + p.x * 0.01) * 0.2;
        if (p.x < 30 || p.x > W - 30) p.vx *= -1;
        if (p.y < 30 || p.y > H - 30) p.vy *= -1;
      });
      // Connections
      posRef.current.forEach((a, i) => posRef.current.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 150) {
          const ca = collabs.find(c => c.id === a.id); const cb = collabs.find(c => c.id === b.id);
          ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 150) * 0.12})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }));
      // Avatars
      posRef.current.forEach(p => {
        const collab = collabs.find(c => c.id === p.id); if (!collab) return;
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + parseInt(p.id));
        // Glow
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 30);
        gr.addColorStop(0, collab.color + "33"); gr.addColorStop(1, collab.color + "00");
        ctx.beginPath(); ctx.arc(p.x, p.y, 30, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
        // Ring
        ctx.beginPath(); ctx.arc(p.x, p.y, 18 + pulse * 3, 0, Math.PI * 2);
        ctx.strokeStyle = collab.color + (collab.status === "active" ? "66" : "22"); ctx.lineWidth = 1.5; ctx.stroke();
        // Circle
        ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = collab.color + "cc"; ctx.shadowColor = collab.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        // Name
        ctx.fillStyle = "#fff"; ctx.font = "bold 9px Inter"; ctx.textAlign = "center"; ctx.fillText(collab.avatar, p.x, p.y + 3);
        // Status
        ctx.font = "8px Inter"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText(collab.name.split(" ")[0], p.x, p.y + 26);
      });
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [collabs]);
  return <canvas ref={cvRef} className="w-full rounded-xl" style={{ height: 180 }} />;
}

function fmtAge(s: string) { const d = Date.now() - new Date(s).getTime(); if (d < 60000) return "الآن"; if (d < 3600000) return `${Math.round(d / 60000)}د`; return `${Math.round(d / 3600000)}س`; }

interface Props { onClose?: () => void }

export function CollaborationPage({ onClose }: Props) {
  const [collabs] = useState<Collaborator[]>(MOCK_COLLABS);
  const [activities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [chatMsg, setChatMsg] = useState("");
  const [chatMsgs, setChatMsgs] = useState<{ user: string; msg: string; color: string; time: string }[]>([
    { user: "أحمد", msg: "جاهز لبدء اختبار الاختراق", color: "#3b82f6", time: "منذ 5 دقائق" },
    { user: "سارة", msg: "اكتملت خريطة الشبكة", color: "#10b981", time: "منذ 3 دقائق" },
    { user: "أنت", msg: "ممتاز، ننتقل للمرحلة التالية", color: "#e21227", time: "منذ دقيقة" },
  ]);
  const [connected] = useState(true);

  const sendMsg = useCallback(() => {
    if (!chatMsg.trim()) return;
    setChatMsgs(m => [...m, { user: "أنت", msg: chatMsg, color: "#e21227", time: "الآن" }]);
    setChatMsg("");
  }, [chatMsg]);

  const active = collabs.filter(c => c.status === "active").length;

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 25% 20%,rgba(249,115,22,.04) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center"><Users className="w-5 h-5 text-orange-400" /></div>
          <div><h2 className="text-base font-bold text-white">التعاون الفوري — 3D</h2><p className="text-xs text-zinc-600">{active} نشط الآن · Realtime Collaboration</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${connected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? "متصل" : "منقطع"}
          </div>
          {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Live presence canvas */}
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-orange-400" />الحضور المباشر — 3D</p>
          <PresenceCanvas collabs={collabs} />
        </div>
        {/* Members list */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {collabs.map(c => (
            <div key={c.id} className="p-3 rounded-xl border flex flex-col items-center gap-2" style={{ background: `${c.color}08`, borderColor: `${c.color}20` }}>
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ backgroundColor: `${c.color}25`, color: c.color }}>{c.avatar}</div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${c.status === "active" ? "bg-green-500" : c.status === "idle" ? "bg-amber-500" : "bg-zinc-600"}`} />
              </div>
              <p className="text-[10px] font-medium text-zinc-300 text-center">{c.name}</p>
              <p className="text-[9px] text-zinc-600">{fmtAge(c.lastSeen)}</p>
            </div>
          ))}
        </div>
        {/* Activity feed + Chat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-500" />نشاط الفريق</p>
            <div className="space-y-2">
              {activities.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-2 text-xs">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-bold" style={{ backgroundColor: `${a.color}25`, color: a.color }}>{a.user[0]}</div>
                  <div className="flex-1">
                    <span className="font-medium text-zinc-300">{a.user}</span><span className="text-zinc-600"> {a.action} </span><span className="text-zinc-400">{a.target}</span>
                    <p className="text-[9px] text-zinc-700 mt-0.5">{a.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white/3 border border-white/6 flex flex-col gap-3">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-zinc-500" />دردشة الفريق</p>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-40 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6">
              {chatMsgs.map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold" style={{ backgroundColor: `${m.color}25`, color: m.color }}>{m.user[0]}</div>
                  <div><p className="text-xs text-zinc-300"><span className="font-medium" style={{ color: m.color }}>{m.user}: </span>{m.msg}</p><p className="text-[9px] text-zinc-700">{m.time}</p></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMsg()} placeholder="رسالة..."
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-orange-500/30" />
              <button onClick={sendMsg} className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500/20 border border-orange-500/25 text-orange-400 hover:bg-orange-500/30 transition-all"><Send className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
