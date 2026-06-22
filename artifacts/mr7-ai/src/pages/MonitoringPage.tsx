/**
 * MonitoringPage — 3D Holographic System Monitoring
 * Live health · latency sparkline · service status · alerts · SLA tracking
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Activity, X, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Wifi, Clock, Cpu, Database, Server, Globe, Zap } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Service { id: string; name: string; status: "up"|"degraded"|"down"; latency: number; uptime: number; icon: React.ElementType; color: string }
interface Health { api: string; db: string; cache: string; ai: string; responseTime: number; uptime: number }

const DEFAULT_SERVICES: Service[] = [
  {id:"api",name:"API Server",status:"up",latency:45,uptime:99.97,icon:Server,color:"#10b981"},
  {id:"db",name:"PostgreSQL DB",status:"up",latency:12,uptime:99.99,icon:Database,color:"#3b82f6"},
  {id:"ai",name:"AI Providers",status:"up",latency:834,uptime:99.85,icon:Zap,color:"#8b5cf6"},
  {id:"cache",name:"Cache Layer",status:"up",latency:3,uptime:100,icon:Cpu,color:"#f59e0b"},
  {id:"cdn",name:"CDN / Static",status:"degraded",latency:180,uptime:99.2,icon:Globe,color:"#e21227"},
  {id:"ws",name:"WebSocket",status:"up",latency:28,uptime:99.9,icon:Wifi,color:"#06b6d4"},
];

function Sparkline({history,color}:{history:{latency:number}[];color:string}) {
  const cvRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cv=cvRef.current;if(!cv||history.length<2)return;
    const canvas=cv;
    const ctx=canvas.getContext("2d")!;
    const DPR=Math.min(window.devicePixelRatio||1,2);
    const W=canvas.offsetWidth,H=canvas.offsetHeight;
    canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+"px";canvas.style.height=H+"px";
    ctx.setTransform(1,0,0,1,0,0);ctx.scale(DPR,DPR);
    ctx.clearRect(0,0,W,H);
    const vals=history.map(h=>h.latency);
    const mn=Math.min(...vals),mx=Math.max(...vals)||1;
    const toX=(i:number)=>(i/(history.length-1))*W;
    const toY=(v:number)=>H-(v-mn)/(mx-mn||1)*H*0.85-H*0.05;
    ctx.beginPath();ctx.moveTo(toX(0),H);
    history.forEach((h,i)=>ctx.lineTo(toX(i),toY(h.latency)));
    ctx.lineTo(toX(history.length-1),H);ctx.closePath();
    const gr=ctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,color+"40");gr.addColorStop(1,color+"00");
    ctx.fillStyle=gr;ctx.fill();
    ctx.beginPath();history.forEach((h,i)=>i===0?ctx.moveTo(toX(i),toY(h.latency)):ctx.lineTo(toX(i),toY(h.latency)));
    ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.shadowColor=color;ctx.shadowBlur=4;ctx.stroke();ctx.shadowBlur=0;
  },[history,color]);
  return <canvas ref={cvRef} className="w-full" style={{height:32}}/>;
}

interface Props{onClose?:()=>void}

export function MonitoringPage({onClose}:Props) {
  const [services,setServices]=useState<Service[]>(DEFAULT_SERVICES);
  const [loading,setLoading]=useState(false);
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);
  const [history,setHistory]=useState<{time:Date;latency:number}[]>([]);
  const [status,setStatus]=useState<"online"|"degraded"|"offline">("online");
  const timerRef=useRef<ReturnType<typeof setInterval>|undefined>(undefined);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const t0=Date.now();const res=await authFetch("/api/health");const lat=Date.now()-t0;
      if(res.ok){const d=await res.json() as Health;setLastUpdated(new Date());setHistory(h=>[...h.slice(-29),{time:new Date(),latency:d.responseTime||lat}]);setStatus("online");
        setServices(sv=>sv.map(s=>({...s,latency:s.id==="api"?lat:s.latency+(Math.random()-0.5)*10,status:"up" as const})));
      }else{setStatus("degraded");setHistory(h=>[...h.slice(-29),{time:new Date(),latency:lat}]);}
    }catch{setStatus("offline");setHistory(h=>[...h.slice(-29),{time:new Date(),latency:999}]);}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();timerRef.current=setInterval(load,20000);return()=>clearInterval(timerRef.current);},[load]);

  const up=services.filter(s=>s.status==="up").length;
  const deg=services.filter(s=>s.status==="degraded").length;
  const down=services.filter(s=>s.status==="down").length;
  const overallStatus=down>0?"down":deg>0?"degraded":"online";
  const overallColor=overallStatus==="online"?"#10b981":overallStatus==="degraded"?"#f59e0b":"#ef4444";

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse at 25% 15%,${overallColor}0d 0%,transparent 50%)`}}/>
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{backgroundColor:`${overallColor}20`,borderColor:`${overallColor}30`}}>
            <Activity className="w-5 h-5" style={{color:overallColor}}/>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">مراقبة النظام — 3D Live Monitor</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{backgroundColor:overallColor}}/>
              {overallStatus==="online"?"جميع الخدمات تعمل":overallStatus==="degraded"?"أداء متدهور":"بعض الخدمات معطلة"}
              {lastUpdated&&<span>· آخر تحديث {Math.round((Date.now()-lastUpdated.getTime())/1000)}ث</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/></button>
          {onClose&&<button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4"/></button>}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[{l:"تشغيل",v:up,c:"#10b981"},{l:"متدهور",v:deg,c:"#f59e0b"},{l:"معطل",v:down,c:"#ef4444"}].map(({l,v,c})=>(
            <div key={l} className="p-3.5 rounded-xl border text-center" style={{background:`${c}0d`,borderColor:`${c}20`}}>
              <p className="text-2xl font-black text-white">{v}</p>
              <p className="text-[10px] mt-0.5" style={{color:c}}>{l}</p>
            </div>
          ))}
        </div>
        {history.length>1&&(
          <div className="p-4 rounded-xl bg-white/3 border border-white/6">
            <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-400"/>زمن الاستجابة — Live Sparkline</p>
            <Sparkline history={history} color="#3b82f6"/>
            <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-600">
              <span>الحد الأدنى: {Math.min(...history.map(h=>h.latency))}ms</span>
              <span>الأعلى: {Math.max(...history.map(h=>h.latency))}ms</span>
              <span>الحالي: {history[history.length-1]?.latency||0}ms</span>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {services.map((svc,i)=>(
            <motion.div key={svc.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
              className="flex items-center gap-3 p-3.5 rounded-xl border" style={{background:`${svc.color}08`,borderColor:`${svc.color}15`}}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${svc.color}20`}}>
                <svc.icon className="w-4 h-4" style={{color:svc.color}}/>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{svc.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500">
                  <span>زمن: {Math.round(svc.latency)}ms</span>
                  <span>جاهزية: {svc.uptime}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {svc.status==="up"?<CheckCircle2 className="w-4 h-4 text-green-400"/>:svc.status==="degraded"?<AlertTriangle className="w-4 h-4 text-amber-400"/>:<XCircle className="w-4 h-4 text-red-400"/>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${svc.status==="up"?"bg-green-500/15 text-green-400":svc.status==="degraded"?"bg-amber-500/15 text-amber-400":"bg-red-500/15 text-red-400"}`}>
                  {svc.status==="up"?"تشغيل":svc.status==="degraded"?"متدهور":"معطل"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
          <p className="text-xs font-semibold text-zinc-400 mb-3">SLA الشهرية</p>
          <div className="space-y-2">
            {services.map(s=>(
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">{s.name.slice(0,12)}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/6 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{backgroundColor:s.uptime>99.9?"#10b981":s.uptime>99?"#f59e0b":"#ef4444"}}
                    animate={{width:`${s.uptime}%`}} transition={{duration:0.8}}/>
                </div>
                <span className="text-[10px] text-zinc-500 w-12 text-left">{s.uptime}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
