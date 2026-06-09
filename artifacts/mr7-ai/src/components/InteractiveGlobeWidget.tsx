import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion } from "framer-motion";
import { Globe, GripHorizontal, ChevronDown, ChevronUp, Crosshair, AlertTriangle, Wifi, Zap } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL MAP — Ultra 3D Holographic Globe v2
   Scan sweep · Continental dots · Cubic bezier arcs · Depth atmosphere
═══════════════════════════════════════════════════════════════════════ */

const W = 340; const H = 280;
const R = 112; const CX = 170; const CY = 142;
const FOV = 560;

interface City { name: string; lat: number; lng: number; color: string; threat: boolean; size: number }
interface Arc { src: number; dst: number; progress: number; speed: number; active: boolean; trail: number[] }
interface StarDot { x: number; y: number; r: number; a: number; t: number }

const CITIES: City[] = [
  { name: "MOSCOW",     lat:  55.75, lng:  37.62, color: "#e21227", threat: true,  size: 4.0 },
  { name: "BEIJING",    lat:  39.90, lng: 116.40, color: "#f59e0b", threat: true,  size: 3.8 },
  { name: "PYONGYANG",  lat:  39.02, lng: 125.70, color: "#ff6b35", threat: true,  size: 3.0 },
  { name: "TEHRAN",     lat:  35.69, lng:  51.39, color: "#e21227", threat: true,  size: 3.2 },
  { name: "NYC",        lat:  40.71, lng: -74.00, color: "#00e5ff", threat: false, size: 3.5 },
  { name: "LONDON",     lat:  51.51, lng:  -0.13, color: "#00e5ff", threat: false, size: 3.2 },
  { name: "BERLIN",     lat:  52.52, lng:  13.40, color: "#22c55e", threat: false, size: 2.8 },
  { name: "TOKYO",      lat:  35.68, lng: 139.70, color: "#00e5ff", threat: false, size: 3.4 },
  { name: "SINGAPORE",  lat:   1.35, lng: 103.80, color: "#22c55e", threat: false, size: 2.6 },
  { name: "SYDNEY",     lat: -33.87, lng: 151.21, color: "#22c55e", threat: false, size: 2.8 },
  { name: "PARIS",      lat:  48.85, lng:   2.35, color: "#22c55e", threat: false, size: 3.0 },
  { name: "DUBAI",      lat:  25.20, lng:  55.27, color: "#a78bfa", threat: false, size: 2.6 },
  { name: "SAO_PAULO",  lat: -23.55, lng: -46.63, color: "#00e5ff", threat: false, size: 2.8 },
  { name: "MUMBAI",     lat:  19.07, lng:  72.87, color: "#22c55e", threat: false, size: 2.6 },
  { name: "TORONTO",    lat:  43.65, lng: -79.38, color: "#00e5ff", threat: false, size: 2.6 },
  { name: "SEOUL",      lat:  37.57, lng: 127.00, color: "#22c55e", threat: false, size: 2.8 },
  { name: "AMSTERDAM",  lat:  52.37, lng:   4.90, color: "#22c55e", threat: false, size: 2.4 },
  { name: "RIYADH",     lat:  24.68, lng:  46.72, color: "#a78bfa", threat: false, size: 2.4 },
  { name: "CAIRO",      lat:  30.06, lng:  31.24, color: "#a78bfa", threat: false, size: 2.4 },
  { name: "LAGOS",      lat:   6.45, lng:   3.39, color: "#a78bfa", threat: false, size: 2.2 },
];

const ATTACK_ROUTES = [
  {src:0,dst:4},{src:1,dst:5},{src:3,dst:6},{src:2,dst:7},
  {src:1,dst:12},{src:0,dst:10},{src:0,dst:14},{src:1,dst:15},
  {src:2,dst:11},{src:0,dst:16},{src:1,dst:8},{src:3,dst:4},
];

