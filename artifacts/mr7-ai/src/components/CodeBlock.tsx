import { useState, useMemo } from "react";
import { Check, Copy } from "lucide-react";

export function renderMessageContent(content: string) {
  const parts: { type: "text" | "code"; lang?: string; value: string }[] = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: content.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1] || "text", value: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push({ type: "text", value: content.slice(last) });
  if (parts.length === 0) parts.push({ type: "text", value: content });
  return parts;
}

// ── Inline markdown coloring ──────────────────────────────────────────────────
const SECURITY_KWS = /\b(exploit|payload|CVE-\d{4}-\d+|shell|reverse.shell|RCE|LFI|SQLi|XSS|SSRF|CSRF|0day|zero.?day|PoC|buffer.overflow|privilege.escalation|lateral.movement|persistence|backdoor|malware|ransomware|phishing|spear.phishing|C2|C&C|beacon|implant|rootkit|keylogger|dropper|loader|stager|shellcode|obfuscation|bypass|evasion|sandbox|anti.analysis|pentest|red.team|blue.team|threat.actor|APT|IOC|TTP|MITRE|ATT&CK|nmap|metasploit|msfconsole|mimikatz|hashcat|hydra|burp.suite|sqlmap|wireshark|tcpdump)\b/gi;
const URL_RE = /https?:\/\/[^\s)"']+/g;
const BOLD_RE = /\*\*(.+?)\*\*/g;
const ITALIC_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const NUMBER_RE = /\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g;

function renderInlineParts(text: string): React.ReactNode[] {
  // Master regex — order matters
  const masterRe = /(`[^`]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|(https?:\/\/[^\s)"']+)|(\b(?:exploit|payload|CVE-\d{4}-\d+|shell|reverse shell|RCE|LFI|SQLi|XSS|SSRF|CSRF|0day|zero.?day|PoC|buffer overflow|privilege escalation|lateral movement|persistence|backdoor|malware|ransomware|phishing|spear phishing|C2|C&C|beacon|implant|rootkit|keylogger|dropper|loader|stager|shellcode|obfuscation|bypass|evasion|sandbox|anti.analysis|pentest|red team|blue team|nmap|metasploit|msfconsole|mimikatz|hashcat|hydra|sqlmap|wireshark|tcpdump)\b)/gi;
  const parts: React.ReactNode[] = [];
  let last = 0, i = 0;
  let m: RegExpExecArray | null;
  while ((m = masterRe.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={i++} className="text-foreground/85">{text.slice(last, m.index)}</span>);
    if (m[1]) {
      // `inline code`
      parts.push(<code key={i++} className="font-mono text-[11.5px] px-1.5 py-0.5 rounded-md" style={{ color: "#34d399", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.15)" }}>{m[1].slice(1, -1)}</code>);
    } else if (m[2]) {
      // **bold**
      parts.push(<strong key={i++} style={{ color: "#fbbf24", fontWeight: 700 }}>{m[2].slice(2, -2)}</strong>);
    } else if (m[3]) {
      // *italic*
      parts.push(<em key={i++} style={{ color: "#c084fc" }}>{m[3].slice(1, -1)}</em>);
    } else if (m[4]) {
      // number
      parts.push(<span key={i++} style={{ color: "#67e8f9" }}>{m[4]}</span>);
    } else if (m[5]) {
      // URL
      parts.push(<a key={i++} href={m[5]} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:decoration-solid" style={{ color: "#60a5fa" }}>{m[5]}</a>);
    } else if (m[6]) {
      // security keyword
      parts.push(<span key={i++} className="font-semibold" style={{ color: "#f87171", textShadow: "0 0 8px rgba(248,113,113,0.3)" }}>{m[6]}</span>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={i++} className="text-foreground/85">{text.slice(last)}</span>);
  if (parts.length === 0) parts.push(<span key={0} className="text-foreground/85">{text}</span>);
  return parts;
}

// ── Rich Text Block — renders colored markdown inline ────────────────────────
export function RichTextBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // H1/H2/H3
    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const content = hMatch[2];
      const sizes = ["text-[16px]", "text-[14px]", "text-[13px]"];
      const colors = ["#00e5ff", "#a78bfa", "#34d399"];
      const shadows = ["0 0 16px rgba(0,229,255,0.25)", "0 0 12px rgba(167,139,250,0.2)", "0 0 10px rgba(52,211,153,0.2)"];
      nodes.push(
        <div key={i} className={`font-black mt-2 mb-1 ${sizes[level - 1]}`} style={{ color: colors[level - 1], textShadow: shadows[level - 1] }}>
          {renderInlineParts(content)}
        </div>
      );
      i++; continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-1 py-1.5 px-3 rounded-lg italic text-[12px]" style={{ borderLeft: "3px solid rgba(167,139,250,0.5)", background: "rgba(167,139,250,0.04)", color: "rgba(255,255,255,0.55)" }}>
          {line.replace(/^>\s?/, "")}
        </div>
      );
      i++; continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5 text-[13px]">
          <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#a78bfa" }} />
          <span>{renderInlineParts(line.replace(/^[-*]\s/, ""))}</span>
        </div>
      );
      i++; continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\d+)\.\s(.+)/);
    if (olMatch) {
      nodes.push(
        <div key={i} className="flex items-start gap-2 my-0.5 text-[13px]">
          <span className="font-mono text-[10px] w-5 text-right flex-shrink-0 mt-0.5" style={{ color: "#67e8f9" }}>{olMatch[1]}.</span>
          <span>{renderInlineParts(olMatch[2])}</span>
        </div>
      );
      i++; continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<div key={i} className="my-2 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />);
      i++; continue;
    }

    // Empty line — spacing
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // Normal paragraph
    nodes.push(
      <p key={i} className="leading-relaxed text-[13px] text-foreground/85 whitespace-pre-wrap">
        {renderInlineParts(line)}
      </p>
    );
    i++;
  }
  return <>{nodes}</>;
}

