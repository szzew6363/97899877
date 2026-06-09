import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Server, Clock, ChevronDown, ChevronUp, GripHorizontal, Wifi, Database, X } from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═════════════════════════════════════════════════════════════════════
   NETWORK TRAFFIC ANALYZER — Ultra 3D Live API Call Visualizer v2
   Isometric 3D bars · Particle flow · Multi-channel waveform
═════════════════════════════════════════════════════════════════════ */

const W = 360; const H = 220;

function providerColor(p: string): string {
  const m: Record<string,string> = {
    openai:"#00e5ff",personal:"#00e5ff",anthropic:"#a78bfa",
    groq:"#22c55e",gemini:"#f59e0b",openrouter:"#fb923c",custom:"#e879f9",
  };
  return m[p.toLowerCase()] ?? "#00e5ff";
}
function shortModel(m: string): string {
  return m.replace("CHAT-GPT ","").replace("gpt-","GPT-").slice(0,13);
}

interface FlowParticle { x:number; y:number; vx:number; vy:number; life:number; color:string; size:number }

export function NetworkTrafficPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-traffic-panel-pos", { x: Math.max(0,window.innerWidth-380), y: 80 }
  );
  const [calls, setCalls]           = useState<TrafficEvent[]>([]);
  const [totalTokens, setTotalTokens] = useState(0);
  const [avgLatency, setAvgLatency]   = useState(0);
  const [callsPerMin, setCallsPerMin] = useState(0);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const histRef    = useRef<TrafficEvent[]>([]);
  const tickRef    = useRef(0);
  const cpmBuckets = useRef<number[]>([]);
  const particlesRef = useRef<FlowParticle[]>([]);

  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      histRef.current = trafficBus.history.slice(0,24);
      setCalls([...histRef.current]);
      const done = histRef.current.filter(e=>e.status==="success");
      setTotalTokens(done.reduce((s,e)=>s+(e.tokens??0),0));
      const lats = done.filter(e=>e.latency!=null).map(e=>e.latency!);
      setAvgLatency(lats.length?Math.round(lats.reduce((a,b)=>a+b,0)/lats.length):0);
      cpmBuckets.current.push(Date.now());
      cpmBuckets.current = cpmBuckets.current.filter(t=>t>Date.now()-60000);
      setCallsPerMin(cpmBuckets.current.length);
      // Spawn particles
      const c = providerColor(ev.provider||"default");
      for(let i=0;i<6;i++){
        particlesRef.current.push({
          x: Math.random()*W, y: H*0.55,
          vx:(Math.random()-0.5)*2, vy:-Math.random()*2-0.5,
          life:1, color:c, size:Math.random()*2+1,
        });
      }
    });
    return unsub;
  },[]);

  useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return;
    const ctx = cv.getContext("2d")!;

    function frame(){
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0,0,W,H);

      // Background
      ctx.fillStyle="rgba(2,6,18,0.98)"; ctx.fillRect(0,0,W,H);

      // Grid overlay
      ctx.strokeStyle="rgba(0,229,255,0.04)"; ctx.lineWidth=0.5;
      for(let gx=0;gx<W;gx+=30){ ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,H); ctx.stroke(); }
      for(let gy=0;gy<H;gy+=20){ ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(W,gy); ctx.stroke(); }

      // Isometric 3D bar chart
      const providers = new Map<string,{count:number;tokens:number;latency:number;color:string}>();
      histRef.current.forEach(e=>{
        const k = e.provider||"default";
        const c = providers.get(k) ?? {count:0,tokens:0,latency:0,color:providerColor(k)};
        c.count++; c.tokens+=(e.tokens??0);
        if(e.latency) c.latency = Math.max(c.latency,e.latency);
        providers.set(k,c);
      });

      const pArr = [...providers.entries()];
      const maxCount = Math.max(1,...pArr.map(([,v])=>v.count));
      const barW = 28; const barGap = 10;
      const baseY = H*0.72;
      const isoAngle = Math.PI/6;
      const isoX = Math.cos(isoAngle); const isoY = Math.sin(isoAngle);
      const startX = (W - pArr.length*(barW+barGap))/2;

      pArr.forEach(([,v],i)=>{
        const barH = (v.count/maxCount)*(H*0.38) + 4;
        const bx = startX + i*(barW+barGap);
        const topY = baseY - barH;
        const pulse = 0.8 + 0.2*Math.sin(t*0.05+i*1.2);
        const color = v.color;
        const depth = 10;

        // ISO top face
        ctx.beginPath();
        ctx.moveTo(bx, topY);
        ctx.lineTo(bx+barW, topY);
        ctx.lineTo(bx+barW+depth*isoX, topY-depth*isoY);
        ctx.lineTo(bx+depth*isoX, topY-depth*isoY);
        ctx.closePath();
        const topFill = ctx.createLinearGradient(bx,topY,bx+barW+depth*isoX,topY-depth*isoY);
        topFill.addColorStop(0,color+"cc"); topFill.addColorStop(1,color+"88");
        ctx.fillStyle=topFill; ctx.fill();

        // ISO right face
        ctx.beginPath();
        ctx.moveTo(bx+barW, topY);
        ctx.lineTo(bx+barW, baseY);
        ctx.lineTo(bx+barW+depth*isoX, baseY-depth*isoY);
        ctx.lineTo(bx+barW+depth*isoX, topY-depth*isoY);
        ctx.closePath();
        const rightFill = ctx.createLinearGradient(bx+barW,topY,bx+barW+depth*isoX,topY);
        rightFill.addColorStop(0,color+"44"); rightFill.addColorStop(1,color+"22");
        ctx.fillStyle=rightFill; ctx.fill();

        // Front face with gradient
        const barGrad = ctx.createLinearGradient(bx,topY,bx,baseY);
        barGrad.addColorStop(0,color+"ee");
        barGrad.addColorStop(0.4,color+"bb");
        barGrad.addColorStop(1,color+"33");
        ctx.fillStyle=barGrad;
        ctx.fillRect(bx,topY,barW,barH);

        // Glow
        const glw=ctx.createRadialGradient(bx+barW/2,topY,0,bx+barW/2,topY,barW);
        glw.addColorStop(0,color+"66"); glw.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=glw; ctx.beginPath(); ctx.arc(bx+barW/2,topY,barW,0,Math.PI*2); ctx.fill();

        // Scan line on bar
        const scanY=topY+((t*1.5)%barH);
        ctx.beginPath(); ctx.moveTo(bx,scanY); ctx.lineTo(bx+barW,scanY);
        ctx.strokeStyle=color+"88"; ctx.lineWidth=0.7; ctx.stroke();

        // Label
        ctx.fillStyle=color; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.globalAlpha=0.9;
        ctx.fillText(v.color===color?(Object.keys(Object.fromEntries(providers))[i]||"?").slice(0,4).toUpperCase():"?",bx+barW/2,baseY+11);
        ctx.fillText(`${v.count}`,bx+barW/2,topY-12);
        ctx.globalAlpha=1;
      });

      // Base line
      ctx.beginPath(); ctx.moveTo(0,baseY+0.5); ctx.lineTo(W,baseY+0.5);
      ctx.strokeStyle="rgba(0,229,255,0.2)"; ctx.lineWidth=0.8; ctx.stroke();

      // Multi-channel waveform
      const waveBaseY = H*0.9;
      for(let ch=0;ch<3;ch++){
        const amp   = [8,5,3][ch];
        const freq  = [0.06,0.11,0.19][ch];
        const speed = [0.03,0.06,0.1][ch];
        const clr   = ["#e21227","#00e5ff","#a78bfa"][ch];
        const alp   = [0.9,0.5,0.3][ch];
        ctx.beginPath(); ctx.strokeStyle=clr; ctx.globalAlpha=alp; ctx.lineWidth=ch===0?1.5:0.8;
        for(let px=0;px<W;px+=2){
          const y=waveBaseY+Math.sin(px*freq+t*speed)*amp+Math.sin(px*freq*2.3+t*speed*1.8)*(amp*0.5);
          px===0?ctx.moveTo(px,y):ctx.lineTo(px,y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha=1;

      // Particles
      particlesRef.current = particlesRef.current.filter(p=>p.life>0.02);
      particlesRef.current.forEach(p=>{
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.globalAlpha=p.life*0.8; ctx.fill();
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.life*=0.94;
      });
      ctx.globalAlpha=1;

      // HUD corner text
      ctx.fillStyle="rgba(0,229,255,0.5)"; ctx.font="bold 7px monospace"; ctx.textAlign="left";
      ctx.fillText(`${callsPerMin}/min  ${avgLatency}ms avg`,4,H-18);
    }
    frame();
    return ()=>cancelAnimationFrame(frameRef.current);
  },[callsPerMin,avgLatency]);

  return (
    <div ref={rootRef} style={{left:pos.x,top:pos.y}} className="fixed z-[96] w-[360px] select-none">
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.1)]"
        style={{background:"rgba(2,6,18,0.97)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}>
          <Activity size={11} className="text-[#00e5ff]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#00e5ff]">NETWORK TRAFFIC</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#f59e0b]">{totalTokens.toLocaleString()} TKN</span>
            <span className="text-[9px] font-mono text-[#555]">{avgLatency}ms</span>
            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1.5,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
            <button onClick={()=>setCollapsed(c=>!c)} className="text-[#555] hover:text-white">
              {collapsed?<ChevronDown size={11}/>:<ChevronUp size={11}/>}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed&&(
            <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden">
              <canvas ref={canvasRef} width={W} height={H} className="block w-full" />
              <div className="border-t border-[#1f1f1f] overflow-y-auto max-h-[100px]">
                {calls.slice(0,6).map(ev=>(
                  <div key={ev.id} className="flex items-center gap-2 px-2 py-1 border-b border-[#111] text-[9px] font-mono hover:bg-[#111]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:providerColor(ev.provider)}} />
                    <span className="text-[#555] shrink-0">{new Date(ev.startTime).toLocaleTimeString()}</span>
                    <span className="truncate text-[#888]" style={{color:providerColor(ev.provider)}}>{shortModel(ev.model)}</span>
                    <span className="ml-auto shrink-0" style={{color:ev.status==="success"?"#22c55e":ev.status==="error"?"#e21227":"#f59e0b"}}>
                      {ev.latency?`${ev.latency}ms`:ev.status.toUpperCase()}
                    </span>
                  </div>
                ))}
                {calls.length===0&&(
                  <div className="text-center py-3 text-[9px] font-mono text-[#333]">AWAITING API CALLS...</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