const CONT_DOTS: [number,number][] = [
  [70,-140],[65,-130],[60,-120],[55,-110],[50,-80],[48,-70],[45,-75],[40,-80],
  [38,-77],[35,-78],[30,-90],[25,-100],[20,-98],[55,-130],[52,-105],[35,-95],
  [10,-75],[5,-60],[0,-50],[-5,-35],[-10,-38],[-15,-47],[-22,-43],[-30,-52],[-40,-63],
  [60,10],[55,10],[52,13],[50,8],[48,2],[46,7],[44,12],[40,22],[38,15],[36,14],
  [54,18],[62,15],[65,25],[56,21],[50,18],
  [37,10],[30,-5],[25,-15],[15,-14],[10,-13],[5,-3],[0,12],
  [-5,12],[-10,15],[-20,14],[-30,18],[-34,18],[5,35],[10,40],[20,33],[30,30],
  [60,90],[55,82],[50,80],[45,72],[40,68],[35,62],[30,50],[25,45],[20,58],
  [10,77],[5,100],[0,104],[28,77],[32,74],[35,105],[40,116],[45,130],[50,128],
  [25,121],[38,140],[35,136],[30,130],[20,100],
  [-20,120],[-25,115],[-30,115],[-35,118],[-38,145],[-30,130],[-22,150],[-35,148],
];

const STARS: StarDot[] = Array.from({length:300}, () => ({
  x:Math.random()*W, y:Math.random()*H,
  r:Math.random()*1.3+0.2, a:Math.random()*0.8+0.1,
  t:Math.random()*Math.PI*2,
}));

function latLngTo3D(lat: number, lng: number): [number,number,number] {
  const phi = (90-lat)*Math.PI/180;
  const th  = (lng+180)*Math.PI/180;
  return [Math.sin(phi)*Math.cos(th), Math.cos(phi), Math.sin(phi)*Math.sin(th)];
}
function rotY(x:number,y:number,z:number,a:number):[number,number,number]{
  return [x*Math.cos(a)-z*Math.sin(a), y, x*Math.sin(a)+z*Math.cos(a)];
}
function rotX(x:number,y:number,z:number,a:number):[number,number,number]{
  return [x, y*Math.cos(a)+z*Math.sin(a), -y*Math.sin(a)+z*Math.cos(a)];
}
function proj(x:number,y:number,z:number):[number,number,number]{
  const sc = FOV/(FOV+z*R);
  return [CX+x*R*sc, CY-y*R*sc, z];
}
function applyRot(lx:number,ly:number,lz:number,rx:number,ry:number):[number,number,number]{
  const [ax,ay,az] = rotY(lx,ly,lz,ry);
  return rotX(ax,ay,az,rx);
}
function arcPt(
  ax:number,ay:number,az:number, bx:number,by:number,bz:number,
  t:number, lift:number
):[number,number,number]{
  const mx=(ax+bx)/2, my=(ay+by)/2, mz=(az+bz)/2;
  const len=Math.sqrt(mx*mx+my*my+mz*mz)||1;
  const sc=(1+lift)/len;
  const cx=mx*sc,cy=my*sc,cz=mz*sc;
  const mt=1-t;
  return [mt*mt*ax+2*mt*t*cx+t*t*bx, mt*mt*ay+2*mt*t*cy+t*t*by, mt*mt*az+2*mt*t*cz+t*t*bz];
}

