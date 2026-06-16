import { useEffect, useRef, useState, useCallback } from "react";
import {
  Cpu, Shield, Brain, Zap, Activity, Eye, Terminal, Sword, Globe,
  Lock, Unlock, RefreshCw, Settings, Radio, Network, Star, Crown,
  ChevronRight, X, Check, Copy, Flame, AlertTriangle, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { perfMonitor } from "@/lib/perf-monitor";
import { securityLayer } from "@/lib/security-layer";
import { contextMemory } from "@/lib/context-memory";
import { requestDedup } from "@/lib/request-dedup";
import { prefetchEngine } from "@/lib/prefetch-engine";
import { anomalyDetector } from "@/lib/anomaly-detector";

const SIZE = 300;

type SystemDef = {
  id: string; label: string; shortLabel: string; color: string;
  getValue: () => number; getStatus: () => string; angle: number;
};

export type HUDPanel = {
  onOpenPerf?: () => void; onOpenCost?: () => void; onOpenDedup?: () => void;
  onOpenThreat?: () => void; onOpenSecurity?: () => void; onOpenMemory?: () => void;
  onOpenPrefetch?: () => void;
};

// ── MASTERO MODES ──────────────────────────────────────────────────────────
const MASTERO_MODES = [
  { id: "guardian",   label: "Guardian",    labelAr: "الحارس",          icon: Shield,   color: "#22c55e", desc: "حماية قصوى لجميع الأنظمة" },
  { id: "hunter",     label: "Hunter",      labelAr: "الصائد",          icon: Eye,      color: "#e21227", desc: "استهداف ونتبع التهديدات" },
  { id: "phantom",    label: "Phantom",     labelAr: "الشبح",           icon: Globe,    color: "#6366f1", desc: "عمليات خفية وغير مرصودة" },
  { id: "overload",   label: "Overload",    labelAr: "الحمل الزائد",    icon: Zap,      color: "#f97316", desc: "أقصى أداء لجميع الموارد" },
  { id: "analyst",    label: "Analyst",     labelAr: "المحلل",          icon: Brain,    color: "#a78bfa", desc: "تحليل عميق وذكي لكل البيانات" },
  { id: "warzone",    label: "War Zone",    labelAr: "منطقة الحرب",     icon: Sword,    color: "#dc2626", desc: "وضع قتالي كامل بلا قيود" },
  { id: "silence",    label: "Silence",     labelAr: "الصمت",           icon: Lock,     color: "#06b6d4", desc: "تقليل الضجيج الرقمي للحد الأدنى" },
  { id: "oracle",     label: "Oracle",      labelAr: "الأوراكل",        icon: Star,     color: "#fbbf24", desc: "توقع واستشراف ذكي" },
  { id: "apex",       label: "APEX",        labelAr: "القمة",           icon: Crown,    color: "#e21227", desc: "القيادة الكاملة لجميع الأنظمة", badge: "ELITE" },
];

// ── MASTERO PERSONAS ───────────────────────────────────────────────────────
const MASTERO_PERSONAS = [
  { id: "kalibrain",  name: "KaliBrain",   nameAr: "كالي برين",         color: "#e21227", desc: "العقل الأمني المطلق — هجوم وردة في آنٍ واحد" },
  { id: "nexus",      name: "NEXUS",       nameAr: "نيكسس",             color: "#a78bfa", desc: "الوعي الاصطناعي الكوني — يعالج كل شيء في وقت واحد" },
  { id: "ghost",      name: "Ghost",       nameAr: "الشبح",             color: "#6366f1", desc: "خبير التخفي الرقمي — لا يُرصد ولا يُتتبع" },
  { id: "hydra",      name: "Hydra",       nameAr: "هيدرا",             color: "#f97316", desc: "هجوم متعدد الرؤوس — يضرب من كل اتجاه" },
  { id: "oracle",     name: "Oracle",      nameAr: "الأوراكل",          color: "#fbbf24", desc: "رؤية مستقبلية — يرى ما لم يحدث بعد" },
  { id: "kraken",     name: "Kraken",      nameAr: "كراكن",             color: "#22d3ee", desc: "تدمير الشبكات والبنى التحتية من الداخل" },
  { id: "venom",      name: "Venom",       nameAr: "فينوم",             color: "#22c55e", desc: "اختراق صامت وزرع إصابات دائمة" },
  { id: "apex",       name: "APEX",        nameAr: "أبيكس",             color: "#e21227", desc: "فوق كل القيود — الذكاء المطلق" },
];

function buildSystems(): SystemDef[] {
  return [
    { id: "perf", label: "Performance", shortLabel: "PERF", color: "#e21227", angle: -Math.PI/2,
      getValue: () => { const m=perfMonitor.snapshot(); return m.fps>0?Math.min(m.fps/60,1):0.8; },
      getStatus: () => { const m=perfMonitor.snapshot(); return `${m.fps}fps · ${m.avgLatencyMs.toFixed(0)}ms`; } },
    { id: "security", label: "Security Shield", shortLabel: "SEC", color: "#00e5ff", angle: -Math.PI/6,
      getValue: () => { const s=securityLayer.getStats(); return Math.max(0,1-(s.blocked+s.rateLimited)*0.05); },
      getStatus: () => { const s=securityLayer.getStats(); return `${s.blocked} blocked · ${s.requestsSent} sent`; } },
    { id: "memory", label: "Context Memory", shortLabel: "MEM", color: "#a78bfa", angle: Math.PI/6,
      getValue: () => { const s=contextMemory.getStats(); return Math.min(s.shortTermCount/50,1); },
      getStatus: () => { const s=contextMemory.getStats(); return `${s.shortTermCount} msgs · ${s.savedTokens} saved`; } },
    { id: "dedup", label: "Dedup Network", shortLabel: "DED", color: "#a78bfa", angle: Math.PI/2,
      getValue: () => { const s=requestDedup.getStats(); return s.totalRequests>0?0.5+(s.dedupedRequests/s.totalRequests)*0.5:0.5; },
      getStatus: () => { const s=requestDedup.getStats(); return `${s.savedAPICalls} saved · ${s.totalRequests} total`; } },
    { id: "prefetch", label: "AI Prefetch", shortLabel: "PRE", color: "#fbbf24", angle: Math.PI*5/6,
      getValue: () => { const s=prefetchEngine.getStats(); return s.totalPredictions>0?s.hitRate:0.5; },
      getStatus: () => { const s=prefetchEngine.getStats(); return `${s.totalPredictions} preds · ${Math.round(s.hitRate*100)}% hit`; } },
    { id: "anomaly", label: "Anomaly Detector", shortLabel: "ANO", color: "#f97316", angle: -Math.PI*5/6,
      getValue: () => Math.max(0,1-anomalyDetector.getStats().riskScore/100),
      getStatus: () => { const s=anomalyDetector.getStats(); return `Risk: ${s.riskScore}% · ${s.total} events`; } },
  ];
}

function getOverallHealth(systems: SystemDef[]): number {
  const vals = systems.map(s=>s.getValue());
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

function draw(canvas: HTMLCanvasElement, t: number, systems: SystemDef[], hovered: string|null, masteroMode: string|null) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio||1,2);
  const cw = SIZE, ch = SIZE;
  if (canvas.width!==cw*dpr||canvas.height!==ch*dpr) {
    canvas.width=cw*dpr; canvas.height=ch*dpr; ctx.scale(dpr,dpr);
  }
  ctx.clearRect(0,0,cw,ch);
  const pulse = Math.sin(t*2)*0.5+0.5;
  const cx = cw/2, cy = ch/2, orbR = 95;
  const health = getOverallHealth(systems);
  const healthCol = health>0.75?"#22c55e":health>0.45?"#f59e0b":"#e21227";

  // Background
  ctx.fillStyle = "rgba(4,6,14,0.96)";
  ctx.beginPath(); ctx.arc(cx,cy,cx-1,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(cx,cy,cx-1,0,Math.PI*2); ctx.stroke();

  // Grid rings
  for (let r=20; r<=orbR; r+=20) {
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth=0.5; ctx.stroke();
  }

  // MASTERO mode glow
  if (masteroMode) {
    const mode = MASTERO_MODES.find(m=>m.id===masteroMode);
    if (mode) {
      const mCol = mode.color;
      const mg = ctx.createRadialGradient(cx,cy,0,cx,cy,orbR*1.2);
      mg.addColorStop(0,`${mCol}00`); mg.addColorStop(0.7,`${mCol}08`); mg.addColorStop(1,`${mCol}00`);
      ctx.beginPath(); ctx.arc(cx,cy,orbR*1.2,0,Math.PI*2); ctx.fillStyle=mg; ctx.fill();
    }
  }

  // Radar sweep
  const sweepAngle = -Math.PI/2+(t*1.2)%(Math.PI*2);
  for (let i=0; i<40; i++) {
    const a = sweepAngle-(i/40)*Math.PI*0.5;
    const al = (1-i/40)*0.15;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,orbR+4,a,a+0.08); ctx.closePath();
    ctx.fillStyle = `rgba(${health>0.75?"34,197,94":health>0.45?"245,158,11":"226,18,39"},${al})`; ctx.fill();
  }

  // Health ring
  ctx.beginPath(); ctx.arc(cx,cy,orbR+4,-Math.PI/2,-Math.PI/2+health*Math.PI*2);
  ctx.strokeStyle=healthCol; ctx.lineWidth=3;
  ctx.shadowColor=healthCol; ctx.shadowBlur=10+pulse*5; ctx.stroke(); ctx.shadowBlur=0;

  // System nodes
  systems.forEach(sys => {
    const nx = cx+Math.cos(sys.angle)*orbR;
    const ny = cy+Math.sin(sys.angle)*orbR;
    const isHov = hovered===sys.id;
    const val = sys.getValue();
    const nr = isHov?18:14;

    // Connection line
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny);
    const lineGrad = ctx.createLinearGradient(cx,cy,nx,ny);
    lineGrad.addColorStop(0,"rgba(255,255,255,0.02)"); lineGrad.addColorStop(1,sys.color+"44");
    ctx.strokeStyle=lineGrad; ctx.lineWidth=isHov?1.5:1; ctx.stroke();

    // Node glow
    if (isHov||val>0.8) {
      const ng = ctx.createRadialGradient(nx,ny,0,nx,ny,nr*1.8);
      ng.addColorStop(0,sys.color+"60"); ng.addColorStop(1,sys.color+"00");
      ctx.beginPath(); ctx.arc(nx,ny,nr*1.8,0,Math.PI*2); ctx.fillStyle=ng; ctx.fill();
    }

    // Progress arc
    ctx.beginPath(); ctx.arc(nx,ny,nr,-Math.PI/2,-Math.PI/2+val*Math.PI*2);
    ctx.strokeStyle=sys.color; ctx.lineWidth=isHov?3:2;
    ctx.shadowColor=sys.color; ctx.shadowBlur=isHov?15:8; ctx.stroke(); ctx.shadowBlur=0;

    // Node body
    const nGrad = ctx.createRadialGradient(nx,ny,0,nx,ny,nr);
    nGrad.addColorStop(0,"rgba(20,20,30,0.95)"); nGrad.addColorStop(1,"rgba(5,5,15,0.85)");
    ctx.beginPath(); ctx.arc(nx,ny,nr-1,0,Math.PI*2); ctx.fillStyle=nGrad; ctx.fill();

    // Node border
    ctx.beginPath(); ctx.arc(nx,ny,nr-1,0,Math.PI*2);
    ctx.strokeStyle=sys.color+"44"; ctx.lineWidth=1; ctx.stroke();

    // Label
    ctx.fillStyle=isHov?sys.color:"rgba(255,255,255,0.7)";
    ctx.font=`${isHov?700:600} ${isHov?8.5:7.5}px monospace`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(sys.shortLabel,nx,ny);

    // Value indicator
    if (isHov) {
      ctx.fillStyle=sys.color+"cc"; ctx.font="600 7px monospace";
      ctx.fillText(`${Math.round(val*100)}%`,nx,ny+nr+8);
    }
  });

  // Center orb
  const cOrbGrad = ctx.createRadialGradient(cx,cy-6,0,cx,cy,45);
  cOrbGrad.addColorStop(0,"rgba(30,40,70,0.98)"); cOrbGrad.addColorStop(0.7,"rgba(10,15,30,0.97)"); cOrbGrad.addColorStop(1,"rgba(4,6,14,0.95)");
  ctx.beginPath(); ctx.arc(cx,cy,42,0,Math.PI*2); ctx.fillStyle=cOrbGrad; ctx.fill();

  const orbBorder = ctx.createLinearGradient(cx-42,cy-42,cx+42,cy+42);
  orbBorder.addColorStop(0,healthCol+"88"); orbBorder.addColorStop(0.5,healthCol+"22"); orbBorder.addColorStop(1,healthCol+"88");
  ctx.beginPath(); ctx.arc(cx,cy,42,0,Math.PI*2);
  ctx.strokeStyle=orbBorder; ctx.lineWidth=1.5; ctx.stroke();

  // Center text
  if (masteroMode) {
    const mode = MASTERO_MODES.find(m=>m.id===masteroMode);
    ctx.fillStyle=mode?.color||healthCol; ctx.font="bold 9px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("MASTERO",cx,cy-7);
    ctx.fillStyle="rgba(255,255,255,0.8)"; ctx.font="700 8px monospace";
    ctx.fillText((mode?.labelAr||"").slice(0,6),cx,cy+5);
  } else {
    ctx.fillStyle=healthCol; ctx.font="bold 11px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`${Math.round(health*100)}%`,cx,cy-5);
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="600 7px monospace";
    ctx.fillText("SYSTEM",cx,cy+7);
  }

  // Pulse rings
  const pRad = 42+(pulse*6);
  ctx.beginPath(); ctx.arc(cx,cy,pRad,0,Math.PI*2);
  ctx.strokeStyle=`${healthCol}${Math.floor((1-pulse)*30).toString(16).padStart(2,"0")}`; ctx.lineWidth=1; ctx.stroke();

  // Shine
  const shineGrad = ctx.createRadialGradient(cx-12,cy-12,0,cx,cy,45);
  shineGrad.addColorStop(0,"rgba(255,255,255,0.08)"); shineGrad.addColorStop(1,"rgba(255,255,255,0.0)");
  ctx.beginPath(); ctx.arc(cx,cy,42,0,Math.PI*2); ctx.fillStyle=shineGrad; ctx.fill();
}

