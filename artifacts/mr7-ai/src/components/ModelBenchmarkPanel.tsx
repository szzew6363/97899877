import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronDown, ChevronUp, Trophy, Zap, Clock, Cpu, BarChart2, Radar } from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   AI MODEL BENCHMARK PANEL — Ultra 3D Radar + Live Metrics v2
   3D radar chart · Animated bars · Particle bursts · Live ranking
═══════════════════════════════════════════════════════════════════════ */

const PANEL_W = 340;
const CW = PANEL_W; const CH = 180;

interface ModelStats {
  model: string;
  calls: number;
  successes: number;
  totalLatency: number;
  minLatency: number;
  maxLatency: number;
  totalTokens: number;
  totalBytes: number;
}

function shortName(m: string): string {
  return m.replace(/CHAT-GPT\s*/i, "").replace(/gpt-/i, "").slice(0, 16) || m.slice(0, 16);
}
function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms/1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}
function medal(rank: number): string {
  return rank === 0 ? "#fbbf24" : rank === 1 ? "#94a3b8" : rank === 2 ? "#b45309" : "rgba(255,255,255,0.2)";
}

const MODEL_COLORS = ["#00e5ff","#22c55e","#a78bfa","#f59e0b","#e879f9","#fb923c","#e21227","#10b981"];
const RADAR_AXES = ["SPEED","TOKENS","VOLUME","RELIAB","EFFICIENCY","SCORE"];
const STAR_PARTICLES: {x:number;y:number;r:number;a:number}[] = Array.from({length:40},()=>({
  x:Math.random()*CW, y:Math.random()*CH, r:Math.random()*0.8+0.1, a:Math.random()*0.3
}));