export function InteractiveGlobeWidget() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const tickRef    = useRef(0);
  const rxRef      = useRef(0.18);
  const ryRef      = useRef(0);
  const vxRef      = useRef(0);
  const vyRef      = useRef(0.003);
  const isDragRef  = useRef(false);
  const lastRef    = useRef({x:0,y:0});
  const arcsRef    = useRef<Arc[]>(ATTACK_ROUTES.map(r => ({
    ...r, progress: Math.random(), speed: 0.0012+Math.random()*0.0012, active:true, trail:[] as number[]
  })));
  const sweepRef   = useRef(0);
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState(0);

  const {pos, rootRef, onDragMouseDown, onDragTouchStart} = useDraggable(
    "mr7-globe-interactive-pos", {x:12, y:420}
  );

  const onGlobeDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isDragRef.current = true;
    lastRef.current = {x:e.clientX, y:e.clientY};
    vxRef.current = 0; vyRef.current = 0;
    const mm = (ev:MouseEvent) => {
      const dx=ev.clientX-lastRef.current.x, dy=ev.clientY-lastRef.current.y;
      ryRef.current += dx*0.006; rxRef.current += dy*0.004;
      rxRef.current = Math.max(-1.2,Math.min(1.2,rxRef.current));
      lastRef.current = {x:ev.clientX,y:ev.clientY};
      vxRef.current=dy*0.004; vyRef.current=dx*0.006;
    };
    const mu = () => {
      isDragRef.current=false;
      window.removeEventListener("mousemove",mm);
      window.removeEventListener("mouseup",mu);
    };
    window.addEventListener("mousemove",mm);
    window.addEventListener("mouseup",mu);
  },[]);

  useEffect(()=>{
    const cv=canvasRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!;
    let atkCnt = 0;

    function frame(){
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      if(!isDragRef.current){
        ryRef.current += 0.003;
        vxRef.current *= 0.97; vyRef.current *= 0.97;
      }
      sweepRef.current += 0.008;

      ctx.clearRect(0,0,W,H);

      // Background
      const bg = ctx.createRadialGradient(CX*0.5,CY*0.5,0,CX,CY,W*0.8);
      bg.addColorStop(0,"rgba(3,5,18,1)"); bg.addColorStop(0.6,"rgba(1,2,10,1)"); bg.addColorStop(1,"rgba(0,1,4,1)");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      // Nebula patches
      [[CX*0.6,CY*0.4,60,"rgba(0,80,180,0.05)"],[CX*1.5,CY*1.4,80,"rgba(100,0,60,0.04)"]].forEach(([nx,ny,nr,nc])=>{
        const ng=ctx.createRadialGradient(nx as number,ny as number,0,nx as number,ny as number,nr as number);
        ng.addColorStop(0,nc as string); ng.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=ng; ctx.fillRect(0,0,W,H);
      });

      // Stars
      STARS.forEach(s=>{
        const tw=(Math.sin(t*0.012+s.t)+1)/2;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.globalAlpha=s.a*(0.3+tw*0.7); ctx.fillStyle="#fff"; ctx.fill();
      });
      ctx.globalAlpha=1;

      // Atmosphere rings
      [[1.6,"rgba(0,229,255,0.005)","rgba(0,229,255,0.025)"],[1.45,"rgba(226,18,39,0.005)","rgba(226,18,39,0.02)"],[1.3,"rgba(0,150,255,0.01)","rgba(0,150,255,0.045)"],[1.15,"rgba(226,18,39,0.015)","rgba(226,18,39,0.06)"],[1.06,"rgba(0,80,200,0.03)","rgba(0,80,200,0.1)"]].forEach(([rm,c1,c2])=>{
        const atm=ctx.createRadialGradient(CX,CY,R*(rm as number-0.1),CX,CY,R*(rm as number));
        atm.addColorStop(0,c1 as string); atm.addColorStop(1,c2 as string);
        ctx.beginPath(); ctx.arc(CX,CY,R*(rm as number),0,Math.PI*2);
        ctx.fillStyle=atm; ctx.fill();
      });

      // Globe base
      const sph=ctx.createRadialGradient(CX-42,CY-42,0,CX,CY,R);
      sph.addColorStop(0,"rgba(8,16,38,0.97)"); sph.addColorStop(0.5,"rgba(3,7,20,0.97)");
      sph.addColorStop(0.9,"rgba(1,2,10,0.98)"); sph.addColorStop(1,"rgba(0,1,5,0.99)");
      ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.fillStyle=sph; ctx.fill();

      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();

      // Grid lines
      ctx.strokeStyle="rgba(0,229,255,0.04)"; ctx.lineWidth=0.4;
      for(let la=-80;la<=80;la+=20){
        ctx.beginPath(); let f=true;
        for(let lo=0;lo<=360;lo+=5){
          const [lx,ly,lz]=latLngTo3D(la,lo-180);
          const [rx,ry,rz]=applyRot(lx,ly,lz,rxRef.current,ryRef.current);
          if(rz>0){const[px,py]=proj(rx,ry,rz); f?ctx.moveTo(px,py):ctx.lineTo(px,py); f=false;}
          else f=true;
        }
        ctx.stroke();
      }
      for(let lo=0;lo<360;lo+=20){
        ctx.beginPath(); let f=true;
        for(let la=-85;la<=85;la+=5){
          const [lx,ly,lz]=latLngTo3D(la,lo-180);
          const [rx,ry,rz]=applyRot(lx,ly,lz,rxRef.current,ryRef.current);
          if(rz>0){const[px,py]=proj(rx,ry,rz); f?ctx.moveTo(px,py):ctx.lineTo(px,py); f=false;}
          else f=true;
        }
        ctx.stroke();
      }

      // Continental dots
      CONT_DOTS.forEach(([la,lo])=>{
        const [lx,ly,lz]=latLngTo3D(la,lo);
        const [rx,ry,rz]=applyRot(lx,ly,lz,rxRef.current,ryRef.current);
        if(rz>0.05){
          const [px,py]=proj(rx,ry,rz);
          const br=0.3+rz*0.7;
          ctx.beginPath(); ctx.arc(px,py,0.8+rz*0.6,0,Math.PI*2);
          ctx.fillStyle=`rgba(40,180,110,${br*0.55})`; ctx.fill();
        }
      });

      // Scan sweep
      const sw=sweepRef.current;
      const swGrd=ctx.createConicGradient?.(sw,CX,CY) ?? null;
      ctx.beginPath();
      ctx.moveTo(CX,CY);
      ctx.arc(CX,CY,R,sw,sw+0.35);
      ctx.closePath();
      ctx.fillStyle="rgba(0,229,255,0.05)";
      ctx.fill();
      ctx.restore();

      // Scan sweep line (outside clip)
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(CX,CY);
      const sx=CX+R*Math.cos(sw), sy=CY+R*Math.sin(sw);
      const swG=ctx.createLinearGradient(CX,CY,sx,sy);
      swG.addColorStop(0,"rgba(0,229,255,0)"); swG.addColorStop(1,"rgba(0,229,255,0.4)");
      ctx.strokeStyle=swG; ctx.lineWidth=1.5;
      ctx.moveTo(CX,CY); ctx.lineTo(sx,sy); ctx.stroke();
      ctx.restore();

      // City projections
      const cityP = CITIES.map((c,i)=>{
        const [lx,ly,lz]=latLngTo3D(c.lat,c.lng);
        const [rx,ry,rz]=applyRot(lx,ly,lz,rxRef.current,ryRef.current);
        const [px,py] = proj(rx,ry,rz);
        return {c,i,px,py,rz};
      });

      // Arcs
      arcsRef.current.forEach((arc,ai)=>{
        const srcC=CITIES[arc.src]; const dstC=CITIES[arc.dst];
        if(!srcC||!dstC) return;
        arc.trail.unshift(arc.progress);
        if(arc.trail.length>16) arc.trail.pop();

        const [alx,aly,alz]=latLngTo3D(srcC.lat,srcC.lng);
        const [blx,bly,blz]=latLngTo3D(dstC.lat,dstC.lng);
        const [arx,ary,arz]=applyRot(alx,aly,alz,rxRef.current,ryRef.current);
        const [brx,bry,brz]=applyRot(blx,bly,blz,rxRef.current,ryRef.current);

        // Trail
        arc.trail.forEach((tp,ti)=>{
          const [px,py,pz]=arcPt(arx,ary,arz,brx,bry,brz,tp,0.5);
          if(pz>-0.1){
            const [sx2,sy2]=proj(px,py,pz);
            ctx.beginPath(); ctx.arc(sx2,sy2,1.4*(1-ti/arc.trail.length),0,Math.PI*2);
            ctx.fillStyle=srcC.color;
            ctx.globalAlpha=(1-ti/arc.trail.length)*0.6; ctx.fill();
          }
        });
        ctx.globalAlpha=1;

        // Head
        const [px,py,pz]=arcPt(arx,ary,arz,brx,bry,brz,arc.progress,0.5);
        if(pz>-0.1){
          const [sx2,sy2]=proj(px,py,pz);
          const hg=ctx.createRadialGradient(sx2,sy2,0,sx2,sy2,7);
          hg.addColorStop(0,"rgba(255,255,255,0.9)"); hg.addColorStop(0.3,srcC.color);
          hg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=hg; ctx.beginPath(); ctx.arc(sx2,sy2,7,0,Math.PI*2); ctx.fill();
        }

        arc.progress+=arc.speed;
        if(arc.progress>=1){ arc.progress=0; arc.trail=[]; atkCnt++; if(atkCnt%6===0) setActive(atkCnt); }
      });

      // City dots (front-facing)
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R+2,0,Math.PI*2); ctx.clip();
      cityP.filter(c=>c.rz>0).sort((a,b)=>a.rz-b.rz).forEach(({c,i,px,py,rz})=>{
        const sz=c.size*(0.5+rz*0.7);
        const pulse=(Math.sin(t*0.05+i*0.8)+1)/2;

        if(c.threat){
          ctx.beginPath(); ctx.arc(px,py,sz+4+pulse*3,0,Math.PI*2);
          ctx.strokeStyle=c.color; ctx.globalAlpha=0.3*pulse; ctx.lineWidth=1; ctx.stroke();
        }

        const glw=ctx.createRadialGradient(px,py,0,px,py,sz*3);
        glw.addColorStop(0,c.color+"88"); glw.addColorStop(1,"rgba(0,0,0,0)");
        ctx.globalAlpha=0.7; ctx.fillStyle=glw;
        ctx.beginPath(); ctx.arc(px,py,sz*3,0,Math.PI*2); ctx.fill();

        ctx.globalAlpha=1;
        const cg=ctx.createRadialGradient(px-sz*0.3,py-sz*0.3,0,px,py,sz);
        cg.addColorStop(0,"#fff"); cg.addColorStop(0.5,c.color); cg.addColorStop(1,c.color+"88");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(px,py,sz,0,Math.PI*2); ctx.fill();

        if(rz>0.35){
          ctx.fillStyle=c.color; ctx.globalAlpha=Math.min(1,(rz-0.35)*2.5);
          ctx.font=`bold ${Math.round(8+rz*3)}px monospace`;
          ctx.textAlign="center";
          ctx.fillText(c.name,px,py+sz+9);
          ctx.globalAlpha=1;
        }
      });
      ctx.restore();

      // Specular
      ctx.save(); ctx.beginPath(); ctx.arc(CX,CY,R,0,Math.PI*2); ctx.clip();
      const spec=ctx.createRadialGradient(CX-40,CY-40,0,CX-40,CY-40,60);
      spec.addColorStop(0,"rgba(255,255,255,0.1)"); spec.addColorStop(1,"rgba(255,255,255,0)");
      ctx.fillStyle=spec; ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    frame();
    return ()=>cancelAnimationFrame(frameRef.current);
  },[]);

  return (
    <div ref={rootRef} style={{left:pos.x,top:pos.y}} className="fixed z-[96] select-none">
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_40px_rgba(0,229,255,0.12)]"
        style={{background:"rgba(3,5,18,0.97)",backdropFilter:"blur(20px)"}}>
        <div className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}>
          <Globe size={11} className="text-[#00e5ff]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#00e5ff]">GLOBAL MAP</span>
          <div className="ml-auto flex items-center gap-2">
            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:2,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[9px] font-mono text-[#555]">TRACKING {active} EVENTS</span>
            <button onClick={()=>setCollapsed(c=>!c)} className="text-[#555] hover:text-white">
              {collapsed?<ChevronDown size={11}/>:<ChevronUp size={11}/>}
            </button>
          </div>
        </div>
        {!collapsed&&(
          <>
            <canvas ref={canvasRef} width={W} height={H} className="block cursor-grab" onMouseDown={onGlobeDown} />
            <div className="flex items-center gap-4 px-3 py-1 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-1"><Crosshair size={9} className="text-[#e21227]"/><span className="text-[9px] font-mono text-[#e21227]">{CITIES.filter(c=>c.threat).length} THREATS</span></div>
              <div className="flex items-center gap-1"><Wifi size={9} className="text-[#00e5ff]"/><span className="text-[9px] font-mono text-[#555]">{CITIES.filter(c=>!c.threat).length} NODES</span></div>
              <div className="flex items-center gap-1"><AlertTriangle size={9} className="text-[#f59e0b]"/><span className="text-[9px] font-mono text-[#555]">{ATTACK_ROUTES.length} ROUTES</span></div>
              <span className="ml-auto text-[9px] font-mono text-[#333]">DRAG=ROTATE</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
