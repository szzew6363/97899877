import { useState, useEffect, useCallback, useRef } from "react";
import { X, Zap, Search, Plus, Minus, Play, Users, Sliders, ChevronDown } from "lucide-react";

type Brain = { id: string; label: string; category: string; blurb: string };
type BrainConfig = Brain & { weight: number; enabled: boolean };

type CouncilEvent =
  | { type: "brain_start"; id: string }
  | { type: "brain_chunk"; id: string; content: string }
  | { type: "brain_done"; id: string }
  | { type: "synthesis_chunk"; content: string }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: string; [key: string]: unknown };

const CATEGORY_COLORS: Record<string, string> = {
  Reasoning: "#00e5ff",
  Technology: "#3b82f6",
  Security: "#e21227",
  Business: "#f59e0b",
  Creative: "#a78bfa",
  Knowledge: "#22c55e",
  "AI Models": "#f97316",
  Practical: "#06b6d4",
};

export function DynamicCouncilModal({ onClose }: { onClose: () => void }) {
  const [allBrains, setAllBrains] = useState<Brain[]>([]);
  const [configs, setConfigs] = useState<BrainConfig[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [categories, setCategories] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [brainOutputs, setBrainOutputs] = useState<Record<string, string>>({});
  const [synthesis, setSynthesis] = useState("");
  const [synthesizing, setSynthesizing] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [showBrains, setShowBrains] = useState(true);
  const [expandedBrain, setExpandedBrain] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const BASE = (window as Window & { __API_BASE__?: string }).__API_BASE__ ?? "";

  useEffect(() => {
    fetch(`${BASE}/api/ai-engine/brains`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const brains: Brain[] = d.brains ?? [];
        setAllBrains(brains);
        setCategories(["All", ...(d.categories ?? [])]);
        const defaultEnabled = ["first-principles", "bayesian", "devil's-advocate", "pentest", "redteam", "ceo", "architect"];
        setConfigs(brains.map(b => ({ ...b, weight: 1.0, enabled: defaultEnabled.includes(b.id) })));
      })
      .catch(() => {});
  }, [BASE]);

  const enabledBrains = configs.filter(c => c.enabled);

  const filtered = configs.filter(c => {
    const matchSearch = !search || c.label.toLowerCase().includes(search.toLowerCase()) || c.blurb.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || c.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const toggleBrain = (id: string) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const setWeight = (id: string, w: number) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, weight: Math.max(0.1, Math.min(2.0, Math.round(w * 10) / 10)) } : c));
  };

  const selectAll = () => setConfigs(prev => prev.map(c => filtered.find(f => f.id === c.id) ? { ...c, enabled: true } : c));
  const deselectAll = () => setConfigs(prev => prev.map(c => filtered.find(f => f.id === c.id) ? { ...c, enabled: false } : c));

  const start = useCallback(async () => {
    if (!question.trim() || enabledBrains.length === 0) return;
    setRunning(true);
    setShowBrains(false);
    setBrainOutputs({});
    setSynthesis("");
    setSynthesizing(false);
    setActiveCount(0);
    setDoneCount(0);
    setExpandedBrain(null);

    const weights: Record<string, number> = {};
    for (const b of enabledBrains) weights[b.id] = b.weight;

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${BASE}/api/council`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          brainIds: enabledBrains.map(b => b.id),
          weights,
          language: "en",
          scoring: false,
        }),
        signal: abortRef.current.signal,
        credentials: "include",
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as CouncilEvent;
            switch (evt.type) {
              case "brain_start":
                setActiveCount(p => p + 1);
                break;
              case "brain_chunk":
                if (evt.id && evt.content) {
                  setBrainOutputs(prev => ({ ...prev, [evt.id]: (prev[evt.id] ?? "") + evt.content }));
                }
                break;
              case "brain_done":
                setActiveCount(p => Math.max(0, p - 1));
                setDoneCount(p => p + 1);
                break;
              case "synthesize_start":
                setSynthesizing(true);
                break;
              case "synthesis_chunk":
                if (evt.content) setSynthesis(prev => prev + (evt.content as string));
                break;
              case "done":
                setSynthesizing(false);
                break;
              case "error":
                break;
            }
          } catch { /* parse error */ }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") console.error(e);
    } finally {
      setRunning(false);
      setSynthesizing(false);
    }
  }, [question, enabledBrains, BASE]);

  const stop = () => { abortRef.current?.abort(); setRunning(false); };

  const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? "#888";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 1000, height: "92vh", display: "flex", flexDirection: "column", background: "#080808", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 12, overflow: "hidden", fontFamily: "monospace" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(90deg, rgba(251,191,36,0.05), rgba(226,18,39,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={16} color="#fbbf24" />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em" }}>DYNAMIC COUNCIL</span>
            <span style={{ fontSize: 9, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 3, padding: "1px 6px", color: "#fbbf24" }}>{enabledBrains.length} BRAINS ACTIVE</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setShowBrains(p => !p)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "3px 10px", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Sliders size={10} />{showBrains ? "Hide" : "Configure"} Brains
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={16} /></button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left: Brain configurator */}
          {showBrains && (
            <div style={{ width: 320, borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
              {/* Search + filter */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 5, padding: "4px 8px" }}>
                    <Search size={10} color="rgba(255,255,255,0.3)" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brains..." style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, outline: "none", width: "100%" }} />
                  </div>
                  <button onClick={selectAll} style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 4, padding: "4px 8px", color: "#22c55e", fontSize: 9, cursor: "pointer" }}><Plus size={10} /></button>
                  <button onClick={deselectAll} style={{ background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.2)", borderRadius: 4, padding: "4px 8px", color: "#e21227", fontSize: 9, cursor: "pointer" }}><Minus size={10} /></button>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {categories.slice(0, 8).map(cat => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} style={{ background: categoryFilter === cat ? `${catColor(cat)}20` : "rgba(255,255,255,0.03)", border: `1px solid ${categoryFilter === cat ? catColor(cat) + "44" : "rgba(255,255,255,0.06)"}`, borderRadius: 4, padding: "2px 7px", color: categoryFilter === cat ? catColor(cat) : "rgba(255,255,255,0.35)", fontSize: 9, cursor: "pointer" }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brain list */}
              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {filtered.slice(0, 60).map(brain => (
                  <div key={brain.id} style={{ marginBottom: 3, border: `1px solid ${brain.enabled ? catColor(brain.category) + "30" : "rgba(255,255,255,0.05)"}`, borderRadius: 6, padding: "7px 10px", background: brain.enabled ? `${catColor(brain.category)}08` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => toggleBrain(brain.id)} style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${brain.enabled ? catColor(brain.category) : "rgba(255,255,255,0.2)"}`, background: brain.enabled ? catColor(brain.category) : "transparent", cursor: "pointer", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: brain.enabled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)", fontWeight: brain.enabled ? "bold" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{brain.label}</div>
                        <div style={{ fontSize: 8, color: catColor(brain.category), opacity: 0.7 }}>{brain.category}</div>
                      </div>
                      {brain.enabled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          <button onClick={() => setWeight(brain.id, brain.weight - 0.1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 10 }}>−</button>
                          <span style={{ fontSize: 9, color: brain.weight >= 1.5 ? "#fbbf24" : "rgba(255,255,255,0.5)", minWidth: 24, textAlign: "center" }}>{brain.weight.toFixed(1)}×</span>
                          <button onClick={() => setWeight(brain.id, brain.weight + 0.1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 0, fontSize: 10 }}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {allBrains.length === 0 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: 20 }}>Loading brains...</div>}
              </div>
            </div>
          )}

          {/* Right: Chat + results */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Question input */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Enter your question for the council..."
                  rows={2}
                  style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,0.85)", fontSize: 12, resize: "none", outline: "none", fontFamily: "monospace" }}
                />
                {!running ? (
                  <button onClick={start} disabled={!question.trim() || enabledBrains.length === 0} style={{ background: "#fbbf24", border: "none", borderRadius: 6, padding: "8px 14px", color: "#000", fontSize: 11, fontWeight: "bold", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: question.trim() && enabledBrains.length > 0 ? 1 : 0.5, whiteSpace: "nowrap" }}>
                    <Play size={14} />Convene
                  </button>
                ) : (
                  <button onClick={stop} style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", borderRadius: 6, padding: "8px 14px", color: "#e21227", fontSize: 11, cursor: "pointer" }}>Stop</button>
                )}
              </div>
              {running && (
                <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  <span style={{ color: "#fbbf24" }}>{activeCount} active</span>
                  <span style={{ color: "#22c55e" }}>{doneCount} done</span>
                  <span>{enabledBrains.length - doneCount - activeCount} queued</span>
                  {synthesizing && <span style={{ color: "#a78bfa" }}>synthesizing...</span>}
                </div>
              )}
            </div>

            {/* Results */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
              {/* Synthesis */}
              {synthesis && (
                <div style={{ border: "1px solid rgba(251,191,36,0.3)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(251,191,36,0.06)", borderBottom: "1px solid rgba(251,191,36,0.1)" }}>
                    <Zap size={14} color="#fbbf24" />
                    <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: "bold" }}>COUNCIL SYNTHESIS</span>
                    {synthesizing && <span style={{ fontSize: 9, color: "#fbbf24", opacity: 0.6, marginLeft: "auto" }}>synthesizing...</span>}
                  </div>
                  <div style={{ padding: "14px", fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{synthesis}</div>
                </div>
              )}

              {/* Brain outputs */}
              {Object.keys(brainOutputs).length > 0 && (
                <div>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", marginBottom: 10 }}>BRAIN RESPONSES ({Object.keys(brainOutputs).length}/{enabledBrains.length})</div>
                  {enabledBrains.filter(b => brainOutputs[b.id]).map(brain => (
                    <div key={brain.id} style={{ marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, overflow: "hidden" }}>
                      <div onClick={() => setExpandedBrain(expandedBrain === brain.id ? null : brain.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(255,255,255,0.02)", cursor: "pointer" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColor(brain.category) }} />
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", flex: 1 }}>{brain.label}</span>
                        <span style={{ fontSize: 8, color: catColor(brain.category), opacity: 0.7 }}>{brain.category}</span>
                        {brain.weight !== 1.0 && <span style={{ fontSize: 8, color: "#fbbf24" }}>{brain.weight}×</span>}
                        <ChevronDown size={10} color="rgba(255,255,255,0.3)" style={{ transform: expandedBrain === brain.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </div>
                      {expandedBrain === brain.id && (
                        <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.04)", fontSize: 11, color: "rgba(255,255,255,0.72)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                          {brainOutputs[brain.id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!running && Object.keys(brainOutputs).length === 0 && (
                <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.2)" }}>
                  <Users size={40} style={{ display: "block", margin: "0 auto 14px", opacity: 0.25 }} />
                  <div style={{ fontSize: 13, marginBottom: 6 }}>Dynamic Council</div>
                  <div style={{ fontSize: 10 }}>{enabledBrains.length} brains selected · Configure weights in the panel</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DynamicCouncilModal;
