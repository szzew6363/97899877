import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard, Terminal, Shield, Brain, Search, Layers, Zap } from "lucide-react";

interface ShortcutRow { keys: string[]; label: string; labelAr?: string }
interface ShortcutGroup { title: string; titleAr: string; icon: React.ElementType; color: string; rows: ShortcutRow[] }

const GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation", titleAr: "التنقل", icon: Keyboard, color: "text-primary",
    rows: [
      { keys: ["Ctrl", "K"],      label: "Command palette",          labelAr: "لوحة الأوامر" },
      { keys: ["Ctrl", "N"],      label: "New chat",                  labelAr: "محادثة جديدة" },
      { keys: ["Ctrl", "F"],      label: "Search chats",              labelAr: "بحث في المحادثات" },
      { keys: ["?"],              label: "Show shortcuts",             labelAr: "عرض الاختصارات" },
      { keys: ["Esc"],            label: "Close panel / sidebar",      labelAr: "إغلاق اللوحة" },
    ],
  },
  {
    title: "Memory & Bookmarks", titleAr: "الذاكرة والإشارات", icon: Brain, color: "text-violet-400",
    rows: [
      { keys: ["Ctrl", "Shift", "M"], label: "Memory modal",          labelAr: "نافذة الذاكرة" },
      { keys: ["Ctrl", "Shift", "B"], label: "Bookmarks",             labelAr: "الإشارات المرجعية" },
      { keys: ["Ctrl", "Shift", "C"], label: "Compare mode",          labelAr: "وضع المقارنة" },
      { keys: ["Ctrl", "Shift", "T"], label: "Tools hub",             labelAr: "مركز الأدوات" },
    ],
  },
  {
    title: "Developer Tools", titleAr: "أدوات المطور", icon: Terminal, color: "text-emerald-400",
    rows: [
      { keys: ["Ctrl", "Shift", "E"], label: "Monaco editor",         labelAr: "محرر Monaco" },
      { keys: ["Ctrl", "Shift", "X"], label: "Exploit chain",         labelAr: "سلسلة الاستغلال" },
      { keys: ["Ctrl", "Shift", "A"], label: "Analytics dashboard",   labelAr: "لوحة التحليلات" },
    ],
  },
  {
    title: "Security / Arsenal", titleAr: "الأمن / الترسانة", icon: Shield, color: "text-red-400",
    rows: [
      { keys: ["Ctrl", "Shift", "Alt", "A"], label: "Admin panel",   labelAr: "لوحة الإدارة" },
    ],
  },
  {
    title: "Chat", titleAr: "المحادثة", icon: Search, color: "text-sky-400",
    rows: [
      { keys: ["Enter"],           label: "Send message",             labelAr: "إرسال الرسالة" },
      { keys: ["Shift", "Enter"],  label: "New line",                  labelAr: "سطر جديد" },
      { keys: ["/"],               label: "Slash commands",            labelAr: "أوامر الشريطة" },
      { keys: ["↑ ↑ ↓ ↓ ← → B A"], label: "Konami — Godmode flash",  labelAr: "كود كونامي" },
    ],
  },
  {
    title: "Productivity", titleAr: "الإنتاجية", icon: Zap, color: "text-amber-400",
    rows: [
      { keys: ["Ctrl", "Shift", "P"], label: "Export chat to PDF",   labelAr: "تصدير المحادثة PDF" },
      { keys: ["Ctrl", "Shift", "O"], label: "OSINT Dashboard",      labelAr: "لوحة OSINT" },
    ],
  },
  {
    title: "Modes", titleAr: "الأوضاع", icon: Layers, color: "text-fuchsia-400",
    rows: [
      { keys: ["Alt", "C"],  label: "Council mode",                   labelAr: "وضع المجلس" },
      { keys: ["Alt", "G"],  label: "Godmode",                        labelAr: "وضع الإله" },
      { keys: ["Alt", "R"],  label: "Red Team mode",                  labelAr: "الفريق الأحمر" },
      { keys: ["Alt", "F"],  label: "Fusion mode",                    labelAr: "وضع الدمج" },
    ],
  },
];

export function ShortcutsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border w-[96vw] max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[13px] font-black font-mono uppercase tracking-wider">
            <Keyboard className="w-4 h-4 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="space-y-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3.5 h-3.5 ${group.color}`} />
                  <span className={`text-[10px] font-black font-mono uppercase tracking-widest ${group.color}`}>{group.title}</span>
                </div>
                {group.rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                    <span className="text-[11px] text-foreground/80">{r.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k) => (
                        <kbd key={k} className="px-1.5 py-0.5 rounded-md bg-background border border-border text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-border shrink-0 text-[9px] font-mono text-muted-foreground/50 flex items-center justify-between">
          <span>⌘ = Ctrl on Windows/Linux, Cmd on Mac</span>
          <span>KaliGPT v3.0</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
