import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { GripHorizontal, ChevronUp, ChevronDown, Radio, AlertTriangle, Activity, Wifi, Cpu, Layers } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════════
   NET TOPOLOGY — Ultra 3D Holographic Node Graph v2
   True perspective · Depth fog · Animated packets · Status dynamics
═══════════════════════════════════════════════════════════════════════ */

const W = 340; const H = 260;
const FOV = 400; const VZ = 380;

interface Node3D {
  id:string; label:string; sublabel?:string;
  x:number; y:number; z:number;
  color:string; shape:"circle"|"diamond"|"hexagon"|"square"|"triangle";
  external?:boolean; size:number;
  fp:number; fa:number; // float phase/amplitude
  group:string;
}
interface Link { a:string; b:string }
interface Packet { linkIdx:number; progress:number; speed:number; dir:number; color:string }
interface Arc { src:string; dst:string; progress:number; speed:number; color:string; trail:number[] }
interface NodeState { status:"ok"|"warn"|"compromised"; pulse:number; alertT:number }

const NODES: Node3D[] = [
  { id:"inet",  label:"INTERNET",   x:  0,  y:-88,  z:-35, color:"#444444", shape:"diamond",  external:true, size:7,  fp:0,   fa:3, group:"ext" },
  { id:"fw",    label:"FIREWALL",   x:  0,  y:-48,  z:  0, color:"#22c55e", shape:"diamond",  size:13, fp:0.5,fa:4, group:"net" },
  { id:"rt",    label:"ROUTER",     x:  0,  y: -8,  z: 12, color:"#00e5ff", shape:"circle",   size:12, fp:1.0,fa:5, group:"net" },
  { id:"h1",    label:"HOST-01",    x:-88,  y: 48,  z:-22, color:"#3b82f6", shape:"square",   size:9,  fp:1.5,fa:3, group:"host" },
  { id:"h2",    label:"HOST-02",    x:-30,  y: 68,  z: 22, color:"#3b82f6", shape:"square",   size:9,  fp:2.0,fa:4, group:"host" },
  { id:"h3",    label:"HOST-03",    x: 30,  y: 68,  z: 22, color:"#3b82f6", shape:"square",   size:9,  fp:2.5,fa:4, group:"host" },
  { id:"h4",    label:"HOST-04",    x: 88,  y: 48,  z:-22, color:"#3b82f6", shape:"square",   size:9,  fp:3.0,fa:3, group:"host" },
  { id:"db",    label:"DB-SRV",     x:  0,  y: 85,  z:-12, color:"#a78bfa", shape:"hexagon",  size:12, fp:3.5,fa:5, group:"srv" },
  { id:"atk",   label:"ATTACKER",   x:-130, y:-75,  z:-45, color:"#e21227", shape:"diamond",  external:true, size:10, fp:0.8,fa:6, group:"threat" },
  { id:"c2",    label:"C2-SERVER",  x: 130, y:-75,  z:-45, color:"#ff6b35", shape:"diamond",  external:true, size:10, fp:1.4,fa:6, group:"threat" },
  { id:"api",   label:"API-GW",     x: -55, y: 10,  z: 30, color:"#f59e0b", shape:"hexagon",  size:10, fp:2.2,fa:4, group:"srv" },
  { id:"iot",   label:"IoT-HUB",    x:  55, y: 10,  z: 30, color:"#10b981", shape:"triangle", size:8,  fp:1.8,fa:3, group:"iot" },
  { id:"cdn",   label:"CDN-NODE",   x:  0,  y:-30,  z: 40, color:"#00e5ff", shape:"circle",   size:8,  fp:2.8,fa:3, group:"net" },
  { id:"waf",   label:"WAF",        x:-60,  y:-55,  z: 15, color:"#22c55e", shape:"square",   size:8,  fp:3.2,fa:4, group:"net" },
];

const LINKS: Link[] = [
  {a:"inet",b:"fw"},{a:"fw",b:"rt"},{a:"rt",b:"h1"},{a:"rt",b:"h2"},
  {a:"rt",b:"h3"},{a:"rt",b:"h4"},{a:"rt",b:"db"},{a:"rt",b:"api"},
  {a:"rt",b:"iot"},{a:"fw",b:"cdn"},{a:"fw",b:"waf"},{a:"api",b:"db"},
];

const ATK_TARGETS = ["h1","h2","h3","h4","db","fw","rt","api"];
const STARS = Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*0.9+0.2,a:Math.random()*0.4}));

function getNode(id:string){ return NODES.find(n=>n.id===id)!; }

