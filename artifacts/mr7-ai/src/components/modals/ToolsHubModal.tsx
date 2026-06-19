import { useMemo, useState, useRef } from "react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Pin, Sparkles, Grid3X3, List, TrendingUp, Zap, Globe, Code2, Send, Loader2, X, Copy, ChevronDown, Plus, Trash2, Image, QrCode, FileCode, Palette, Download, RefreshCw, Wand2, Shield, AlertTriangle, Activity, ExternalLink, ChevronUp, Bug, Radio } from "lucide-react";
import { ALL_TOOLS, CATEGORIES, type ToolCategory, type UtilityTool } from "./UtilityToolModal";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_COLORS: Record<string, string> = {
  "Recon": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Offensive": "text-primary bg-primary/10 border-primary/20",
  "Utility": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "AI": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Crypto": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Network": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Web": "text-orange-400 bg-orange-500/10 border-orange-500/20",
  "OSINT": "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

type HubTab = "tools" | "websearch" | "coderunner" | "apitester" | "imagetools" | "cvefeed";

// ── CVE THREAT FEED PANEL ─────────────────────────────────────────────────────
type CVESeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
interface CVEItem {
  id: string;
  description: string;
  published: string;
  lastModified: string;
  severity: CVESeverity;
  score: number;
  vector: string;
  cwes: string[];
}

const SEV_CONFIG: Record<CVESeverity, { color: string; bg: string; border: string; glow: string; label: string }> = {
  CRITICAL: { color: "#ff2d55", bg: "rgba(255,45,85,0.1)", border: "rgba(255,45,85,0.35)", glow: "rgba(255,45,85,0.15)", label: "CRITICAL" },
  HIGH:     { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.35)", glow: "rgba(249,115,22,0.1)",  label: "HIGH" },
  MEDIUM:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.35)", glow: "rgba(245,158,11,0.08)", label: "MEDIUM" },
  LOW:      { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", glow: "rgba(16,185,129,0.06)",  label: "LOW" },
  NONE:     { color: "#6b7280", bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.25)", glow: "rgba(0,0,0,0)",        label: "NONE" },
};

function parseCVE(raw: Record<string, unknown>): CVEItem {
  const cve = raw["cve"] as Record<string, unknown>;
  const id = cve["id"] as string;
  const published = cve["published"] as string;
  const lastModified = cve["lastModified"] as string;
  const descs = cve["descriptions"] as { lang: string; value: string }[] ?? [];
  const description = descs.find(d => d.lang === "en")?.value ?? "No description available.";
  const metrics = cve["metrics"] as Record<string, unknown> ?? {};
  const v31 = (metrics["cvssMetricV31"] as { cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }[] | undefined)?.[0];
  const v30 = (metrics["cvssMetricV30"] as { cvssData: { baseScore: number; baseSeverity: string; vectorString: string } }[] | undefined)?.[0];
  const v2 = (metrics["cvssMetricV2"] as { cvssData: { baseScore: number; vectorString: string } }[] | undefined)?.[0];
  const score = v31?.cvssData.baseScore ?? v30?.cvssData.baseScore ?? v2?.cvssData.baseScore ?? 0;
  const severity = ((v31?.cvssData.baseSeverity ?? v30?.cvssData.baseSeverity ?? (score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW")) as CVESeverity) || "NONE";
  const vector = v31?.cvssData.vectorString ?? v30?.cvssData.vectorString ?? v2?.cvssData.vectorString ?? "";
  const weaknesses = cve["weaknesses"] as { description: { lang: string; value: string }[] }[] ?? [];
  const cwes = weaknesses.flatMap(w => w.description.filter(d => d.lang === "en").map(d => d.value)).filter(c => c !== "NVD-CWE-Other" && c !== "NVD-CWE-noinfo");
  return { id, description, published, lastModified, severity, score, vector, cwes };
}

function CveFeedPanel() {
  const [items, setItems] = useState<CVEItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CVESeverity | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [page, setPage] = useState(0);

  async function fetchCVEs(pageIndex = 0) {
    setLoading(true);
    setError(null);
    try {
      const sev = filter !== "ALL" ? `&cvssV3Severity=${filter}` : "";
      const startIndex = pageIndex * 20;
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20&startIndex=${startIndex}${sev}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`NVD API error: ${resp.status}`);
      const data = await resp.json() as { vulnerabilities: Record<string, unknown>[] };
      const parsed = (data.vulnerabilities ?? []).map(parseCVE);
      setItems(pageIndex === 0 ? parsed : prev => [...prev, ...parsed]);
      setLastRefresh(new Date());
      setPage(pageIndex);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const displayed = items.filter(c => {
    const matchSev = filter === "ALL" || c.severity === filter;
    const q = search.toLowerCase();
    const matchQ = !q || c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.cwes.some(cw => cw.toLowerCase().includes(q));
    return matchSev && matchQ;
  });

  const counts = items.reduce((acc, c) => { acc[c.severity] = (acc[c.severity] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="flex flex-col gap-3 h-full pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,45,85,0.12)", border: "1px solid rgba(255,45,85,0.3)" }}>
            <Radio className="w-4 h-4" style={{ color: "#ff2d55" }} />
          </div>
          <div>
            <p className="text-[12px] font-black tracking-wider" style={{ color: "#ff2d55" }}>CVE THREAT FEED</p>
            <p className="text-[10px] text-muted-foreground">NIST NVD — Live Vulnerability Database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[9px] font-mono text-muted-foreground/50">
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={() => fetchCVEs(0)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all disabled:opacity-50"
            style={{ background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "#ff2d55" }}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {items.length === 0 ? "FETCH LIVE" : "REFRESH"}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {(["CRITICAL","HIGH","MEDIUM","LOW"] as CVESeverity[]).map(s => {
            const cfg = SEV_CONFIG[s];
            return (
              <div key={s} className="rounded-xl border p-2 text-center cursor-pointer transition-all"
                style={{ background: filter === s ? cfg.bg : "rgba(255,255,255,0.02)", borderColor: filter === s ? cfg.border : "#1f1f1f" }}
                onClick={() => setFilter(prev => prev === s ? "ALL" : s)}>
                <div className="text-sm font-black font-mono" style={{ color: cfg.color }}>{counts[s] ?? 0}</div>
                <div className="text-[8px] font-bold tracking-widest" style={{ color: filter === s ? cfg.color : "#4b5563" }}>{s}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Severity + Search Filters */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search CVE ID, keywords..."
              className="w-full bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl pl-7 pr-3 py-1.5 text-[11px] font-mono outline-none focus:border-[rgba(255,45,85,0.4)]" />
          </div>
          {(["ALL","CRITICAL","HIGH","MEDIUM","LOW"] as const).map(s => {
            const cfg = s === "ALL" ? { color: "#e5e7eb", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.15)" } : SEV_CONFIG[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                style={filter === s
                  ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border }
                  : { background: "transparent", color: "#4b5563", borderColor: "#1f1f1f" }}>
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-bold text-red-400">خطأ في جلب البيانات</p>
            <p className="text-[11px] text-red-400/70 mt-0.5">{error}</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">قد تكون NIST API محظورة مؤقتاً (rate limit). حاول مرة أخرى بعد 30 ثانية.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)" }}>
            <Bug className="w-8 h-8" style={{ color: "rgba(255,45,85,0.6)" }} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-black tracking-wide" style={{ color: "#ff2d55" }}>THREAT FEED OFFLINE</p>
            <p className="text-[11px] text-muted-foreground mt-1">اضغط FETCH LIVE لاستدعاء أحدث CVEs من NIST NVD</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">بيانات حية · CVSS v3 · محدّث كل دقيقة</p>
          </div>
          <button onClick={() => fetchCVEs(0)} disabled={loading}
            className="px-6 py-2.5 rounded-xl text-[12px] font-black tracking-wider transition-all disabled:opacity-50"
            style={{ background: "rgba(255,45,85,0.15)", border: "1px solid rgba(255,45,85,0.4)", color: "#ff2d55" }}>
            {loading ? "FETCHING..." : "FETCH LIVE CVEs"}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#ff2d55] border-r-[#ff2d55]/30 border-b-[#ff2d55]/10 border-l-transparent animate-spin" />
            <Shield className="absolute inset-0 m-auto w-5 h-5" style={{ color: "#ff2d55" }} />
          </div>
          <p className="text-[11px] font-mono text-muted-foreground animate-pulse">QUERYING NIST NVD...</p>
        </div>
      )}

      {/* CVE List */}
      {displayed.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
          <div className="text-[10px] text-muted-foreground/50 font-mono px-0.5">
            {displayed.length} vulnerabilities {search || filter !== "ALL" ? "(filtered)" : ""}
          </div>
          {displayed.map(cve => {
            const cfg = SEV_CONFIG[cve.severity];
            const isExp = expanded === cve.id;
            const date = new Date(cve.published).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            return (
              <motion.div key={cve.id} layout
                className="rounded-xl border overflow-hidden cursor-pointer transition-all"
                style={{ background: isExp ? cfg.bg : "rgba(13,13,13,0.9)", borderColor: isExp ? cfg.border : "#1f1f1f", boxShadow: isExp ? `0 0 16px ${cfg.glow}` : "none" }}
                onClick={() => setExpanded(isExp ? null : cve.id)}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Score ring */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center border"
                    style={{ background: `${cfg.color}12`, borderColor: `${cfg.color}30` }}>
                    <span className="text-[13px] font-black font-mono leading-none" style={{ color: cfg.color }}>
                      {cve.score.toFixed(1)}
                    </span>
                    <span className="text-[7px] font-bold tracking-widest" style={{ color: `${cfg.color}80` }}>CVSS</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-black font-mono text-foreground">{cve.id}</span>
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md border"
                        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                        {cfg.label}
                      </span>
                      {cve.cwes.slice(0, 1).map(cw => (
                        <span key={cw} className="text-[8px] text-muted-foreground/50 font-mono hidden sm:block">{cw}</span>
                      ))}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug line-clamp-1">{cve.description}</p>
                    <p className="text-[9px] text-muted-foreground/40 font-mono mt-0.5">{date}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1.5 rounded-lg border border-[#1f1f1f] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a] transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    {isExp ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>

                {isExp && (
                  <div className="px-3 pb-3 border-t space-y-2" style={{ borderColor: `${cfg.color}20` }}>
                    <p className="text-[11px] text-foreground/80 leading-relaxed pt-2">{cve.description}</p>
                    {cve.vector && (
                      <div className="rounded-lg border p-2" style={{ background: "rgba(0,0,0,0.3)", borderColor: "#1a1a1a" }}>
                        <p className="text-[9px] font-bold text-muted-foreground/50 mb-1">VECTOR</p>
                        <p className="text-[10px] font-mono text-foreground/70 break-all">{cve.vector}</p>
                      </div>
                    )}
                    {cve.cwes.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {cve.cwes.map(cw => (
                          <span key={cw} className="text-[9px] font-mono px-2 py-0.5 rounded-md border border-[#1f1f1f] text-muted-foreground/60 bg-[#111]">{cw}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[9px] text-muted-foreground/40 font-mono">
                      <span>Published: {new Date(cve.published).toLocaleDateString()}</span>
                      <span>Modified: {new Date(cve.lastModified).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
          {/* Load more */}
          <button onClick={() => fetchCVEs(page + 1)} disabled={loading}
            className="w-full py-2.5 rounded-xl border border-[#1f1f1f] text-[11px] font-bold text-muted-foreground hover:text-foreground hover:border-[#2a2a2a] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> تحميل...</> : <><Activity className="w-3.5 h-3.5 text-[#ff2d55]" /> تحميل المزيد</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ── WEB SEARCH PANEL ─────────────────────────────────────────────────────────
function WebSearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ title: string; url: string; snippet: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"web" | "exploit" | "cve" | "darkweb">("web");
  const { toast } = useToast();

  const SEARCH_TYPES = [
    { id: "web", label: "Web", color: "#3b82f6" },
    { id: "exploit", label: "Exploits", color: "#e21227" },
    { id: "cve", label: "CVE", color: "#f59e0b" },
    { id: "darkweb", label: "Threat Intel", color: "#8b5cf6" },
  ] as const;

  const MOCK_RESULTS: Record<string, typeof results> = {
    exploit: [
      { title: "Exploit-DB: Search Results", url: "https://www.exploit-db.com/search?q=", snippet: "Remote code execution exploits, local privilege escalation, cross-site scripting and more." },
      { title: "Rapid7 Vulnerability DB", url: "https://www.rapid7.com/db/", snippet: "Comprehensive database of known vulnerabilities and exploits with CVSS scores." },
      { title: "PacketStorm Security", url: "https://packetstormsecurity.com/search/?q=", snippet: "Latest security advisories, exploits, and tools from the security community." },
    ],
    cve: [
      { title: "NVD — National Vulnerability Database", url: "https://nvd.nist.gov/vuln/search", snippet: "NIST's comprehensive database of CVEs with detailed scoring and remediation guidance." },
      { title: "CVE Details", url: "https://www.cvedetails.com/", snippet: "Browse vulnerabilities by vendor, product, type and year. Includes CVSS v2 and v3 scores." },
      { title: "MITRE CVE List", url: "https://cve.mitre.org/cve/search_cve_list.html", snippet: "Official MITRE CVE list with detailed technical information and references." },
    ],
    darkweb: [
      { title: "Shodan — Internet-Connected Devices", url: "https://www.shodan.io/search?query=", snippet: "Search engine for internet-connected devices. Discover exposed services and vulnerabilities." },
      { title: "GreyNoise — Threat Intelligence", url: "https://viz.greynoise.io/", snippet: "Understand mass internet scanning and differentiate background noise from targeted attacks." },
      { title: "AlienVault OTX", url: "https://otx.alienvault.com/browse/", snippet: "Open threat intelligence community with indicators of compromise and threat actors." },
    ],
  };

  function doSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setTimeout(() => {
      if (searchType !== "web") {
        setResults(MOCK_RESULTS[searchType as keyof typeof MOCK_RESULTS].map(r => ({ ...r, url: r.url + encodeURIComponent(query), snippet: r.snippet })));
      } else {
        setResults([
          { title: `Google: ${query}`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, snippet: "Open in Google for full search results." },
          { title: `DuckDuckGo: ${query}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, snippet: "Privacy-focused search engine." },
          { title: `Bing: ${query}`, url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`, snippet: "Microsoft Bing search results." },
        ]);
      }
      setLoading(false);
    }, 600);
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex gap-1.5 flex-wrap">
        {SEARCH_TYPES.map(st => (
          <button key={st.id} onClick={() => setSearchType(st.id as typeof searchType)}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
            style={searchType === st.id
              ? { background: `${st.color}20`, color: st.color, borderColor: `${st.color}50` }
              : { background: "transparent", color: "#6b7280", borderColor: "#1f1f1f" }}>
            {st.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder={searchType === "exploit" ? "Search exploits: e.g. apache rce 2024..." : searchType === "cve" ? "Search CVE: e.g. CVE-2024-..." : searchType === "darkweb" ? "Threat intel query..." : "Search the web..."}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary text-sm" />
        </div>
        <button onClick={doSearch} disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-all bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          <span>Search</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {results.length === 0 && !loading && (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>ابحث في الويب، قواعد الاستغلال، CVEs، والتهديدات</p>
          </div>
        )}
        {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>}
        {results.map((r, i) => (
          <motion.a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="block p-3 rounded-xl border border-border bg-background hover:border-primary/30 hover:bg-accent transition-all">
            <p className="text-[13px] font-semibold text-primary mb-0.5 truncate">{r.title}</p>
            <p className="text-[10px] text-emerald-500 font-mono mb-1 truncate">{r.url}</p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{r.snippet}</p>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

function CodeRunnerPanel() {
  const [code, setCode] = useState('console.log("KaliGPT Code Runner");\n\n// تجربة الكود هنا\nconst arr = [1, 2, 3, 4, 5];\nconst doubled = arr.map(x => x * 2);\nconsole.log("Doubled:", doubled);');
  const [lang, setLang] = useState<"javascript" | "python" | "bash">("javascript");
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const LANGS = ["javascript", "python", "bash"] as const;

  function run() {
    setRunning(true);
    setOutput("");
    setTimeout(() => {
      try {
        if (lang === "javascript") {
          const logs: string[] = [];
          const _console = { log: (...a: unknown[]) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")) };
          const fn = new Function("console", code);
          fn(_console);
          setOutput(logs.join("\n") || "[No output]");
        } else {
          setOutput(`[${lang.toUpperCase()} Simulated]\n\nCode preview (${code.split("\n").length} lines):\n${code.slice(0, 200)}${code.length > 200 ? "\n..." : ""}\n\n[Note] Live ${lang} execution requires backend sandbox.`);
        }
      } catch (e: unknown) {
        setOutput(`Error: ${(e as Error).message}`);
      }
      setRunning(false);
    }, 300);
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2">
        {LANGS.map(l => (
          <button key={l} onClick={() => setLang(l)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${lang === l ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
        <button onClick={run} disabled={running}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 transition-all">
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Run
        </button>
      </div>
      <textarea value={code} onChange={e => setCode(e.target.value)}
        className="flex-1 min-h-[200px] bg-black/50 border border-border rounded-xl p-3 font-mono text-sm resize-none outline-none focus:border-primary text-foreground"
        spellCheck={false} />
      {output && (
        <div className="rounded-xl border border-border bg-black/50 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold text-primary">OUTPUT</span>
            <button onClick={() => { navigator.clipboard.writeText(output); toast({ description: "Copied." }); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400 whitespace-pre-wrap max-h-[120px] overflow-y-auto">{output}</pre>
        </div>
      )}
    </div>
  );
}

function APITesterPanel() {
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">("GET");
  const [url, setUrl] = useState("https://httpbin.org/get");
  const [headers, setHeaders] = useState([{ key: "Content-Type", value: "application/json" }]);
  const [body, setBody] = useState('{\n  "key": "value"\n}');
  const [response, setResponse] = useState<{ status: number; time: number; body: string; headers: Record<string, string> } | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
  const METHOD_COLORS = { GET: "#3b82f6", POST: "#10b981", PUT: "#f59e0b", DELETE: "#e21227", PATCH: "#8b5cf6" };

  async function sendRequest() {
    if (!url.trim()) return;
    setLoading(true);
    const start = Date.now();
    try {
      const opts: RequestInit = {
        method,
        headers: Object.fromEntries(headers.filter(h => h.key).map(h => [h.key, h.value])),
      };
      if (method !== "GET" && method !== "DELETE") {
        try { opts.body = body; } catch { /* ignore */ }
      }
      const resp = await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
      const time = Date.now() - start;
      const resHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { resHeaders[k] = v; });
      let resBody = "";
      try { resBody = await resp.text(); try { resBody = JSON.stringify(JSON.parse(resBody), null, 2); } catch { /* keep as text */ } } catch { /* ignore */ }
      setResponse({ status: resp.status, time, body: resBody, headers: resHeaders });
    } catch (e: unknown) {
      const time = Date.now() - start;
      setResponse({ status: 0, time, body: `Error: ${(e as Error).message}`, headers: {} });
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-y-auto">
      {/* URL bar */}
      <div className="flex gap-2">
        <div className="relative">
          <button className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-border bg-background hover:bg-accent text-[11px] font-bold transition-colors"
            style={{ color: METHOD_COLORS[method] }}>
            {method} <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        </div>
        <select value={method} onChange={e => setMethod(e.target.value as typeof method)}
          className="px-2.5 py-2 rounded-lg border border-border bg-background text-[11px] font-bold outline-none"
          style={{ color: METHOD_COLORS[method] }}>
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={url} onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendRequest()}
          placeholder="https://api.example.com/endpoint"
          className="flex-1 bg-background border border-border rounded-xl px-3 py-2 outline-none focus:border-primary text-[12px] font-mono" />
        <button onClick={sendRequest} disabled={loading}
          className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 flex items-center gap-1.5 transition-all">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Headers */}
      <div className="rounded-xl border border-border bg-background/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Headers</span>
          <button onClick={() => setHeaders(h => [...h, { key: "", value: "" }])}
            className="text-[10px] text-primary hover:opacity-80 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="space-y-1">
          {headers.map((h, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input value={h.key} onChange={e => setHeaders(hh => hh.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                placeholder="Header name"
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono outline-none focus:border-primary" />
              <input value={h.value} onChange={e => setHeaders(hh => hh.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                placeholder="Value"
                className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-[11px] font-mono outline-none focus:border-primary" />
              <button onClick={() => setHeaders(hh => hh.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Body (for non-GET) */}
      {method !== "GET" && method !== "DELETE" && (
        <textarea value={body} onChange={e => setBody(e.target.value)}
          className="bg-black/50 border border-border rounded-xl p-3 font-mono text-[11px] resize-none outline-none focus:border-primary text-foreground min-h-[80px]"
          placeholder="Request body (JSON)" />
      )}

      {/* Response */}
      {response && (
        <div className="rounded-xl border overflow-hidden"
          style={{ borderColor: response.status >= 200 && response.status < 300 ? "#10b98133" : "#e2122733" }}>
          <div className="flex items-center gap-3 px-3 py-2"
            style={{ background: response.status >= 200 && response.status < 300 ? "rgba(16,185,129,0.08)" : "rgba(226,18,39,0.08)" }}>
            <span className="text-[12px] font-black font-mono"
              style={{ color: response.status >= 200 && response.status < 300 ? "#10b981" : "#e21227" }}>
              {response.status === 0 ? "ERR" : response.status}
            </span>
            <span className="text-[10px] text-muted-foreground">{response.time}ms</span>
            <button onClick={() => { navigator.clipboard.writeText(response.body); toast({ description: "Response copied." }); }}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <pre className="p-3 text-[10px] font-mono text-emerald-400 overflow-auto max-h-[160px] whitespace-pre-wrap bg-black/40">{response.body}</pre>
        </div>
      )}
    </div>
  );
}

export function ToolsHubModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (t: UtilityTool) => void;
}) {
  const { state, dispatch } = useStore();
  const { t } = useT();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"All" | ToolCategory>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [hubTab, setHubTab] = useState<HubTab>("tools");

  const filtered = useMemo(() => {
    return ALL_TOOLS.filter((tool) => cat === "All" || tool.category === cat)
      .filter((tool) => tool.tool.toLowerCase().includes(q.toLowerCase()) || tool.desc.toLowerCase().includes(q.toLowerCase()));
  }, [q, cat]);

  const pinned = ALL_TOOLS.filter((tool) => state.pinnedTools.includes(tool.tool));
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: ALL_TOOLS.length };
    CATEGORIES.forEach(c => { counts[c] = ALL_TOOLS.filter(t => t.category === c).length; });
    return counts;
  }, []);

  const topTools = ALL_TOOLS.filter(t => ["Password Generator", "Hash Generator", "Reverse Shell Builder", "Subdomain Finder", "JWT Decoder", "Base64 Tool"].includes(t.tool));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop
        className="bg-card border-border overflow-hidden flex flex-col"
        style={{
          width: "min(420px, 96vw)",
          maxWidth: "96vw",
          maxHeight: "88dvh",
          top: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 60px rgba(226,18,39,0.2), 0 0 120px rgba(0,229,255,0.08), 0 30px 100px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
          border: "1px solid rgba(226,18,39,0.35)",
          perspective: "1000px",
          transformStyle: "preserve-3d",
        } as React.CSSProperties}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span>{t("toolsHub.title")}</span>
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
              {ALL_TOOLS.length} {t("toolsHub.free")}
            </span>
          </DialogTitle>
          <DialogDescription>{t("toolsHub.subtitle", { count: ALL_TOOLS.length })}</DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {[
            { label: "TOOLS", value: ALL_TOOLS.length, color: "#e21227" },
            { label: "PINNED", value: pinned.length, color: "#fbbf24" },
            { label: "CATS", value: CATEGORIES.length, color: "#a78bfa" },
            { label: "FREE", value: "100%", color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border p-2 text-center" style={{ borderColor: `${s.color}25`, background: `${s.color}08` }}>
              <div className="text-base font-black font-mono" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] font-mono tracking-wider" style={{ color: `${s.color}80` }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Hub Tabs */}
        <div className="flex gap-1 mt-1 overflow-x-auto flex-nowrap pb-1" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
          {([
            { id: "tools", label: "Tools", icon: Sparkles },
            { id: "cvefeed", label: "CVE Feed", icon: Shield },
            { id: "websearch", label: "Web Search", icon: Globe },
            { id: "coderunner", label: "Code Runner", icon: Code2 },
            { id: "apitester", label: "API Tester", icon: Send },
            { id: "imagetools", label: "Image Tools", icon: Image },
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setHubTab(tab.id as HubTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${hubTab === tab.id ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground hover:border-primary/20"}`}>
                <Icon className="w-3 h-3" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* CVE Threat Feed */}
        {hubTab === "cvefeed" && (
          <div className="flex-1 overflow-y-auto">
            <CveFeedPanel />
          </div>
        )}

        {/* Web Search Panel */}
        {hubTab === "websearch" && (
          <div className="flex-1 overflow-y-auto">
            <WebSearchPanel />
          </div>
        )}

        {/* Code Runner Panel */}
        {hubTab === "coderunner" && (
          <div className="flex-1 overflow-y-auto">
            <CodeRunnerPanel />
          </div>
        )}

        {/* API Tester Panel */}
        {hubTab === "apitester" && (
          <div className="flex-1 overflow-y-auto">
            <APITesterPanel />
          </div>
        )}

        {/* Image Tools Panel */}
        {hubTab === "imagetools" && (
          <div className="flex-1 overflow-y-auto">
            <ImageToolsPanel />
          </div>
        )}

        {hubTab === "tools" && (
        <div className="flex flex-col gap-2 mt-1 flex-1 overflow-hidden">
          {/* Search + view toggle */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("toolsHub.searchPlaceholder")}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 outline-none focus:border-primary text-sm"
                autoFocus
              />
            </div>
            <div className="flex items-center border border-border rounded-xl overflow-hidden">
              <button onClick={() => setView("grid")} className={`px-3 py-2 transition-colors ${view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setView("list")} className={`px-3 py-2 transition-colors ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${cat === c ? "bg-primary text-white border-primary shadow-md shadow-primary/20" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
              >
                {c === "All" ? t("toolsHub.all") : c}
                <span className="ml-1 opacity-60 font-mono text-[9px]">{catCounts[c] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Top tools (only when all cat, no search) */}
          {cat === "All" && !q && pinned.length === 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-primary" /> Quick launch
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {topTools.map(tool => (
                  <button
                    key={tool.tool}
                    onClick={() => { onSelect(tool.tool); onOpenChange(false); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background/80 hover:border-primary/40 hover:bg-accent text-[11px] font-semibold transition-all"
                  >
                    <Zap className="w-3 h-3 text-primary" />
                    {tool.tool}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pinned */}
          {pinned.length > 0 && cat === "All" && !q && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Pin className="w-3 h-3 text-amber-400" /> {t("toolsHub.pinned")}
              </div>
              <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-1.5" : "flex flex-col gap-1"}>
                {pinned.map((it) => (
                  <ToolCard
                    key={it.tool}
                    item={it}
                    pinned
                    view={view}
                    onPin={() => dispatch({ type: "TOGGLE_TOOL_PIN", tool: it.tool })}
                    onSelect={() => { onSelect(it.tool); onOpenChange(false); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All / filtered tools */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {q && (
              <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                <Search className="w-3 h-3" /> {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </div>
            )}
            <div className={view === "grid" ? "grid grid-cols-2 sm:grid-cols-3 gap-1.5" : "flex flex-col gap-1"}>
              <AnimatePresence>
                {filtered.map((it, i) => (
                  <motion.div
                    key={it.tool}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, delay: i * 0.015 }}
                  >
                    <ToolCard
                      item={it}
                      pinned={state.pinnedTools.includes(it.tool)}
                      view={view}
                      onPin={() => dispatch({ type: "TOGGLE_TOOL_PIN", tool: it.tool })}
                      onSelect={() => { onSelect(it.tool); onOpenChange(false); }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-10">{t("toolsHub.noResults", { q })}</div>
            )}
          </div>
        </div>
        )}
      </DialogContentTop>
    </Dialog>
  );
}

function ImageToolsPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"generate" | "b64" | "color">("generate");
  const [imgPrompt, setImgPrompt] = useState("");
  const [imgSize, setImgSize] = useState<"256x256" | "512x512" | "1024x1024">("512x512");
  const [imgStyle, setImgStyle] = useState<"realistic" | "cyberpunk" | "anime" | "sketch">("cyberpunk");
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [b64Input, setB64Input] = useState("");
  const [b64Output, setB64Output] = useState("");
  const [b64Mode, setB64Mode] = useState<"encode" | "decode">("encode");
  const [colorHex, setColorHex] = useState("#e21227");
  const [colorPicked, setColorPicked] = useState("#e21227");

  async function generateImage() {
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    setGeneratedImg(null);
    try {
      const fullPrompt = imgStyle === "cyberpunk"
        ? `cyberpunk dark neon aesthetic, ${imgPrompt}, dark background, red accents`
        : imgStyle === "realistic"
        ? `photorealistic, high quality, ${imgPrompt}`
        : imgStyle === "anime"
        ? `anime style, ${imgPrompt}`
        : `pencil sketch, ${imgPrompt}`;

      const resp = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, size: imgSize, n: 1 }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(err);
      }
      const data = await resp.json() as { b64?: string; url?: string };
      if (data.b64) setGeneratedImg(`data:image/png;base64,${data.b64}`);
      else if (data.url) setGeneratedImg(data.url);
      else throw new Error("No image returned");
      toast({ description: "Image generated." });
    } catch (e: unknown) {
      toast({ description: `Failed: ${(e as Error).message}` });
    } finally {
      setImgLoading(false);
    }
  }

  function processB64() {
    try {
      if (b64Mode === "encode") {
        setB64Output(btoa(unescape(encodeURIComponent(b64Input))));
      } else {
        setB64Output(decodeURIComponent(escape(atob(b64Input))));
      }
    } catch {
      toast({ description: "Invalid input for Base64 operation." });
    }
  }

  function downloadImage() {
    if (!generatedImg) return;
    const a = document.createElement("a");
    a.href = generatedImg;
    a.download = `kaligpt_img_${Date.now()}.png`;
    a.click();
    toast({ description: "Image downloaded." });
  }

  function hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToHsl(hex: string) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  return (
    <div className="flex flex-col gap-3 h-full p-1">
      {/* Sub-tabs */}
      <div className="flex gap-1">
        {([
          { id: "generate", label: "AI Image Gen", icon: Wand2 },
          { id: "b64", label: "Base64", icon: FileCode },
          { id: "color", label: "Color Tools", icon: Palette },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${activeTab === t.id ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3 h-3" />{t.label}
            </button>
          );
        })}
      </div>

      {activeTab === "generate" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <select value={imgStyle} onChange={e => setImgStyle(e.target.value as typeof imgStyle)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] outline-none">
              {(["cyberpunk", "realistic", "anime", "sketch"] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={imgSize} onChange={e => setImgSize(e.target.value as typeof imgSize)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-[11px] outline-none">
              {(["256x256", "512x512", "1024x1024"] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <textarea value={imgPrompt} onChange={e => setImgPrompt(e.target.value)} rows={2}
              placeholder="Describe the image you want to generate... e.g. 'a hacker in a dark room with multiple monitors'"
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-[12px] outline-none focus:border-primary resize-none" />
            <button onClick={generateImage} disabled={imgLoading || !imgPrompt.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 flex items-center gap-1.5 self-start transition-all">
              {imgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
          {imgLoading && (
            <div className="flex items-center justify-center py-12 rounded-xl border border-dashed border-border">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-[11px] text-muted-foreground">Generating image...</span>
              </div>
            </div>
          )}
          {generatedImg && !imgLoading && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] font-bold text-primary">GENERATED IMAGE</span>
                <div className="flex gap-2">
                  <button onClick={downloadImage} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(generatedImg); toast({ description: "URL copied." }); }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
              <img src={generatedImg} alt="Generated" className="w-full max-h-64 object-contain bg-black/40" />
            </div>
          )}
        </div>
      )}

      {activeTab === "b64" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {(["encode", "decode"] as const).map(m => (
              <button key={m} onClick={() => setB64Mode(m)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${b64Mode === m ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground"}`}>
                {m === "encode" ? "Text → Base64" : "Base64 → Text"}
              </button>
            ))}
          </div>
          <textarea value={b64Input} onChange={e => setB64Input(e.target.value)} rows={4}
            placeholder={b64Mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
            className="bg-background border border-border rounded-xl px-3 py-2 text-[12px] font-mono outline-none focus:border-primary resize-none" />
          <button onClick={processB64} disabled={!b64Input.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 disabled:opacity-50 flex items-center gap-1.5 self-start transition-all">
            <Zap className="w-3.5 h-3.5" /> Convert
          </button>
          {b64Output && (
            <div className="rounded-xl border border-border">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] font-bold text-primary">OUTPUT</span>
                <button onClick={() => { navigator.clipboard.writeText(b64Output); toast({ description: "Copied." }); }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono text-emerald-400 whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-black/30">{b64Output}</pre>
            </div>
          )}
        </div>
      )}

      {activeTab === "color" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="relative">
              <input type="color" value={colorPicked} onChange={e => { setColorPicked(e.target.value); setColorHex(e.target.value); }}
                className="w-16 h-16 rounded-xl border border-border cursor-pointer bg-transparent p-0.5" />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-8">HEX</span>
                <input value={colorHex} onChange={e => { setColorHex(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setColorPicked(e.target.value); }}
                  className="flex-1 bg-background border border-border rounded-lg px-2 py-1.5 text-[12px] font-mono outline-none focus:border-primary"
                  placeholder="#e21227" />
                <button onClick={() => { navigator.clipboard.writeText(colorHex); toast({ description: "Hex copied." }); }}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-8">RGB</span>
                <span className="flex-1 text-[11px] font-mono text-muted-foreground bg-background border border-border rounded-lg px-2 py-1.5">{hexToRgb(colorPicked)}</span>
                <button onClick={() => { navigator.clipboard.writeText(hexToRgb(colorPicked)); toast({ description: "RGB copied." }); }}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-8">HSL</span>
                <span className="flex-1 text-[11px] font-mono text-muted-foreground bg-background border border-border rounded-lg px-2 py-1.5">{hexToHsl(colorPicked)}</span>
                <button onClick={() => { navigator.clipboard.writeText(hexToHsl(colorPicked)); toast({ description: "HSL copied." }); }}
                  className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="text-[9px] font-bold tracking-widest text-muted-foreground mb-2">THEME PALETTE</div>
            <div className="flex gap-2 flex-wrap">
              {["#e21227","#080808","#0d0d0d","#161616","#1f1f1f","#10b981","#3b82f6","#a78bfa","#f59e0b","#06b6d4"].map(c => (
                <button key={c} onClick={() => { setColorPicked(c); setColorHex(c); }}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                  style={{ background: c, borderColor: colorPicked === c ? "#fff" : "transparent" }}
                  title={c} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolCard({
  item,
  pinned,
  view,
  onPin,
  onSelect,
}: {
  item: (typeof ALL_TOOLS)[number];
  pinned: boolean;
  view: "grid" | "list";
  onPin: () => void;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const catStyle = CATEGORY_COLORS[item.category] ?? "text-foreground";
  const [catText, catBg, catBorder] = catStyle.split(" ");

  if (view === "list") {
    return (
      <div className="relative group flex items-center gap-3 p-2.5 rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all cursor-pointer" onClick={onSelect}>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${catBg} ${catBorder}`}>
          <Icon className={`w-4 h-4 ${catText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[13px]">{item.tool}</div>
          <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
        </div>
        <span className={`text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${catStyle}`}>{item.category}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          className={`p-1 rounded-md transition-colors flex-shrink-0 ${pinned ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"}`}
          aria-label="Pin"
        >
          <Pin className={`w-3.5 h-3.5 ${pinned ? "fill-current" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className="w-full text-left rounded-xl border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all p-2.5 h-full"
      >
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-2 ${catBg} ${catBorder}`}>
          <Icon className={`w-4 h-4 ${catText}`} />
        </div>
        <div className="font-semibold text-[12px] mb-0.5 leading-snug">{item.tool}</div>
        <div className="text-[10.5px] text-muted-foreground leading-snug line-clamp-2">{item.desc}</div>
        <div className={`mt-2 text-[8px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded border inline-flex ${catStyle}`}>{item.category}</div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPin(); }}
        className={`absolute top-1.5 right-1.5 p-1 rounded-md transition-colors ${pinned ? "text-amber-400 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-card"}`}
        aria-label="Pin"
        title={pinned ? "Unpin" : "Pin"}
      >
        <Pin className={`w-3.5 h-3.5 ${pinned ? "fill-current" : ""}`} />
      </button>
      {pinned && (
        <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
      )}
    </div>
  );
}