export function ModelBenchmarkPanel() {
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-benchmark-pos",
    { x: Math.max(0, window.innerWidth - PANEL_W - 20), y: 200 }
  );
  const [collapsed, setCollapsed] = useState(false);
  const [stats,     setStats]     = useState<ModelStats[]>([]);
  const [sort,      setSort]      = useState<"latency"|"calls"|"tokens">("calls");
  const [tab,       setTab]       = useState<"radar"|"bars">("bars");
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef<number>(0);
  const tickRef     = useRef(0);
  const burstRef    = useRef<{x:number;y:number;color:string;particles:{dx:number;dy:number;life:number;size:number}[]}[]>([]);

  const rebuild = useCallback(() => {
    const map = new Map<string, ModelStats>();
    for (const ev of trafficBus.history) {
      if (ev.status !== "success" && ev.status !== "error") continue;
      const key = ev.model || "unknown";
      const s: ModelStats = map.get(key) ?? {
        model:key, calls:0, successes:0, totalLatency:0,
        minLatency:Infinity, maxLatency:0, totalTokens:0, totalBytes:0,
      };
      s.calls++;
      if (ev.status === "success" && ev.latency != null) {
        s.successes++;
        s.totalLatency += ev.latency;
        s.minLatency = Math.min(s.minLatency, ev.latency);
        s.maxLatency = Math.max(s.maxLatency, ev.latency);
      }
      s.totalTokens += ev.tokens ?? 0;
      s.totalBytes  += (ev.bytesSent ?? 0) + (ev.bytesReceived ?? 0);
      map.set(key, s);
    }
    setStats([...map.values()]);
  }, []);

  useEffect(() => {
    rebuild();
    return trafficBus.subscribe(ev => {
      rebuild();
      // Burst particles on new success
      if (ev.status === "success") {
        const ci = Math.abs(ev.model?.charCodeAt(0) ?? 0) % MODEL_COLORS.length;
        const color = MODEL_COLORS[ci];
        const x = 20 + Math.random() * (CW - 40);
        const y = CH / 2;
        burstRef.current.push({
          x, y, color,
          particles: Array.from({length:10}, () => ({
            dx:(Math.random()-0.5)*4, dy:-Math.random()*3-1,
            life:1, size:Math.random()*2+1,
          }))
        });
      }
    });
  }, [rebuild]);

  const sorted = [...stats].sort((a,b) => {
    if (sort === "latency") {
      const la = a.successes > 0 ? a.totalLatency/a.successes : Infinity;
      const lb = b.successes > 0 ? b.totalLatency/b.successes : Infinity;
      return la - lb;
    }
    if (sort === "tokens") return b.totalTokens - a.totalTokens;
    return b.calls - a.calls;
  });

  // Radar canvas
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "rgba(2,4,16,0.98)"; ctx.fillRect(0, 0, CW, CH);

      // Stars
      STAR_PARTICLES.forEach(s => {
        const tw = (Math.sin(t*0.015+s.x)+1)/2;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${s.a*(0.3+tw*0.7)})`; ctx.fill();
      });

      if (tab === "radar") {
        // 3D Radar chart
        const cx = CW/2; const cy = CH/2;
        const maxR = Math.min(cx,cy) - 20;
        const N = RADAR_AXES.length;

        // Background rings
        for (let ring = 1; ring <= 4; ring++) {
          const r = maxR * ring / 4;
          ctx.beginPath();
          for (let i = 0; i < N; i++) {
            const angle = (i/N)*Math.PI*2 - Math.PI/2;
            const x = cx + r*Math.cos(angle); const y = cy + r*Math.sin(angle);
            i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
          }
          ctx.closePath();
          ctx.strokeStyle=`rgba(0,229,255,${0.06+ring*0.03})`; ctx.lineWidth=0.5; ctx.stroke();
          ctx.fillStyle=`rgba(0,229,255,${0.01})`; ctx.fill();
        }

        // Axis lines + labels
        RADAR_AXES.forEach((label,i)=>{
          const angle = (i/N)*Math.PI*2 - Math.PI/2;
          const x = cx + maxR*Math.cos(angle); const y = cy + maxR*Math.sin(angle);
          ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y);
          ctx.strokeStyle="rgba(0,229,255,0.15)"; ctx.lineWidth=0.8; ctx.stroke();
          const lx = cx + (maxR+14)*Math.cos(angle); const ly = cy + (maxR+14)*Math.sin(angle);
          ctx.fillStyle="rgba(0,229,255,0.6)"; ctx.font="bold 7px monospace"; ctx.textAlign="center";
          ctx.fillText(label,lx,ly+3);
        });

        // Model polygons
        sorted.slice(0,4).forEach((s,si)=>{
          const color = MODEL_COLORS[si % MODEL_COLORS.length];
          const maxCalls = Math.max(1,...sorted.map(m=>m.calls));
          const maxTok   = Math.max(1,...sorted.map(m=>m.totalTokens));
          const minLat   = Math.min(...sorted.filter(m=>m.successes>0).map(m=>m.totalLatency/m.successes));
          const avgLat   = s.successes>0?s.totalLatency/s.successes:9999;
          const vals = [
            1-Math.min(1,avgLat/5000),
            Math.min(1,s.totalTokens/maxTok),
            Math.min(1,s.calls/maxCalls),
            s.calls>0?s.successes/s.calls:0,
            s.successes>0?(minLat/avgLat)*0.8+0.2:0,
            (s.successes/Math.max(1,s.calls)) * (1-Math.min(1,avgLat/5000)),
          ];
          ctx.beginPath();
          vals.forEach((v,i)=>{
            const pulse = 1 + 0.03*Math.sin(t*0.04+si*1.5+i*0.5);
            const r = maxR*v*pulse*(0.7+si*0.04);
            const angle = (i/N)*Math.PI*2 - Math.PI/2;
            const x = cx + r*Math.cos(angle); const y = cy + r*Math.sin(angle);
            i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
          });
          ctx.closePath();
          ctx.fillStyle=color+"22"; ctx.fill();
          ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke();

          // Vertex dots
          vals.forEach((v,i)=>{
            const r = maxR*v;
            const angle = (i/N)*Math.PI*2 - Math.PI/2;
            const x = cx + r*Math.cos(angle); const y = cy + r*Math.sin(angle);
            ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2);
            ctx.fillStyle=color; ctx.fill();
          });
        });

        // Center dot
        const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,8);
        cg.addColorStop(0,"rgba(255,255,255,0.6)"); cg.addColorStop(1,"rgba(0,229,255,0)");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill();

      } else {
        // Animated 3D bar chart
        const maxCalls = Math.max(1,...sorted.map(s=>s.calls));
        const barH = (CH - 32) / Math.max(1, Math.min(6, sorted.length));
        const maxBarW = CW - 90;

        sorted.slice(0,6).forEach((s,i)=>{
          const color = MODEL_COLORS[i % MODEL_COLORS.length];
          const ratio = s.calls / maxCalls;
          const targetW = maxBarW * ratio;
          const y = 12 + i * barH;
          const barActH = barH - 4;
          const depth = 6;

          // Animated shimmer along bar
          const shimX = ((t*0.8 + i*30) % (targetW+40)) - 20;

          // ISO top
          ctx.beginPath();
          ctx.moveTo(80,y); ctx.lineTo(80+targetW,y);
          ctx.lineTo(80+targetW+depth*0.7,y-depth*0.4);
          ctx.lineTo(80+depth*0.7,y-depth*0.4);
          ctx.closePath();
          ctx.fillStyle=color+"55"; ctx.fill();

          // ISO right side
          ctx.beginPath();
          ctx.moveTo(80+targetW,y); ctx.lineTo(80+targetW,y+barActH);
          ctx.lineTo(80+targetW+depth*0.7,y+barActH-depth*0.4);
          ctx.lineTo(80+targetW+depth*0.7,y-depth*0.4);
          ctx.closePath();
          ctx.fillStyle=color+"22"; ctx.fill();

          // Front face
          const grad = ctx.createLinearGradient(80,0,80+targetW,0);
          grad.addColorStop(0,color+"dd"); grad.addColorStop(0.6,color+"88"); grad.addColorStop(1,color+"33");
          ctx.fillStyle=grad;
          ctx.fillRect(80,y,targetW,barActH);

          // Shimmer
          if(targetW>10){
            const sg=ctx.createLinearGradient(80+shimX-15,0,80+shimX+15,0);
            sg.addColorStop(0,"rgba(255,255,255,0)"); sg.addColorStop(0.5,"rgba(255,255,255,0.15)"); sg.addColorStop(1,"rgba(255,255,255,0)");
            ctx.fillStyle=sg; ctx.fillRect(80,y,targetW,barActH);
          }

          // Glow on top
          if(targetW>5){
            const tg=ctx.createRadialGradient(80+targetW,y+barActH/2,0,80+targetW,y+barActH/2,14);
            tg.addColorStop(0,color+"88"); tg.addColorStop(1,"rgba(0,0,0,0)");
            ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(80+targetW,y+barActH/2,14,0,Math.PI*2); ctx.fill();
          }

          // Label
          ctx.fillStyle=i<3?medal(i):"#555";
          ctx.font=`bold ${i===0?8.5:7.5}px monospace`; ctx.textAlign="right";
          ctx.fillText(shortName(s.model),76,y+barActH/2+3);

          // Value
          ctx.fillStyle=color; ctx.font="bold 7px monospace"; ctx.textAlign="left";
          if(targetW>30) ctx.fillText(`${s.calls}`,84+targetW,y+barActH/2+3);

          // Medal dot
          if(i<3){
            ctx.beginPath(); ctx.arc(4+i*10,y+barActH/2,3.5,0,Math.PI*2);
            ctx.fillStyle=medal(i); ctx.fill();
          }
        });

        // Base line
        ctx.beginPath(); ctx.moveTo(80,10); ctx.lineTo(80,CH-8);
        ctx.strokeStyle="rgba(0,229,255,0.2)"; ctx.lineWidth=1; ctx.stroke();
      }

      // Particle bursts
      burstRef.current = burstRef.current.filter(b=>b.particles.some(p=>p.life>0.05));
      burstRef.current.forEach(b=>{
        b.particles.forEach(p=>{
          ctx.beginPath(); ctx.arc(b.x+p.dx*20*(1-p.life),b.y+p.dy*20*(1-p.life),p.size,0,Math.PI*2);
          ctx.fillStyle=b.color; ctx.globalAlpha=p.life*0.8; ctx.fill();
          p.life *= 0.92;
        });
      });
      ctx.globalAlpha=1;
    }
    frame();
    return ()=>cancelAnimationFrame(frameRef.current);
  },[tab]);

  const totalTok = stats.reduce((s,m)=>s+m.totalTokens,0);
  const avgLat   = (() => {
    const done = stats.filter(m=>m.successes>0);
    if(!done.length) return 0;
    return Math.round(done.reduce((s,m)=>s+m.totalLatency/m.successes,0)/done.length);
  })();

  return (
    <div ref={rootRef} style={{left:pos.x,top:pos.y}} className="fixed z-[96] w-[340px] select-none">
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.1)]"
        style={{background:"rgba(2,4,16,0.97)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}>
          <BarChart2 size={11} className="text-[#fbbf24]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#fbbf24]">MODEL BENCHMARK</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={()=>setTab(v=>v==="bars"?"radar":"bars")}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#333] text-[#555] hover:border-[#fbbf24] hover:text-[#fbbf24]">
              {tab==="bars"?"RADAR":"BARS"}
            </button>
            <button onClick={()=>setCollapsed(c=>!c)} className="text-[#555] hover:text-white">
              {collapsed?<ChevronDown size={11}/>:<ChevronUp size={11}/>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed&&(
            <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden">
              <canvas ref={canvasRef} width={CW} height={CH} className="block w-full border-b border-[#1a1a1a]" />

              {/* Summary stats */}
              <div className="flex items-center gap-4 px-3 py-1.5 border-b border-[#1a1a1a]">
                <div className="text-center">
                  <div className="text-[8px] font-mono text-[#555]">MODELS</div>
                  <div className="text-[13px] font-mono font-bold text-[#fbbf24]">{stats.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-mono text-[#555]">CALLS</div>
                  <div className="text-[13px] font-mono font-bold text-[#00e5ff]">{stats.reduce((s,m)=>s+m.calls,0)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-mono text-[#555]">AVG LAT</div>
                  <div className="text-[13px] font-mono font-bold text-[#22c55e]">{avgLat?fmtMs(avgLat):"—"}</div>
                </div>
                <div className="text-center">
                  <div className="text-[8px] font-mono text-[#555]">TOKENS</div>
                  <div className="text-[13px] font-mono font-bold text-[#a78bfa]">{totalTok.toLocaleString()}</div>
                </div>
              </div>

              {/* Sort buttons */}
              <div className="flex items-center gap-1 px-2 py-1 border-b border-[#1a1a1a]">
                {(["calls","latency","tokens"] as const).map(s=>(
                  <button key={s} onClick={()=>setSort(s)}
                    className={`px-2 py-0.5 rounded text-[8px] font-mono transition-all border ${
                      sort===s?"border-[#fbbf24] text-[#fbbf24] bg-[#fbbf2411]":"border-[#333] text-[#555] hover:border-[#666]"
                    }`}>{s.toUpperCase()}</button>
                ))}
              </div>

              {/* Ranked list */}
              <div className="overflow-y-auto max-h-[120px]">
                {sorted.slice(0,8).map((s,i)=>{
                  const avgL = s.successes>0?Math.round(s.totalLatency/s.successes):null;
                  const tokRate = s.totalLatency>0?Math.round(s.totalTokens/(s.totalLatency/1000)):0;
                  return (
                    <div key={s.model} className="flex items-center gap-2 px-2 py-1 border-b border-[#0d0d0d] hover:bg-[#111]">
                      <span className="text-[10px] font-mono w-4 shrink-0" style={{color:medal(i)}}>{i===0?"#1":i===1?"#2":i===2?"#3":`${i+1}`}</span>
                      <span className="text-[9px] font-mono flex-1 truncate" style={{color:MODEL_COLORS[i%MODEL_COLORS.length]}}>{shortName(s.model)}</span>
                      <span className="text-[8px] font-mono text-[#555]">{s.calls}×</span>
                      <span className="text-[8px] font-mono" style={{color:avgL&&avgL<1000?"#22c55e":avgL&&avgL<3000?"#f59e0b":"#e21227"}}>
                        {avgL?fmtMs(avgL):"—"}
                      </span>
                      <span className="text-[8px] font-mono text-[#a78bfa]">{s.totalTokens>0?`${s.totalTokens.toLocaleString()}T`:""}</span>
                    </div>
                  );
                })}
                {sorted.length===0&&(
                  <div className="text-center py-4 text-[9px] font-mono text-[#333]">NO DATA — START A CHAT</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