function project3D(x:number,y:number,z:number,t:number,ry:number,rx2:number){
  const angle = t*0.0025 + ry;
  const c=Math.cos(angle), s=Math.sin(angle);
  const rx2c=Math.cos(rx2), rx2s=Math.sin(rx2);
  const nx = x*c - z*s;
  const nz = x*s + z*c;
  const ny = y*rx2c - nz*rx2s;
  const nz2= y*rx2s + nz*rx2c;
  const fov = FOV/(FOV+nz2+VZ);
  return { sx: W/2+nx*fov, sy: H/2+ny*fov, sz: nz2, scale: fov };
}

function drawShape(ctx:CanvasRenderingContext2D, shape:string, x:number, y:number, r:number){
  ctx.beginPath();
  switch(shape){
    case "diamond":
      ctx.moveTo(x,y-r); ctx.lineTo(x+r,y); ctx.lineTo(x,y+r); ctx.lineTo(x-r,y); ctx.closePath(); break;
    case "hexagon":
      for(let i=0;i<6;i++){ctx.lineTo(x+r*Math.cos(i*Math.PI/3-Math.PI/6),y+r*Math.sin(i*Math.PI/3-Math.PI/6));}
      ctx.closePath(); break;
    case "square":
      ctx.rect(x-r,y-r,r*2,r*2); break;
    case "triangle":
      ctx.moveTo(x,y-r); ctx.lineTo(x+r*0.87,y+r*0.5); ctx.lineTo(x-r*0.87,y+r*0.5); ctx.closePath(); break;
    default: ctx.arc(x,y,r,0,Math.PI*2);
  }
}

