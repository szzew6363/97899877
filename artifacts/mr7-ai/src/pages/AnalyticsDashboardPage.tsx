/**
 * AnalyticsDashboardPage — 3D Holographic Analytics with Charts
 * Token usage · model performance · latency · cost tracking · 3D bar charts
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart2, X, RefreshCw, TrendingUp, Zap, Clock, DollarSign, Brain, Activity } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface DailyUsage { label: string; value: number }
interface ModelUsage { model: string; tokens: number; requests: number; color: string }
interface Totals { tokens: number; requests: number; cost: number; avgLatency: number }

function hexRgb(h: string) { const v = parseInt(h.replace("#",""),16); return `${(v>>16)&255},${(v>>8)&255},${v&255}`; }

function Bar3D({ data, maxVal, color }: { data: DailyUsage[]; maxVal: number; color: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const canvas = cv;
    const ctx = canvas.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio||1,2);
    canvas.width=canvas.offsetWidth*DPR; canvas.height=canvas.offsetHeight*DPR;
    canvas.style.width=canvas.offsetWidth+"px"; canvas.style.height=canvas.offsetHeight+"px";
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(DPR,DPR);
    const rgb=hexRgb(color); const disp=data.slice(-24); let t=0;
    function draw() {
      t=Math.min(t+0.045,1);
      const W=canvas.offsetWidth,H=canvas.offsetHeight; ctx.clearRect(0,0,W,H);
      const pad={l:28,r:8,t:8,b:26}; const cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
      const gW=cW/(disp.length||1); const bW=gW*0.68; const dp=5;
      for(let i=0;i<=4;i++){const y=pad.t+cH-(cH/4)*i;ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.setLineDash([]);
        if(i>0){const v=(maxVal/4)*i;ctx.fillStyle="rgba(255,255,255,0.18)";ctx.font="7px Inter";ctx.textAlign="right";ctx.fillText(v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1000?`${(v/1000).toFixed(0)}K`:String(Math.round(v)),pad.l-2,y+3);}}
      disp.forEach((d,i)=>{
        const pct=maxVal>0?d.value/maxVal:0; const bh=cH*pct*t;
        const bx=pad.l+gW*i+(gW-bW)/2; const by=pad.t+cH-bh;
        if(bh<1)return;
        ctx.fillStyle=`rgba(${rgb},0.12)`;ctx.beginPath();ctx.moveTo(bx,by+bh);ctx.lineTo(bx+dp,by+bh+dp*0.6);ctx.lineTo(bx+bW+dp,by+bh+dp*0.6);ctx.lineTo(bx+bW,by+bh);ctx.closePath();ctx.fill();
        const sg=ctx.createLinearGradient(bx+bW,by,bx+bW+dp,by+bh);sg.addColorStop(0,`rgba(${rgb},0.5)`);sg.addColorStop(1,`rgba(${rgb},0.08)`);ctx.fillStyle=sg;ctx.beginPath();ctx.moveTo(bx+bW,by);ctx.lineTo(bx+bW+dp,by-dp*0.5);ctx.lineTo(bx+bW+dp,by+bh+dp*0.6);ctx.lineTo(bx+bW,by+bh);ctx.closePath();ctx.fill();
        const mg=ctx.createLinearGradient(bx,by,bx,by+bh);mg.addColorStop(0,`rgba(${rgb},0.95)`);mg.addColorStop(0.5,`rgba(${rgb},0.65)`);mg.addColorStop(1,`rgba(${rgb},0.15)`);ctx.fillStyle=mg;ctx.fillRect(bx,by,bW,bh);
        ctx.fillStyle=`rgba(${rgb},0.8)`;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+dp,by-dp*0.5);ctx.lineTo(bx+bW+dp,by-dp*0.5);ctx.lineTo(bx+bW,by);ctx.closePath();ctx.fill();
        if(pct>0.55){ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=`rgba(${rgb},0.5)`;ctx.fillRect(bx,by,bW,2);ctx.shadowBlur=0;}
        if(disp.length<=12||i%Math.ceil(disp.length/8)===0){ctx.fillStyle="rgba(255,255,255,0.22)";ctx.font="7px Inter";ctx.textAlign="center";ctx.fillText(d.label.slice(-5),bx+bW/2,H-pad.b+10);}
      });
      if(disp.length>1){ctx.strokeStyle=`rgba(${rgb},0.55)`;ctx.lineWidth=1.5;ctx.lineJoin="round";ctx.shadowColor=color;ctx.shadowBlur=8;ctx.beginPath();disp.forEach((d,i)=>{const pct=maxVal>0?d.value/maxVal:0;const x=pad.l+gW*i+gW/2;const y=pad.t+cH-cH*pct*t;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();ctx.shadowBlur=0;}
      if(t<1)rafRef.current=requestAnimationFrame(draw);
    }
    draw();
    return()=>cancelAnimationFrame(rafRef.current);
  },[data,maxVal,color]);
  return <canvas ref={cvRef} className="w-full" style={{height:118}} />;
}

function RadialGauge({value,max,color,label,size=104}:{value:number;max:number;color:string;label:string;size?:number}) {
  const cvRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=cvRef.current;if(!cv)return;
    const canvas=cv;
    const ctx=canvas.getContext("2d")!;const DPR=Math.min(window.devicePixelRatio||1,2);
    canvas.width=size*DPR;canvas.height=size*DPR;canvas.style.width=size+"px";canvas.style.height=size+"px";ctx.scale(DPR,DPR);
    const cx=size/2,cy=size/2,r=size*0.38;const pct=max>0?Math.min(value/max,1):0;
    const sa=-Math.PI*0.75,ea=sa+Math.PI*1.5;let t=0;let raf=0;
    function draw(){
      t=Math.min(t+0.04,1);ctx.clearRect(0,0,size,size);
      ctx.beginPath();ctx.arc(cx,cy,r,sa,ea);ctx.strokeStyle="rgba(255,255,255,0.06)";ctx.lineWidth=7;ctx.lineCap="round";ctx.stroke();
      if(pct>0){const ce=sa+(ea-sa)*pct*t;const gr=ctx.createLinearGradient(cx-r,cy,cx+r,cy);gr.addColorStop(0,color+"88");gr.addColorStop(1,color);ctx.beginPath();ctx.arc(cx,cy,r,sa,ce);ctx.strokeStyle=gr;ctx.lineWidth=7;ctx.lineCap="round";ctx.shadowColor=color;ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;}
      ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font=`bold ${Math.round(size*0.155)}px Inter`;ctx.fillText(max>0?`${Math.round(pct*100*t)}%`:"∞",cx,cy+4);ctx.fillStyle="rgba(255,255,255,0.38)";ctx.font=`${Math.round(size*0.095)}px Inter`;ctx.fillText(label,cx,cy+size*0.19);
      if(t<1)raf=requestAnimationFrame(draw);
    }
    draw();return()=>cancelAnimationFrame(raf);
  },[value,max,color,label,size]);
  return <canvas ref={cvRef} />;
}

function mockDaily(days: number): DailyUsage[] {
  return Array.from({length:days},(_,i)=>{
    const d=new Date(Date.now()-86400000*(days-1-i));
    return{label:`${d.getMonth()+1}/${d.getDate()}`,value:Math.floor(Math.random()*80000+20000)};
  });
}
function mockModels(): ModelUsage[] {
  return [
    {model:"CHAT-GPT Fast",tokens:450000,requests:890,color:"#e21227"},
    {model:"GPT-4o",tokens:280000,requests:340,color:"#3b82f6"},
    {model:"Claude 3.5",tokens:190000,requests:220,color:"#8b5cf6"},
    {model:"Gemini Pro",tokens:120000,requests:180,color:"#10b981"},
    {model:"Groq Llama",tokens:88000,requests:150,color:"#f59e0b"},
  ];
}

interface Props{onClose?:()=>void}

export function AnalyticsDashboardPage({onClose}:Props) {
  const [days,setDays]=useState(30);
  const [daily,setDaily]=useState<DailyUsage[]>(()=>mockDaily(30));
  const [models,setModels]=useState<ModelUsage[]>(()=>mockModels());
  const [totals,setTotals]=useState<Totals|null>({tokens:1247000,requests:1780,cost:47.2,avgLatency:834});
  const [loading,setLoading]=useState(false);
  const pingRef=useRef<ReturnType<typeof setInterval>|undefined>(undefined);

  const load=useCallback(async()=>{
    setLoading(true);
    try{const res=await authFetch(`/api/analytics/me?days=${days}`);if(res.ok){const d=await res.json() as{daily?:DailyUsage[];topModels?:ModelUsage[];totals?:Totals};setDaily(d.daily?.length?d.daily:mockDaily(days));setModels(d.topModels?.length?d.topModels:mockModels());setTotals(d.totals||null);}else{setDaily(mockDaily(days));setModels(mockModels());}}
    catch{setDaily(mockDaily(days));setModels(mockModels());}finally{setLoading(false);}
  },[days]);

  useEffect(()=>{load();},[load]);

  const maxVal=Math.max(...daily.map(d=>d.value),1);
  const totalTokens=totals?.tokens||daily.reduce((s,d)=>s+d.value,0);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at 25% 15%,rgba(226,18,39,.05) 0%,transparent 50%)"}}/>
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center"><BarChart2 className="w-5 h-5 text-red-400"/></div>
          <div><h2 className="text-base font-bold text-white">لوحة التحليلات — 3D</h2><p className="text-xs text-zinc-600">{totalTokens>=1e6?`${(totalTokens/1e6).toFixed(2)}M`:totalTokens>=1000?`${(totalTokens/1000).toFixed(0)}K`:totalTokens} توكن · {days} يوم</p></div>
        </div>
        <div className="flex items-center gap-2">
          {[7,14,30,90].map(d=>(
            <button key={d} onClick={()=>setDays(d)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${days===d?"bg-red-500/20 border border-red-500/25 text-red-400":"text-zinc-500 hover:text-zinc-300"}`}>{d}د</button>
          ))}
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/></button>
          {onClose&&<button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4"/></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {totals&&(
          <div className="grid grid-cols-4 gap-3">
            {[{l:"التوكن",v:totals.tokens>=1e6?`${(totals.tokens/1e6).toFixed(1)}M`:`${(totals.tokens/1000).toFixed(0)}K`,c:"#e21227",i:Zap},{l:"الطلبات",v:String(totals.requests),c:"#3b82f6",i:Activity},{l:"التكلفة",v:`$${totals.cost.toFixed(1)}`,c:"#10b981",i:DollarSign},{l:"زمن الاستجابة",v:`${totals.avgLatency}ms`,c:"#8b5cf6",i:Clock}].map(({l,v,c,i:Icon})=>(
              <div key={l} className="p-3.5 rounded-xl border" style={{background:`${c}0d`,borderColor:`${c}20`}}>
                <Icon className="w-4 h-4 mb-1.5" style={{color:c}}/>
                <p className="text-xl font-black text-white">{v}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        )}
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-red-400"/>التوكن اليومية — 3D Bar Chart</p>
          <Bar3D data={daily} maxVal={maxVal} color="#e21227"/>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {models.slice(0,3).map(m=>(
            <div key={m.model} className="p-3.5 rounded-xl bg-white/3 border border-white/6 flex flex-col items-center gap-2">
              <RadialGauge value={m.tokens} max={totalTokens} color={m.color} label={m.model.slice(0,8)} size={88}/>
              <p className="text-[10px] text-zinc-500">{m.requests} طلب</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-400"/>استخدام النماذج</p>
          <div className="space-y-2">
            {models.map(m=>{const pct=totalTokens>0?m.tokens/totalTokens:0;return(
              <div key={m.model} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-28 flex-shrink-0">{m.model}</span>
                <div className="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{backgroundColor:m.color}} animate={{width:`${pct*100}%`}} transition={{duration:0.8}}/>
                </div>
                <span className="text-[10px] text-zinc-500 w-10 text-left">{Math.round(pct*100)}%</span>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}