// ── Syntax highlighter ────────────────────────────────────────────────────────
const KEYWORDS: Record<string, string[]> = {
  python: ["def","class","import","from","as","return","if","elif","else","for","while","in","not","and","or","is","None","True","False","try","except","finally","raise","with","lambda","yield","async","await","pass","break","continue","global","nonlocal","del","assert"],
  javascript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false"],
  typescript: ["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","class","extends","super","this","import","from","export","default","async","await","try","catch","finally","throw","typeof","instanceof","in","of","delete","void","yield","null","undefined","true","false","interface","type","enum","public","private","protected","readonly","static","abstract","implements","keyof","as","is","never","unknown","any","string","number","boolean"],
  bash: ["if","then","else","elif","fi","for","do","done","while","case","esac","function","return","echo","export","local","read","exit","cd","ls","sudo","chmod","chown","mkdir","rm","cp","mv","grep","sed","awk","cat"],
  rust: ["fn","let","mut","const","static","if","else","for","while","loop","match","break","continue","return","struct","enum","trait","impl","pub","use","mod","crate","self","Self","super","as","where","ref","move","async","await","dyn","unsafe","extern"],
  go: ["func","var","const","type","struct","interface","import","package","return","if","else","for","switch","case","default","break","continue","go","defer","chan","map","range","select","fallthrough","goto"],
  sql: ["SELECT","FROM","WHERE","INSERT","UPDATE","DELETE","INTO","VALUES","SET","JOIN","LEFT","RIGHT","INNER","OUTER","ON","AS","GROUP","BY","ORDER","HAVING","LIMIT","OFFSET","CREATE","TABLE","DROP","ALTER","INDEX","UNIQUE","PRIMARY","KEY","FOREIGN","REFERENCES","CASCADE","NULL","NOT","AND","OR","IN","LIKE","BETWEEN","IS","CASE","WHEN","THEN","ELSE","END","UNION","DISTINCT","WITH"],
};

const ALIASES: Record<string, string> = {
  py: "python", js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  sh: "bash", shell: "bash", zsh: "bash", rs: "rust",
};

type Tok = { t: string; c: string };

function highlight(code: string, langRaw: string): Tok[] {
  const lang = ALIASES[langRaw.toLowerCase()] ?? langRaw.toLowerCase();
  const keywords = KEYWORDS[lang] ?? [];
  const isSql = lang === "sql";
  const out: Tok[] = [];
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)|(`(?:\\`|[\s\S])*?`|"(?:\\"|[^"\n])*"|'(?:\\'|[^'\n])*')|(\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)(\s*\()?|(\s+)|([^\sA-Za-z0-9_$]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m[1] !== undefined) out.push({ t: m[1], c: "text-zinc-500 italic" });
    else if (m[2] !== undefined) out.push({ t: m[2], c: "text-emerald-400" });
    else if (m[3] !== undefined) out.push({ t: m[3], c: "text-cyan-300" });
    else if (m[4] !== undefined) {
      const id = m[4];
      const kw = isSql ? id.toUpperCase() : id;
      if (keywords.includes(kw)) {
        out.push({ t: id, c: "text-rose-400 font-semibold" });
      } else if (m[5]) {
        out.push({ t: id, c: "text-amber-300" });
        out.push({ t: m[5], c: "text-foreground/80" });
      } else if (id === "true" || id === "false" || id === "null" || id === "None" || id === "True" || id === "False") {
        out.push({ t: id, c: "text-cyan-300" });
      } else {
        out.push({ t: id, c: "text-foreground/90" });
      }
      continue;
    }
    else if (m[6] !== undefined) out.push({ t: m[6], c: "" });
    else if (m[7] !== undefined) out.push({ t: m[7], c: "text-violet-300" });
  }
  return out;
}

export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => highlight(code, lang), [code, lang]);

  return (
    <div className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "#060606", boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ background: "#0a0a0a", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: "#e21227" }} />
          <span className="w-2 h-2 rounded-full" style={{ background: "#f59e0b" }} />
          <span className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
          <span className="font-mono text-[10px] uppercase tracking-wider ml-1 text-white/30">{lang}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="flex items-center gap-1 text-[10px] transition-all hover:scale-105"
          style={{ color: copied ? "#22c55e" : "rgba(255,255,255,0.3)" }}
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "تم" : "نسخ"}
        </button>
      </div>
      <pre className="p-3 text-[12.5px] leading-relaxed overflow-x-auto font-mono text-foreground/90">
        <code>
          {tokens.map((tk, i) => (
            <span key={i} className={tk.c}>{tk.t}</span>
          ))}
        </code>
      </pre>
    </div>
  );
}