export function NetworkTopologyWidget() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const frameRef    = useRef<number>(0);
  const tickRef     = useRef(0);
  const packetsRef  = useRef<Packet[]>([]);
  const arcsRef     = useRef<Arc[]>([]);
  const statesRef   = useRef<Map<string,NodeState>>(new Map(
    NODES.map(n=>([n.id,{status:"ok",pulse:Math.random()*Math.PI*2,alertT:0}]))
  ));
  const manRotRef   = useRef({active:false,ry:0,rx:-0.15,lastX:0,lastY:0,vx:0,vy:0});
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({nodes:NODES.length,links:LINKS.length,threats:0,packets:0});

  const {pos,rootRef,onDragMouseDown,onDragTouchStart} = useDraggable(
    "mr7-topo-pos",{x:Math.max(0,window.innerWidth-380),y:340}
  );

  const onCanvasDown = useCallback((e:React.MouseEvent)=>{
    e.stopPropagation();
    manRotRef.current = {...manRotRef.current,active:true,lastX:e.clientX,lastY:e.clientY,vx:0,vy:0};
    const mm=(ev:MouseEvent)=>{
      const dx=ev.clientX-manRotRef.current.lastX, dy=ev.clientY-manRotRef.current.lastY;
      manRotRef.current.ry+=dx*0.006; manRotRef.current.rx+=dy*0.004;
      manRotRef.current.rx=Math.max(-0.8,Math.min(0.8,manRotRef.current.rx));
      manRotRef.current.vx=dy*0.004; manRotRef.current.vy=dx*0.006;
      manRotRef.current.lastX=ev.clientX; manRotRef.current.lastY=ev.clientY;
    };
    const mu=()=>{ manRotRef.current.active=false; window.removeEventListener("mousemove",mm); window.removeEventListener("mouseup",mu); };
    window.addEventListener("mousemove",mm); window.addEventListener("mouseup",mu);
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;

    // Init packets
    LINKS.forEach((l,li)=>{
      if(Math.random()>0.3){
        packetsRef.current.push({linkIdx:li,progress:Math.random(),speed:0.004+Math.random()*0.004,dir:1,color:"#00e5ff"});
      }
    });

    // Periodic attack sim
    const atkInterval = setInterval(()=>{
      const src=["atk","c2"][Math.floor(Math.random()*2)];
      const dst=ATK_TARGETS[Math.floor(Math.random()*ATK_TARGETS.length)];
      arcsRef.current.push({src,dst,progress:0,speed:0.007+Math.random()*0.005,color:"#e21227",trail:[]});
      const ns=statesRef.current.get(dst);
      if(ns){ ns.status=Math.random()>0.6?"compromised":"warn"; ns.alertT=120; }
      setStats(s=>({...s,threats:s.threats+1}));
    },3000+Math.random()*2000);

    function frame(){
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      const mr = manRotRef.current;
      if(!mr.active){ mr.ry+=0.003; mr.vx*=0.96; mr.vy*=0.96; }

      ctx.clearRect(0,0,W,H);

      // Deep background
      const bg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.7);
      bg.addColorStop(0,"rgba(2,6,18,1)"); bg.addColorStop(0.6,"rgba(1,3,12,1)"); bg.addColorStop(1,"rgba(0,1,6,1)");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // Stars
      STARS.forEach(s=>{
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${s.a})`; ctx.fill();
      });

      // Reference grid
      ctx.strokeStyle="rgba(0,229,255,0.04)"; ctx.lineWidth=0.5;
      for(let gx=-160;gx<=160;gx+=40){
        const p0=project3D(gx,-100,-100,t,mr.ry,mr.rx);
        const p1=project3D(gx,100,-100,t,mr.ry,mr.rx);
        ctx.beginPath(); ctx.moveTo(p0.sx,p0.sy); ctx.lineTo(p1.sx,p1.sy); ctx.stroke();
      }

      // Project all nodes
      const projected = NODES.map(n=>{
        const fy = Math.sin(t*0.012+n.fp)*n.fa;
        const p = project3D(n.x,n.y+fy,n.z,t,mr.ry,mr.rx);
        return {n,p};
      });

      // Draw links
      LINKS.forEach((lk,li)=>{
        const pa=projected.find(p=>p.n.id===lk.a);
        const pb=projected.find(p=>p.n.id===lk.b);
        if(!pa||!pb) return;
        const depth = (pa.p.sz+pb.p.sz)/2;
        const alpha = Math.max(0.05, 0.4 - depth/VZ*0.3);

        // glow tube effect — 3 passes
        [5,2.5,1].forEach((lw,li2)=>{
          ctx.beginPath();
          ctx.moveTo(pa.p.sx,pa.p.sy); ctx.lineTo(pb.p.sx,pb.p.sy);
          ctx.strokeStyle=`rgba(0,229,255,${alpha*(li2===2?1:0.15)})`;
          ctx.lineWidth=lw; ctx.stroke();
        });
      });

      // Draw packets on links
      packetsRef.current.forEach(pk=>{
        const lk=LINKS[pk.linkIdx]; if(!lk) return;
        const pa=projected.find(p=>p.n.id===lk.a);
        const pb=projected.find(p=>p.n.id===lk.b);
        if(!pa||!pb) return;
        const t2=pk.dir>0?pk.progress:1-pk.progress;
        const px=pa.p.sx+(pb.p.sx-pa.p.sx)*t2;
        const py=pa.p.sy+(pb.p.sy-pa.p.sy)*t2;

        const pg=ctx.createRadialGradient(px,py,0,px,py,5);
        pg.addColorStop(0,"rgba(255,255,255,0.9)"); pg.addColorStop(0.4,pk.color);
        pg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();

        pk.progress+=pk.speed;
        if(pk.progress>=1){ pk.progress=0; pk.dir*=-1; }
      });

      // Draw attack arcs
      arcsRef.current = arcsRef.current.filter(a=>a.progress<=1.05);
      arcsRef.current.forEach(arc=>{
        const srcN=projected.find(p=>p.n.id===arc.src);
        const dstN=projected.find(p=>p.n.id===arc.dst);
        if(!srcN||!dstN) return;
        arc.trail.unshift(arc.progress);
        if(arc.trail.length>14) arc.trail.pop();

        arc.trail.forEach((tp,ti)=>{
          const px=srcN.p.sx+(dstN.p.sx-srcN.p.sx)*tp;
          const py=srcN.p.sy+(dstN.p.sy-srcN.p.sy)*tp - Math.sin(tp*Math.PI)*20;
          ctx.beginPath(); ctx.arc(px,py,2*(1-ti/arc.trail.length),0,Math.PI*2);
          ctx.fillStyle=arc.color; ctx.globalAlpha=(1-ti/arc.trail.length)*0.7; ctx.fill();
        });
        ctx.globalAlpha=1;
        const px=srcN.p.sx+(dstN.p.sx-srcN.p.sx)*arc.progress;
        const py=srcN.p.sy+(dstN.p.sy-srcN.p.sy)*arc.progress - Math.sin(arc.progress*Math.PI)*20;
        const ag=ctx.createRadialGradient(px,py,0,px,py,8);
        ag.addColorStop(0,"#fff"); ag.addColorStop(0.3,"#e21227"); ag.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(px,py,8,0,Math.PI*2); ctx.fill();
        arc.progress+=arc.speed;
      });

      // Draw nodes (depth sorted)
      projected.sort((a,b)=>a.p.sz-b.p.sz).forEach(({n,p})=>{
        const ns=statesRef.current.get(n.id)!;
        if(ns.alertT>0){ ns.alertT--; if(ns.alertT===0) ns.status="ok"; }
        const r=n.size*Math.max(0.4,p.scale*1.2);
        const color = ns.status==="compromised"?"#e21227":ns.status==="warn"?"#f59e0b":n.color;
        const depth = Math.max(0,Math.min(1,1-(p.sz+VZ)/(VZ*2)));

        // Outer glow
        const glw=ctx.createRadialGradient(p.sx,p.sy,0,p.sx,p.sy,r*4);
        glw.addColorStop(0,color+"44"); glw.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=glw; ctx.beginPath(); ctx.arc(p.sx,p.sy,r*4,0,Math.PI*2); ctx.fill();

        // Pulse ring
        if(ns.status!=="ok"){
          const pls=(Math.sin(t*0.08+ns.pulse)+1)/2;
          ctx.beginPath(); ctx.arc(p.sx,p.sy,r+5+pls*6,0,Math.PI*2);
          ctx.strokeStyle=color; ctx.globalAlpha=0.5*pls; ctx.lineWidth=1.5; ctx.stroke();
          ctx.globalAlpha=1;
        }

        // Depth connector line to "ground"
        ctx.beginPath(); ctx.moveTo(p.sx,p.sy); ctx.lineTo(p.sx,p.sy+r+3);
        ctx.strokeStyle=`rgba(${color.slice(1,3)==="e2"?"226,18,39":"0,229,255"},${depth*0.3})`; ctx.lineWidth=0.5; ctx.stroke();

        // Fill
        const fg=ctx.createRadialGradient(p.sx-r*0.35,p.sy-r*0.35,0,p.sx,p.sy,r*1.3);
        fg.addColorStop(0,"rgba(255,255,255,0.9)"); fg.addColorStop(0.4,color); fg.addColorStop(1,color+"66");
        ctx.fillStyle=fg;
        ctx.globalAlpha=Math.max(0.3,depth+0.3);
        drawShape(ctx,n.shape,p.sx,p.sy,r);
        ctx.fill();
        ctx.globalAlpha=1;

        // Border
        ctx.strokeStyle=color; ctx.lineWidth=0.8; ctx.globalAlpha=0.8;
        drawShape(ctx,n.shape,p.sx,p.sy,r); ctx.stroke();
        ctx.globalAlpha=1;

        // Label
        if(p.scale>0.7){
          ctx.fillStyle=color; ctx.font=`bold ${Math.round(6+p.scale*4)}px monospace`;
          ctx.textAlign="center"; ctx.globalAlpha=Math.max(0,p.scale-0.4)*2.5;
          ctx.fillText(n.label,p.sx,p.sy+r+10);
          ctx.globalAlpha=1;
        }

        // Status badge
        if(ns.status!=="ok"){
          ctx.fillStyle=ns.status==="compromised"?"#e21227":"#f59e0b";
          ctx.beginPath(); ctx.arc(p.sx+r,p.sy-r,4,0,Math.PI*2); ctx.fill();
        }
      });

      // Corner HUD
      ctx.fillStyle="rgba(0,229,255,0.7)"; ctx.font="bold 8px monospace"; ctx.textAlign="left";
      ctx.fillText(`NODES: ${NODES.length}  LINKS: ${LINKS.length}  PKTS: ${packetsRef.current.length}`,4,H-4);
    }

    frame();
    return ()=>{ cancelAnimationFrame(frameRef.current); clearInterval(atkInterval); };
  },[]);

  return (
    <div ref={rootRef} style={{left:pos.x,top:pos.y}} className="fixed z-[96] select-none">
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.1)]"
        style={{background:"rgba(2,6,18,0.97)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}>
          <Layers size={11} className="text-[#00e5ff]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#00e5ff]">NET TOPOLOGY</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px] font-mono text-[#e21227]">{stats.threats} THREATS</span>
            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1.8,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
            <button onClick={()=>setCollapsed(c=>!c)} className="text-[#555] hover:text-white">
              {collapsed?<ChevronDown size={11}/>:<ChevronUp size={11}/>}
            </button>
          </div>
        </div>
        {!collapsed&&(
          <>
            <canvas ref={canvasRef} width={W} height={H} className="block cursor-grab" onMouseDown={onCanvasDown}/>
            <div className="flex items-center gap-4 px-3 py-1 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-1"><Wifi size={9} className="text-[#00e5ff]"/><span className="text-[9px] font-mono text-[#555]">{NODES.filter(n=>!n.external).length} INTERNAL</span></div>
              <div className="flex items-center gap-1"><AlertTriangle size={9} className="text-[#e21227]"/><span className="text-[9px] font-mono text-[#555]">{NODES.filter(n=>n.group==="threat").length} EXTERNAL</span></div>
              <span className="ml-auto text-[9px] font-mono text-[#333]">DRAG=ROTATE</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
