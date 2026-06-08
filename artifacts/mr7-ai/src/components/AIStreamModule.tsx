import { useState, useRef, type ReactNode } from "react";
import { Play, Square, Copy, CheckCheck, RotateCcw } from "lucide-react";
import { streamChat } from "@/lib/chat-client";
import { useToast } from "@/hooks/use-toast";

export interface AIStreamField {
  key: string;
  label: string;
  placeholder?: string;
  type?: "input" | "textarea" | "select";
  options?: string[];
  rows?: number;
  defaultValue?: string;
  span?: "full";
}

export interface AIStreamModuleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  color: string;
  icon: ReactNode;
  systemPrompt: string;
  fields: AIStreamField[];
  buildPrompt: (values: Record<string, string>) => string;
  quickActions?: Array<{ label: string; values: Record<string, string> }>;
  outputLabel?: string;
  statusBadges?: Array<{ label: string; color: string }>;
}

export function AIStreamModule({
  open, onOpenChange,
  title, subtitle, color, icon,
  systemPrompt, fields, buildPrompt,
  quickActions, outputLabel = "INTELLIGENCE OUTPUT",
  statusBadges,
}: AIStreamModuleProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(f => [f.key, f.defaultValue ?? ""]))
  );
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function setValue(k: string, v: string) {
    setValues(prev => ({ ...prev, [k]: v }));
  }

  async function run() {
    const prompt = buildPrompt(values);
    if (!prompt.trim() || prompt.includes("undefined") && fields.some(f => !values[f.key]?.trim())) {
      toast({ description: "أدخل البيانات المطلوبة" });
      return;
    }
    abortRef.current = new AbortController();
    setOutput("");
    setStreaming(true);
    let acc = "";
    try {
      await streamChat(
        {
          model: "gpt-4o-mini",
          persona: null,
          customInstructions: "",
          language: "en",
          memory: [],
          messages: [{ role: "user" as const, content: prompt }],
          customSystemPrompt: systemPrompt,
        },
        (chunk) => { acc += chunk; setOutput(acc); },
        abortRef.current.signal
      );
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") {
        acc += `\n\n[ERROR: ${e instanceof Error ? e.message : "stream failed"}]`;
        setOutput(acc);
      }
    } finally {
      setStreaming(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function copy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  const hasFullSpan = fields.some(f => f.span === "full");

  return (
    <div className="flex flex-col h-full" style={{ background: "#060606" }}>
      {/* Config Panel */}
      <div className="p-4 border-b space-y-3 shrink-0" style={{ borderColor: `${color}18`, background: `${color}04` }}>
        {/* Status badges */}
        {statusBadges && (
          <div className="flex items-center gap-2 flex-wrap">
            {statusBadges.map(b => (
              <span key={b.label} className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border"
                style={{ borderColor: `${b.color}40`, color: b.color, background: `${b.color}10` }}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Fields grid */}
        <div className={`grid gap-3 ${hasFullSpan ? "grid-cols-2" : fields.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {fields.map(f => (
            <div key={f.key} className={f.span === "full" || f.type === "textarea" ? "col-span-2" : ""}>
              <label className="block text-[9px] font-mono font-bold mb-1.5 tracking-wider"
                style={{ color: `${color}80` }}>
                {f.label.toUpperCase()}
              </label>
              {f.type === "select" ? (
                <select value={values[f.key] ?? ""} onChange={e => setValue(f.key, e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-[11px] font-mono outline-none border appearance-none"
                  style={{ background: "#0c0c0c", borderColor: `${color}22`, color: "#ccc" }}>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={values[f.key] ?? ""} onChange={e => setValue(f.key, e.target.value)}
                  placeholder={f.placeholder} rows={f.rows ?? 4}
                  className="w-full rounded-lg px-3 py-2.5 text-[11px] font-mono outline-none border resize-none leading-relaxed"
                  style={{ background: "#0c0c0c", borderColor: `${color}22`, color: "#ccc" }} />
              ) : (
                <input value={values[f.key] ?? ""} onChange={e => setValue(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg px-3 py-2 text-[11px] font-mono outline-none border"
                  style={{ background: "#0c0c0c", borderColor: `${color}22`, color: "#ccc" }} />
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] font-mono text-muted-foreground self-center">Quick:</span>
            {quickActions.map(qa => (
              <button key={qa.label}
                onClick={() => setValues(prev => ({ ...prev, ...qa.values }))}
                className="px-2.5 py-1 rounded-lg border text-[9px] font-mono font-bold transition-all hover:opacity-90"
                style={{ borderColor: `${color}30`, color: `${color}cc`, background: `${color}08` }}>
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-2">
          <button onClick={streaming ? stop : run}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[12px] transition-all"
            style={{
              background: streaming ? "rgba(226,18,39,0.1)" : `${color}15`,
              border: `1px solid ${streaming ? "#e2122740" : color + "45"}`,
              color: streaming ? "#e21227" : color,
            }}>
            {streaming
              ? <><Square className="w-3.5 h-3.5" /> إيقاف</>
              : <><Play className="w-3.5 h-3.5" /> تشغيل</>}
          </button>
          {output && (
            <>
              <button onClick={() => setOutput("")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold border transition-all"
                style={{ borderColor: "#1f1f1f", color: "#555", background: "#0c0c0c" }}>
                <RotateCcw className="w-3 h-3" /> مسح
              </button>
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-semibold border transition-all ml-auto"
                style={{
                  borderColor: copied ? `${color}40` : "#1f1f1f",
                  color: copied ? color : "#555",
                  background: copied ? `${color}08` : "#0c0c0c",
                }}>
                {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto p-5">
        {!output && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center select-none">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              {icon}
            </div>
            <div>
              <p className="text-[13px] font-black tracking-wide" style={{ color }}>{title}</p>
              <p className="text-[10px] mt-1 max-w-xs leading-relaxed" style={{ color: "#444" }}>{subtitle}</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full"
                style={{ background: streaming ? color : "#2a2a2a", animation: streaming ? "pulse 1.5s infinite" : "none" }} />
              <span className="text-[9px] font-mono tracking-[0.2em]"
                style={{ color: streaming ? color : "#2a2a2a" }}>
                {streaming ? "PROCESSING..." : outputLabel}
              </span>
              {!streaming && output && (
                <span className="text-[8px] font-mono ml-auto" style={{ color: "#2a2a2a" }}>
                  {output.length} chars
                </span>
              )}
            </div>
            <pre className="text-[11px] font-mono leading-[1.75] whitespace-pre-wrap break-words" style={{ color: "#b0c0b8" }}>
              {output}
              {streaming && <span style={{ color, animation: "pulse 1s infinite" }}>█</span>}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