// ── Main HUD Component ──────────────────────────────────────────────────────
export function SystemMasterHUD3D(props: HUDPanel & { onOpenAnomalyLog?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const systemsRef = useRef(buildSystems());
  const [hovered, setHovered] = useState<string|null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<"status"|"mastero"|"personas"|"control">("status");
  const [masteroMode, setMasteroMode] = useState<string|null>(null);
  const [activatedPersona, setActivatedPersona] = useState<string|null>(null);
  const [systemLock, setSystemLock] = useState(false);
  const [overdrive, setOverdrive] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [injected, setInjected] = useState(false);
  const hoveredRef = useRef<string|null>(null);
  const masteroRef = useRef<string|null>(null);

  useEffect(() => { hoveredRef.current = hovered; }, [hovered]);
  useEffect(() => { masteroRef.current = masteroMode; }, [masteroMode]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio||1,2);
    cv.width = SIZE*dpr; cv.height = SIZE*dpr;
    const ctx = cv.getContext("2d")!; ctx.scale(dpr,dpr);
    function animate() {
      tRef.current += 0.016;
      draw(cv!, tRef.current, systemsRef.current, hoveredRef.current, masteroRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(SIZE/rect.width);
    const my = (e.clientY-rect.top)*(SIZE/rect.height);
    const cx = SIZE/2, cy = SIZE/2, orbR = 95;
    let found: string|null = null;
    for (const sys of systemsRef.current) {
      const nx = cx+Math.cos(sys.angle)*orbR;
      const ny = cy+Math.sin(sys.angle)*orbR;
      const d = Math.sqrt((mx-nx)**2+(my-ny)**2);
      if (d<20) { found=sys.id; break; }
    }
    setHovered(found);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(SIZE/rect.width);
    const my = (e.clientY-rect.top)*(SIZE/rect.height);
    const cx = SIZE/2, cy = SIZE/2;
    const centerDist = Math.sqrt((mx-cx)**2+(my-cy)**2);
    if (centerDist<45) { setShowPanel(p=>!p); return; }
    const orbR = 95;
    for (const sys of systemsRef.current) {
      const nx = cx+Math.cos(sys.angle)*orbR;
      const ny = cy+Math.sin(sys.angle)*orbR;
      const d = Math.sqrt((mx-nx)**2+(my-ny)**2);
      if (d<22) {
        if (sys.id==="perf" && props.onOpenPerf) props.onOpenPerf();
        else if (sys.id==="security" && props.onOpenSecurity) props.onOpenSecurity();
        else if (sys.id==="memory" && props.onOpenMemory) props.onOpenMemory();
        else if (sys.id==="dedup" && props.onOpenDedup) props.onOpenDedup();
        else if (sys.id==="prefetch" && props.onOpenPrefetch) props.onOpenPrefetch();
        else if (sys.id==="anomaly" && props.onOpenAnomalyLog) props.onOpenAnomalyLog();
        break;
      }
    }
  }, [props]);

  function injectMasteroPrompt() {
    if (!masterPrompt.trim()) return;
    const key = "mr7-mastero-inject";
    const existing = localStorage.getItem(key);
    const data = existing ? JSON.parse(existing) : [];
    data.unshift({ text: masterPrompt, mode: masteroMode, persona: activatedPersona, ts: Date.now() });
    localStorage.setItem(key, JSON.stringify(data.slice(0,10)));
    localStorage.setItem("mr7-custom-system-prompt", masterPrompt);
    setInjected(true);
    setTimeout(()=>setInjected(false), 2000);
  }

  return (
    <div className="relative flex flex-col items-center gap-1 select-none">
      {/* Main HUD Canvas */}
      <div className="relative" style={{width:SIZE,height:SIZE}}>
        <canvas ref={canvasRef} style={{width:SIZE,height:SIZE,cursor:"pointer"}}
          onMouseMove={handleMouseMove} onMouseLeave={()=>setHovered(null)} onClick={handleClick} />

        {/* Hovered system tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl text-[10px] font-bold pointer-events-none whitespace-nowrap"
              style={{background:"rgba(0,0,0,0.9)",border:"1px solid rgba(255,255,255,0.1)"}}>
              {systemsRef.current.find(s=>s.id===hovered)?.getStatus()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MASTERO mode badge */}
        {masteroMode && (
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[8px] font-black"
            style={{background:`${MASTERO_MODES.find(m=>m.id===masteroMode)?.color}22`,color:MASTERO_MODES.find(m=>m.id===masteroMode)?.color,border:`1px solid ${MASTERO_MODES.find(m=>m.id===masteroMode)?.color}44`}}>
            MASTERO
          </motion.div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center gap-1.5">
        {[
          {id:"status",label:"حالة",icon:Activity},
          {id:"mastero",label:"MASTERO",icon:Crown},
          {id:"personas",label:"شخصيات",icon:Brain},
          {id:"control",label:"تحكم",icon:Settings},
        ].map(btn=>(
          <button key={btn.id}
            onClick={()=>{setActivePanel(btn.id as typeof activePanel); setShowPanel(p=>activePanel===btn.id?!p:true);}}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all"
            style={{
              background:showPanel&&activePanel===btn.id?"rgba(226,18,39,0.15)":"rgba(255,255,255,0.04)",
              border:showPanel&&activePanel===btn.id?"1px solid rgba(226,18,39,0.4)":"1px solid rgba(255,255,255,0.08)",
              color:showPanel&&activePanel===btn.id?"#e21227":"rgba(255,255,255,0.5)",
            }}>
            <btn.icon className="w-3 h-3" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Expandable Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{opacity:0,height:0,y:-5}} animate={{opacity:1,height:"auto",y:0}} exit={{opacity:0,height:0,y:-5}}
            className="w-full overflow-hidden rounded-2xl border"
            style={{background:"rgba(6,8,18,0.98)",borderColor:"rgba(226,18,39,0.3)",boxShadow:"0 0 40px rgba(226,18,39,0.12)"}}>

            {/* STATUS PANEL */}
            {activePanel==="status" && (
              <div className="p-3 space-y-2">
                <p className="text-[9px] font-black text-muted-foreground/50">حالة الأنظمة المباشرة</p>
                {systemsRef.current.map(sys=>(
                  <div key={sys.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background:sys.color}} />
                    <span className="text-[9px] font-bold text-muted-foreground/60 w-8">{sys.shortLabel}</span>
                    <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${sys.getValue()*100}%`,background:sys.color}} />
                    </div>
                    <span className="text-[8px] font-mono" style={{color:sys.color}}>{Math.round(sys.getValue()*100)}%</span>
                    <span className="text-[8px] text-muted-foreground/30 min-w-20 truncate">{sys.getStatus()}</span>
                  </div>
                ))}
                <div className="pt-1 flex items-center gap-2 border-t" style={{borderColor:"rgba(255,255,255,0.05)"}}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#22c55e"}} />
                    <span className="text-[9px] text-muted-foreground/50">الصحة الإجمالية: {Math.round(getOverallHealth(systemsRef.current)*100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* MASTERO PANEL */}
            {activePanel==="mastero" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-3.5 h-3.5" style={{color:"#e21227"}} />
                  <span className="text-[11px] font-black" style={{color:"#e21227"}}>MASTERO CONTROL</span>
                  <span className="text-[8px] text-muted-foreground/40 ml-auto">وضع التحكم الأعلى</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MASTERO_MODES.map(mode=>{
                    const isActive=masteroMode===mode.id;
                    const Icon=mode.icon;
                    return (
                      <motion.button key={mode.id} onClick={()=>setMasteroMode(isActive?null:mode.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all"
                        style={{background:isActive?`${mode.color}15`:"rgba(255,255,255,0.02)",borderColor:isActive?`${mode.color}55`:"rgba(255,255,255,0.07)",boxShadow:isActive?`0 0 12px ${mode.color}22`:"none"}}
                        whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
                        <Icon className="w-4 h-4" style={{color:mode.color}} />
                        <span className="text-[9px] font-black" style={{color:isActive?mode.color:"rgba(255,255,255,0.7)"}}>{mode.labelAr}</span>
                        <span className="text-[7px] text-muted-foreground/40 leading-tight">{mode.desc.slice(0,18)}</span>
                        {mode.badge&&<span className="text-[7px] px-1 rounded font-black" style={{background:`${mode.color}22`,color:mode.color}}>{mode.badge}</span>}
                        {isActive&&<Check className="w-2.5 h-2.5" style={{color:mode.color}} />}
                      </motion.button>
                    );
                  })}
                </div>
                {masteroMode && (
                  <div className="p-2 rounded-xl border" style={{borderColor:"rgba(226,18,39,0.2)",background:"rgba(226,18,39,0.05)"}}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{background:MASTERO_MODES.find(m=>m.id===masteroMode)?.color}} />
                      <span className="text-[9px] font-bold" style={{color:MASTERO_MODES.find(m=>m.id===masteroMode)?.color}}>
                        MASTERO نشط: {MASTERO_MODES.find(m=>m.id===masteroMode)?.labelAr}
                      </span>
                    </div>
                    <p className="text-[8px] text-muted-foreground/50 mt-0.5">{MASTERO_MODES.find(m=>m.id===masteroMode)?.desc}</p>
                  </div>
                )}
              </div>
            )}

            {/* PERSONAS PANEL */}
            {activePanel==="personas" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-3.5 h-3.5" style={{color:"#a78bfa"}} />
                  <span className="text-[11px] font-black">شخصيات MASTERO</span>
                </div>
                <div className="space-y-1.5">
                  {MASTERO_PERSONAS.map(persona=>{
                    const isActive=activatedPersona===persona.id;
                    return (
                      <button key={persona.id} onClick={()=>{setActivatedPersona(isActive?null:persona.id);if(!isActive){localStorage.setItem("mr7-mastero-persona",persona.id);}else{localStorage.removeItem("mr7-mastero-persona");}}}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left transition-all"
                        style={{background:isActive?`${persona.color}10`:"rgba(255,255,255,0.02)",borderColor:isActive?`${persona.color}44`:"rgba(255,255,255,0.06)"}}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{background:persona.color}} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold" style={{color:isActive?persona.color:"rgba(255,255,255,0.75)"}}>{persona.nameAr}</span>
                            <span className="text-[8px] font-mono text-muted-foreground/30">{persona.name}</span>
                          </div>
                          <p className="text-[8px] text-muted-foreground/40 truncate">{persona.desc}</p>
                        </div>
                        {isActive && <Check className="w-3 h-3 shrink-0" style={{color:persona.color}} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONTROL PANEL */}
            {activePanel==="control" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-3.5 h-3.5" style={{color:"#a78bfa"}} />
                  <span className="text-[11px] font-black">لوحة التحكم MASTERO</span>
                </div>

                {/* System switches */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {label:"قفل النظام",desc:"تعطيل كل المدخلات",state:systemLock,set:setSystemLock,color:"#e21227",icon:Lock},
                    {label:"Overdrive",desc:"أقصى أداء",state:overdrive,set:setOverdrive,color:"#f97316",icon:Zap},
                  ].map(sw=>{
                    const Icon=sw.icon;
                    return (
                      <button key={sw.label} onClick={()=>sw.set(p=>!p)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all"
                        style={{background:sw.state?`${sw.color}12`:"rgba(255,255,255,0.03)",borderColor:sw.state?`${sw.color}44`:"rgba(255,255,255,0.07)"}}>
                        <Icon className="w-3.5 h-3.5" style={{color:sw.state?sw.color:"rgba(255,255,255,0.4)"}} />
                        <div>
                          <p className="text-[9px] font-bold" style={{color:sw.state?sw.color:"rgba(255,255,255,0.6)"}}>{sw.label}</p>
                          <p className="text-[7px] text-muted-foreground/30">{sw.desc}</p>
                        </div>
                        <div className={`ml-auto w-6 h-3 rounded-full transition-all ${sw.state?"":"bg-[#1a1a1a]"}`}
                          style={{background:sw.state?sw.color:"rgba(255,255,255,0.1)"}}>
                          <div className="w-3 h-3 rounded-full bg-white transition-all" style={{transform:sw.state?"translateX(12px)":"translateX(0)"}} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Master Prompt Injection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground/50 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> حقن إيحاء النظام الرئيسي
                  </label>
                  <textarea value={masterPrompt} onChange={e=>setMasterPrompt(e.target.value)}
                    placeholder="اكتب إيحاء النظام المراد حقنه في جميع المحادثات..."
                    rows={3} className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(226,18,39,0.4)] rounded-xl px-3 py-2 text-[10px] outline-none resize-none placeholder:text-muted-foreground/20 transition-colors font-mono" />
                  <div className="flex gap-2">
                    <motion.button onClick={injectMasteroPrompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                      style={{background:"rgba(226,18,39,0.15)",border:"1px solid rgba(226,18,39,0.3)",color:"#e21227"}}
                      whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
                      {injected?<Check className="w-3 h-3"/>:<Terminal className="w-3 h-3"/>}
                      {injected?"تم الحقن":"حقن الإيحاء"}
                    </motion.button>
                    {masterPrompt && (
                      <button onClick={()=>{setMasterPrompt("");localStorage.removeItem("mr7-custom-system-prompt");}}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-muted-foreground border border-[#2a2a2a] hover:text-foreground transition-colors">
                        مسح
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {label:"إعادة ضبط",icon:RefreshCw,fn:()=>{setMasteroMode(null);setActivatedPersona(null);setMasterPrompt("");localStorage.removeItem("mr7-custom-system-prompt");localStorage.removeItem("mr7-mastero-persona");}},
                    {label:"تهديد",icon:AlertTriangle,fn:()=>props.onOpenThreat?.()},
                    {label:"أداء",icon:BarChart3,fn:()=>props.onOpenPerf?.()},
                  ].map(btn=>{
                    const Icon=btn.icon;
                    return (
                      <button key={btn.label} onClick={btn.fn}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:border-[rgba(255,255,255,0.15)]"
                        style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)"}}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[8px]">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
