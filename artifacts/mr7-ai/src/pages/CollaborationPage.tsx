import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MessageSquare, Plus, Hash, Lock, Globe, Send, RefreshCw, Mic, Code, Bold, Italic } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Room { id: string; name: string; type: "public" | "private"; description?: string; participant_count: number; owner_id: string; created_at: string }
interface ColabMessage { id: string; user_id: string; username: string; content: string; type: "text" | "code" | "system"; created_at: string }

interface Props { onClose?: () => void }

export function CollaborationPage({ onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ColabMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<"public" | "private">("public");
  const [newRoomDesc, setNewRoomDesc] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    try {
      const res = await authFetch("/api/collab/rooms");
      if (res.ok) { const d = await res.json() as { rooms?: Room[] }; setRooms(d.rooms || []); }
    } catch { /* ignore */ }
  }, []);

  const loadMessages = useCallback(async (roomId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/collab/rooms/${roomId}/messages?limit=50`);
      if (res.ok) { const d = await res.json() as { messages?: ColabMessage[] }; setMessages(d.messages || []); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => {
    if (activeRoom) { loadMessages(activeRoom.id); }
  }, [activeRoom]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const res = await authFetch("/api/collab/rooms", {
        method: "POST",
        body: JSON.stringify({ name: newRoomName, type: newRoomType, description: newRoomDesc }),
      });
      if (res.ok) {
        const d = await res.json() as { room?: Room };
        setCreating(false); setNewRoomName(""); setNewRoomDesc("");
        await loadRooms();
        if (d.room) setActiveRoom(d.room);
        toast({ title: "✅ تم إنشاء الغرفة" });
      }
    } catch { toast({ title: "فشل الإنشاء", variant: "destructive" }); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || sending) return;
    setSending(true);
    const isCode = input.startsWith("```");
    const tempMsg: ColabMessage = {
      id: Math.random().toString(), user_id: user?.id || "", username: user?.firstName || user?.email || "أنا",
      content: input, type: isCode ? "code" : "text", created_at: new Date().toISOString(),
    };
    setMessages(m => [...m, tempMsg]);
    const text = input; setInput("");
    try {
      const res = await authFetch(`/api/collab/rooms/${activeRoom.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, type: isCode ? "code" : "text" }),
      });
      if (!res.ok) setMessages(m => m.filter(x => x.id !== tempMsg.id));
    } catch { setMessages(m => m.filter(x => x.id !== tempMsg.id)); }
    finally { setSending(false); }
  };

  const joinRoom = async (room: Room) => {
    try {
      await authFetch(`/api/collab/rooms/${room.id}/join`, { method: "POST" });
      setActiveRoom(room);
    } catch { setActiveRoom(room); }
  };

  return (
    <div className="flex h-full" dir="rtl">
      {/* Rooms sidebar */}
      <aside className="w-60 shrink-0 border-l border-white/10 bg-black/30 flex flex-col">
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-300">الغرف</span>
            <button onClick={() => setCreating(true)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {rooms.map(room => (
            <button key={room.id} onClick={() => joinRoom(room)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-right ${
                activeRoom?.id === room.id ? "bg-red-600/20 text-red-400" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}>
              {room.type === "private" ? <Lock className="w-3.5 h-3.5 shrink-0" /> : <Hash className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate flex-1">{room.name}</span>
              <span className="text-xs text-gray-600">{room.participant_count}</span>
            </button>
          ))}
          {rooms.length === 0 && (
            <div className="text-center py-6 text-gray-600 text-xs">لا توجد غرف</div>
          )}
        </div>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            {user?.firstName || user?.email}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {!activeRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Users className="w-16 h-16 text-gray-600 mx-auto" />
              <h2 className="text-xl font-bold">التعاون في الوقت الفعلي</h2>
              <p className="text-gray-400 text-sm">اختر غرفة أو أنشئ واحدة للتعاون مع فريقك</p>
              <button onClick={() => setCreating(true)} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-medium">
                إنشاء غرفة
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Room header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
              <Hash className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-semibold text-sm">{activeRoom.name}</div>
                {activeRoom.description && <div className="text-xs text-gray-400">{activeRoom.description}</div>}
              </div>
              <div className="mr-auto flex items-center gap-2">
                <span className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{activeRoom.participant_count}</span>
                <button onClick={() => loadMessages(activeRoom.id)} className="p-1.5 hover:bg-white/5 rounded-lg">
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 overflow-auto p-5 space-y-4">
              {messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id;
                if (msg.type === "system") {
                  return (
                    <div key={msg.id} className="text-center text-xs text-gray-500 py-1">{msg.content}</div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-xs font-bold shrink-0">
                      {msg.username[0].toUpperCase()}
                    </div>
                    <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                      <div className={`text-xs text-gray-500 mb-1 ${isMe ? "text-right" : ""}`}>{msg.username}</div>
                      {msg.type === "code" ? (
                        <pre className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-green-300 whitespace-pre-wrap overflow-auto max-w-full">
                          {msg.content}
                        </pre>
                      ) : (
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-red-600 text-white" : "bg-white/5 border border-white/10 text-gray-200"}`}>
                          {msg.content}
                        </div>
                      )}
                      <div className="text-xs text-gray-600 mt-1">{new Date(msg.created_at).toLocaleTimeString("ar")}</div>
                    </div>
                  </div>
                );
              })}
              {loading && <div className="text-center"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3 items-end">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="اكتب رسالتك... (Shift+Enter لسطر جديد، ``` لكود)" rows={2}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 resize-none" />
                <button onClick={sendMessage} disabled={sending || !input.trim()}
                  className="p-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors self-end">
                  {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10" onClick={() => setCreating(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} dir="rtl">
              <h3 className="font-bold text-lg mb-4">إنشاء غرفة تعاون</h3>
              <div className="space-y-3">
                <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder="اسم الغرفة"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500" />
                <textarea value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)} placeholder="وصف (اختياري)" rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none" />
                <div className="flex gap-2">
                  {[{ v: "public", label: "عام", icon: Globe }, { v: "private", label: "خاص", icon: Lock }].map(opt => (
                    <button key={opt.v} onClick={() => setNewRoomType(opt.v as "public" | "private")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        newRoomType === opt.v ? "bg-red-600 border-red-600 text-white" : "bg-white/5 border-white/10 text-gray-400"
                      }`}>
                      <opt.icon className="w-4 h-4" />{opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCreating(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm">إلغاء</button>
                  <button onClick={createRoom} disabled={!newRoomName} className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-sm font-semibold">إنشاء</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
