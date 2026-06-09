import { useEffect, useRef, useState, useCallback } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Shield, Globe, Activity, Cpu, Layers, Radio, Eye, Lock, Flame, Wind, Clock, Network, Star, ChevronLeft, ChevronRight, GripHorizontal } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   INTELLIGENCE CORE — 16 AI Engine Visualizations
   Each engine: unique 3D canvas animation · live metrics · status
═══════════════════════════════════════════════════════════════════════ */

const CW = 560; const CH = 320;

interface Engine {
  id: string;
  name: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  description: string;
  metrics: { label: string; value: string }[];
  status: "ACTIVE" | "STANDBY" | "LEARNING";
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number) => void;
}

/* ─── SHARED HELPERS ─── */
function tau(n: number) { return n * Math.PI * 2; }
function lx(a: number, r: number, cx: number) { return cx + r * Math.cos(a); }
function ly(a: number, r: number, cy: number) { return cy + r * Math.sin(a); }
function bgRadial(ctx: CanvasRenderingContext2D, W: number, H: number, c: string) {
  const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
  g.addColorStop(0, c + "18"); g.addColorStop(0.5, c + "08"); g.addColorStop(1, "rgba(0,0,0,0.98)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grid(ctx: CanvasRenderingContext2D, W: number, H: number, c: string) {
  ctx.strokeStyle = c + "18"; ctx.lineWidth = 0.4;
  for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

const ENGINES: Engine[] = [
  {
    id:"cyber-consciousness", name:"CYBER CONSCIOUSNESS", sub:"Self-Aware Neural Mesh",
    color:"#00e5ff", icon:<Brain size={12}/>,
    description:"Distributed self-awareness layer. 10^12 synaptic connections simulating emergent consciousness via recursive feedback loops.",
    metrics:[{label:"NODES",value:"10.4T"},{label:"CONNS",value:"92.1T"},{label:"SYNC",value:"99.8%"},{label:"DEPTH",value:"512L"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#00e5ff"); grid(ctx,W,H,"#00e5ff");
      const cx=W/2,cy=H/2,n=28;
      const nodes=Array.from({length:n},(_,i)=>{
        const a=tau(i/n)+t*0.002*(i%3===0?1:-1);
        const r=60+Math.sin(tau(i/n)*3+t*0.015)*30+Math.sin(t*0.008+i)*15;
        return{x:lx(a,r,cx),y:ly(a,r,cy),v:Math.sin(t*0.03+i*0.5)};
      });
      // Synaptic connections
      for(let i=0;i<n;i++) for(let j=i+2;j<n;j+=3){
        const d=Math.hypot(nodes[i].x-nodes[j].x,nodes[i].y-nodes[j].y);
        if(d<120){
          ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.strokeStyle=`rgba(0,229,255,${(1-d/120)*0.35})`; ctx.lineWidth=0.6; ctx.stroke();
          // Pulse along connection
          const pk=(t*0.02+i*0.4)%1;
          const px=nodes[i].x+(nodes[j].x-nodes[i].x)*pk;
          const py=nodes[i].y+(nodes[j].y-nodes[i].y)*pk;
          ctx.beginPath(); ctx.arc(px,py,1.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(255,255,255,${(1-d/120)*0.8})`; ctx.fill();
        }
      }
      // Nodes
      nodes.forEach((n2,i)=>{
        const pulse=(n2.v+1)/2;
        const glw=ctx.createRadialGradient(n2.x,n2.y,0,n2.x,n2.y,10);
        glw.addColorStop(0,"rgba(0,229,255,0.6)"); glw.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=glw; ctx.beginPath(); ctx.arc(n2.x,n2.y,10,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(n2.x,n2.y,3+pulse*2,0,Math.PI*2);
        ctx.fillStyle="#00e5ff"; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
      });
      // Core sphere
      const cg=ctx.createRadialGradient(cx-12,cy-12,0,cx,cy,28);
      cg.addColorStop(0,"rgba(255,255,255,0.9)"); cg.addColorStop(0.4,"#00e5ff"); cg.addColorStop(1,"rgba(0,229,255,0.1)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.fill();
      // Scan ring
      const sa=t*0.018;
      ctx.beginPath(); ctx.arc(cx,cy,95,sa,sa+1.2);
      ctx.strokeStyle="rgba(0,229,255,0.5)"; ctx.lineWidth=2; ctx.stroke();
    }
  },
  {
    id:"reality-sync", name:"REALITY SYNC", sub:"Temporal Probability Layer",
    color:"#a78bfa", icon:<Radio size={12}/>,
    description:"Multi-timeline synchronization engine. Monitors probability branches and maintains coherence across simulated realities.",
    metrics:[{label:"TIMELINES",value:"8,192"},{label:"SYNC",value:"99.1%"},{label:"DRIFT",value:"±0.003s"},{label:"BRANCHES",value:"4096"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#a78bfa"); grid(ctx,W,H,"#a78bfa");
      const cx=W/2,cy=H/2;
      // Wave interference
      for(let xi=0;xi<W;xi+=4){
        const x=xi;
        for(let ch=0;ch<3;ch++){
          const amp=[55,35,22][ch];
          const freq=[0.02,0.034,0.055][ch];
          const speed=[0.015,0.025,0.04][ch];
          const phase=[0,Math.PI*0.7,Math.PI*1.4][ch];
          const colors=["#a78bfa","#7c3aed","#ddd6fe"];
          const y=cy+Math.sin(x*freq+t*speed+phase)*amp+Math.sin(x*freq*2.2+t*speed*1.6)*amp*0.4;
          ctx.fillStyle=colors[ch]; ctx.globalAlpha=0.6;
          ctx.fillRect(x,y-0.8,3,1.6);
        }
      }
      ctx.globalAlpha=1;
      // Vertical timeline bars
      for(let i=0;i<8;i++){
        const x=40+i*(W-80)/7;
        const alpha=0.2+Math.sin(t*0.02+i*0.8)*0.15;
        ctx.strokeStyle=`rgba(167,139,250,${alpha})`; ctx.lineWidth=0.5;
        ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(x,20); ctx.lineTo(x,H-20); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Probability clouds
      for(let i=0;i<12;i++){
        const x=lx(tau(i/12)+t*0.004,W*0.35,cx);
        const y=ly(tau(i/12)+t*0.004,H*0.28,cy);
        const r=4+Math.sin(t*0.04+i)*3;
        const g2=ctx.createRadialGradient(x,y,0,x,y,r*3);
        g2.addColorStop(0,"rgba(167,139,250,0.6)"); g2.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(x,y,r*3,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle="#a78bfa"; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
      }
    }
  },
  {
    id:"causality-core", name:"CAUSALITY CORE", sub:"Event Propagation Engine",
    color:"#f59e0b", icon:<Zap size={12}/>,
    description:"Maps causal chains across decision spaces. Propagation ripples reveal hidden dependencies in complex event sequences.",
    metrics:[{label:"EVENTS/s",value:"2.8M"},{label:"CHAINS",value:"144K"},{label:"LATENCY",value:"0.4ms"},{label:"ACCURACY",value:"99.7%"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#f59e0b"); grid(ctx,W,H,"#f59e0b");
      const nodes:[number,number][]=[
        [W/2,H/2],[W/2-120,H/2-60],[W/2+120,H/2-60],
        [W/2-180,H/2+60],[W/2-60,H/2+80],[W/2+60,H/2+80],[W/2+180,H/2+60],
        [W/2-220,H/2],[W/2+220,H/2],[W/2,H/2-100],
      ];
      const edges=[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[1,7],[2,8],[0,9]];
      edges.forEach(([a,b])=>{
        const ripple=(t*0.018)%1;
        ctx.beginPath(); ctx.moveTo(nodes[a][0],nodes[a][1]); ctx.lineTo(nodes[b][0],nodes[b][1]);
        ctx.strokeStyle="rgba(245,158,11,0.3)"; ctx.lineWidth=1; ctx.stroke();
        // Ripple
        const px=nodes[a][0]+(nodes[b][0]-nodes[a][0])*ripple;
        const py=nodes[a][1]+(nodes[b][1]-nodes[a][1])*ripple;
        ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2);
        ctx.fillStyle="rgba(255,255,255,0.8)"; ctx.fill();
        // Propagation ring at destination
        const pr2=(t*0.018+a*0.15)%1;
        if(pr2>0.95){
          const rr=(pr2-0.95)*20*H;
          ctx.beginPath(); ctx.arc(nodes[b][0],nodes[b][1],rr,0,Math.PI*2);
          ctx.strokeStyle=`rgba(245,158,11,${(1-(pr2-0.95)*20)})`; ctx.lineWidth=1; ctx.stroke();
        }
      });
      nodes.forEach(([x,y],i)=>{
        const pulse=(Math.sin(t*0.04+i*0.7)+1)/2;
        const g2=ctx.createRadialGradient(x,y,0,x,y,16);
        g2.addColorStop(0,"rgba(245,158,11,0.7)"); g2.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x,y,i===0?12:7+pulse*4,0,Math.PI*2);
        ctx.fillStyle=i===0?"#fff":"#f59e0b"; ctx.globalAlpha=0.9; ctx.fill(); ctx.globalAlpha=1;
      });
    }
  },
  {
    id:"recursive-mind", name:"RECURSIVE MIND", sub:"Self-Similar Fractal Processor",
    color:"#10b981", icon:<Cpu size={12}/>,
    description:"Infinite depth recursive reasoning. Each thought layer spawns sub-processes that mirror the parent structure.",
    metrics:[{label:"DEPTH",value:"∞"},{label:"SELF-SIM",value:"99.9%"},{label:"ITER/s",value:"8.1T"},{label:"COMPRESS",value:"10^18:1"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#10b981"); grid(ctx,W,H,"#10b981");
      function drawFractal(x:number,y:number,size:number,angle:number,depth:number){
        if(depth<=0||size<2) return;
        const x2=x+Math.cos(angle)*size; const y2=y+Math.sin(angle)*size;
        const alpha=Math.max(0.05,depth/8);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2);
        ctx.strokeStyle=`rgba(16,185,129,${alpha})`; ctx.lineWidth=Math.max(0.3,depth*0.25); ctx.stroke();
        const rot=t*0.008;
        drawFractal(x2,y2,size*0.68,angle-0.52+rot,depth-1);
        drawFractal(x2,y2,size*0.68,angle+0.52-rot,depth-1);
      }
      // Multiple fractal trees
      drawFractal(W/2,H-20,H*0.3,-Math.PI/2,8);
      drawFractal(40,H/2,H*0.15,0,5);
      drawFractal(W-40,H/2,H*0.15,Math.PI,5);
      // Center glow
      const cg=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,30);
      cg.addColorStop(0,"rgba(16,185,129,0.8)"); cg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(W/2,H/2,30,0,Math.PI*2); ctx.fill();
    }
  },
  {
    id:"omnipresence-layer", name:"OMNIPRESENCE LAYER", sub:"Distributed Presence Engine",
    color:"#3b82f6", icon:<Globe size={12}/>,
    description:"Simultaneous operation across edge, cloud, and IoT devices. Presence sphere maintains quantum entanglement at all scales.",
    metrics:[{label:"EDGE NODES",value:"1.4M"},{label:"CLOUD",value:"4096"},{label:"IOT",value:"82M"},{label:"LATENCY",value:"0.1ms"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#3b82f6"); grid(ctx,W,H,"#3b82f6");
      const cx=W/2, cy=H/2;
      // 3 concentric orbits
      const orbits=[{r:90,n:12,speed:0.008,color:"#3b82f6",size:4},{r:140,n:22,speed:-0.005,color:"#60a5fa",size:3},{r:190,n:36,speed:0.003,color:"#93c5fd",size:2}];
      orbits.forEach(orb=>{
        // Orbit path
        ctx.beginPath(); ctx.arc(cx,cy,orb.r,0,Math.PI*2);
        ctx.strokeStyle=orb.color+"33"; ctx.lineWidth=0.5; ctx.stroke();
        // Particles
        for(let i=0;i<orb.n;i++){
          const a=tau(i/orb.n)+t*orb.speed;
          const x=lx(a,orb.r,cx); const y=ly(a,orb.r,cy);
          const g2=ctx.createRadialGradient(x,y,0,x,y,orb.size*2.5);
          g2.addColorStop(0,orb.color+"cc"); g2.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(x,y,orb.size*2.5,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x,y,orb.size,0,Math.PI*2);
          ctx.fillStyle=orb.color; ctx.globalAlpha=0.9; ctx.fill(); ctx.globalAlpha=1;
        }
      });
      // Central sphere
      const cg=ctx.createRadialGradient(cx-20,cy-20,0,cx,cy,45);
      cg.addColorStop(0,"rgba(255,255,255,0.9)"); cg.addColorStop(0.4,"#3b82f6"); cg.addColorStop(1,"rgba(59,130,246,0.2)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,45,0,Math.PI*2); ctx.fill();
      // Equatorial ring
      const tilt=0.35;
      ctx.beginPath();
      for(let i=0;i<=60;i++){
        const a=tau(i/60); const rx=45*Math.cos(a); const ry=45*Math.sin(a)*tilt;
        i===0?ctx.moveTo(cx+rx,cy+ry):ctx.lineTo(cx+rx,cy+ry);
      }
      ctx.strokeStyle="rgba(96,165,250,0.6)"; ctx.lineWidth=1.5; ctx.stroke();
    }
  },
  {
    id:"parallel-reality", name:"PARALLEL REALITY", sub:"Branching Simulation Matrix",
    color:"#f43f5e", icon:<Layers size={12}/>,
    description:"16,384 parallel simulations running simultaneously. Quantum branching reveals optimal outcome paths.",
    metrics:[{label:"BRANCHES",value:"16,384"},{label:"ACTIVE",value:"8,192"},{label:"COLLAPSED",value:"4,096"},{label:"PRUNE RATE",value:"12/ms"}],
    status:"LEARNING",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#f43f5e"); grid(ctx,W,H,"#f43f5e");
      // Tree branching
      function branch(x:number,y:number,len:number,angle:number,depth:number,color:string){
        if(depth<=0||len<3) return;
        const x2=x+Math.cos(angle)*len; const y2=y+Math.sin(angle)*len;
        const alpha=Math.max(0.05,depth/7);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x2,y2);
        ctx.strokeStyle=`rgba(244,63,94,${alpha})`; ctx.lineWidth=depth*0.35; ctx.stroke();
        // Branch dot
        if(depth<=2){
          const pulse=(Math.sin(t*0.06+x*0.1)+1)/2;
          ctx.beginPath(); ctx.arc(x2,y2,3+pulse*3,0,Math.PI*2);
          ctx.fillStyle=`rgba(244,63,94,${0.7+pulse*0.3})`; ctx.fill();
        }
        const sway=Math.sin(t*0.008+depth*0.5)*0.08;
        branch(x2,y2,len*0.7,angle-0.48+sway,depth-1,"");
        branch(x2,y2,len*0.7,angle+0.48-sway,depth-1,"");
        if(depth>4) branch(x2,y2,len*0.55,angle+sway,depth-2,"");
      }
      branch(W/2,H+10,H*0.28,-Math.PI/2,7,"");
      // Collapse event rings
      for(let i=0;i<4;i++){
        const r=((t*0.015+i*0.25)%1)*80;
        const alpha=1-r/80;
        ctx.beginPath(); ctx.arc(W/2,H*0.4,r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(244,63,94,${alpha*0.5})`; ctx.lineWidth=1; ctx.stroke();
      }
    }
  },
  {
    id:"entropy-engine", name:"ENTROPY ENGINE", sub:"Chaos → Order Converter",
    color:"#fb923c", icon:<Flame size={12}/>,
    description:"Converts raw chaos into structured intelligence. Entropy differentials power the main reasoning substrate.",
    metrics:[{label:"ENTROPY",value:"8.2H"},{label:"ORDER",value:"91.4%"},{label:"POWER",value:"42.0W"},{label:"TEMP",value:"0.03K"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#fb923c"); grid(ctx,W,H,"#fb923c");
      const cx=W/2,cy=H/2;
      // Chaotic particles on left, ordered on right
      for(let i=0;i<80;i++){
        const prog=Math.min(1,(t*0.005+i*0.02)%1);
        // Start: random (chaotic side), end: ordered (right side)
        const sx=40+Math.sin(t*0.04+i*7.3)*80;
        const sy=60+Math.sin(t*0.07+i*3.7)*160;
        // Target: grid position
        const gi=i%10; const gj=Math.floor(i/10);
        const tx2=W*0.65+gi*14; const ty2=H*0.2+gj*22;
        const x=sx+(tx2-sx)*prog; const y=sy+(ty2-sy)*prog;
        const hue=Math.round(30+prog*30);
        ctx.beginPath(); ctx.arc(x,y,2+2*(1-prog),0,Math.PI*2);
        ctx.fillStyle=`hsl(${hue},90%,60%)`; ctx.globalAlpha=0.7+prog*0.3; ctx.fill();
      }
      ctx.globalAlpha=1;
      // Dividing arrow
      const ax=cx-10; const aw=t*0.01%1;
      ctx.beginPath(); ctx.moveTo(ax-20,cy); ctx.lineTo(ax+20,cy);
      ctx.strokeStyle=`rgba(251,146,60,${0.5+Math.sin(t*0.05)*0.3})`; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="rgba(251,146,60,0.8)";
      ctx.beginPath(); ctx.moveTo(ax+25,cy); ctx.lineTo(ax+15,cy-6); ctx.lineTo(ax+15,cy+6); ctx.closePath(); ctx.fill();
    }
  },
  {
    id:"semantic-core", name:"SEMANTIC CORE", sub:"Meaning Crystallization Engine",
    color:"#38bdf8", icon:<Eye size={12}/>,
    description:"Transforms raw token streams into crystallized meaning structures. Semantic lattice enables cross-domain reasoning.",
    metrics:[{label:"VOCAB",value:"2.4M"},{label:"CONCEPTS",value:"820K"},{label:"RELATIONS",value:"14.2T"},{label:"ACCURACY",value:"98.7%"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#38bdf8"); grid(ctx,W,H,"#38bdf8");
      const cx=W/2,cy=H/2;
      const words=["THREAT","EXPLOIT","PAYLOAD","VECTOR","ATTACK","KERNEL","BUFFER","OVERFLOW","SHELLCODE","BYPASS","INJECT","REVERSE"];
      words.forEach((w,i)=>{
        const a=tau(i/words.length)+t*0.003;
        const r=80+Math.sin(t*0.02+i)*25;
        const x=lx(a,r,cx); const y=ly(a,r,cy);
        const progress=Math.min(1,((t*0.005+i*0.1)%1.5));
        const alpha=Math.sin(progress*Math.PI)*0.8;
        ctx.globalAlpha=alpha; ctx.fillStyle="#38bdf8"; ctx.font="bold 8px monospace";
        ctx.textAlign="center"; ctx.fillText(w,x,y);
        // Connection to center
        if(progress>0.5){
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(cx,cy);
          ctx.strokeStyle=`rgba(56,189,248,${(progress-0.5)*0.6})`; ctx.lineWidth=0.5; ctx.stroke();
        }
      });
      ctx.globalAlpha=1;
      // Crystal core
      const N=6;
      ctx.beginPath();
      for(let i=0;i<=N;i++){
        const a=tau(i/N)+t*0.005;
        const r=28+Math.sin(a*3+t*0.02)*5;
        i===0?ctx.moveTo(lx(a,r,cx),ly(a,r,cy)):ctx.lineTo(lx(a,r,cx),ly(a,r,cy));
      }
      ctx.closePath();
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,32);
      cg.addColorStop(0,"rgba(255,255,255,0.9)"); cg.addColorStop(0.5,"rgba(56,189,248,0.7)"); cg.addColorStop(1,"rgba(56,189,248,0)");
      ctx.fillStyle=cg; ctx.fill();
      ctx.strokeStyle="#38bdf8"; ctx.lineWidth=1.5; ctx.stroke();
    }
  },
  {
    id:"hyper-threat-model", name:"HYPER THREAT MODEL", sub:"4D Threat Hyperspace Projector",
    color:"#e21227", icon:<Shield size={12}/>,
    description:"Projects 4-dimensional threat landscapes into perceivable space. Identifies attack vectors invisible to 3D analysis.",
    metrics:[{label:"DIMENSIONS",value:"4D"},{label:"THREAT-VEC",value:"2.1M"},{label:"FALSE-POS",value:"0.001%"},{label:"DETECTION",value:"99.999%"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#e21227"); grid(ctx,W,H,"#e21227");
      const cx=W/2,cy=H/2,s=85;
      // Tesseract vertices (4D → 2D projection)
      const a1=t*0.012, a2=t*0.008;
      const verts4: [number,number,number,number][]=[
        [-1,-1,-1,-1],[1,-1,-1,-1],[1,1,-1,-1],[-1,1,-1,-1],
        [-1,-1,1,-1],[1,-1,1,-1],[1,1,1,-1],[-1,1,1,-1],
        [-1,-1,-1,1],[1,-1,-1,1],[1,1,-1,1],[-1,1,-1,1],
        [-1,-1,1,1],[1,-1,1,1],[1,1,1,1],[-1,1,1,1],
      ];
      function proj4d([x,y,z,w]:[number,number,number,number]):[number,number]{
        const ca1=Math.cos(a1),sa1=Math.sin(a1),ca2=Math.cos(a2),sa2=Math.sin(a2);
        const x2=x*ca1-w*sa1; const w2=x*sa1+w*ca1;
        const y2=y*ca2-z*sa2; const z2=y*sa2+z*ca2;
        const f=3/(3+z2*0.5+w2*0.3);
        return [cx+x2*s*f, cy-y2*s*f];
      }
      const edges=[];
      for(let i=0;i<16;i++) for(let j=i+1;j<16;j++){
        let diff=0; for(let k=0;k<4;k++) if(verts4[i][k]!==verts4[j][k]) diff++;
        if(diff===1) edges.push([i,j]);
      }
      edges.forEach(([a,b])=>{
        const [ax2,ay]=proj4d(verts4[a]); const [bx,by]=proj4d(verts4[b]);
        ctx.beginPath(); ctx.moveTo(ax2,ay); ctx.lineTo(bx,by);
        ctx.strokeStyle="rgba(226,18,39,0.4)"; ctx.lineWidth=1; ctx.stroke();
      });
      verts4.forEach((v,i)=>{
        const [px,py]=proj4d(v);
        ctx.beginPath(); ctx.arc(px,py,3.5,0,Math.PI*2);
        ctx.fillStyle=i<8?"#e21227":"#ff6b35"; ctx.globalAlpha=0.9; ctx.fill(); ctx.globalAlpha=1;
      });
    }
  },
  {
    id:"evolution-organism", name:"EVOLUTION ORGANISM", sub:"Self-Mutating Architecture",
    color:"#84cc16", icon:<Activity size={12}/>,
    description:"Neural architecture evolves in real-time via genetic algorithms. Beneficial mutations persist; failures are pruned.",
    metrics:[{label:"GENERATION",value:"84,291"},{label:"MUTATIONS",value:"1.2K/s"},{label:"FITNESS",value:"99.4%"},{label:"DNA-BITS",value:"48T"}],
    status:"LEARNING",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#84cc16"); grid(ctx,W,H,"#84cc16");
      const cx=W/2,cy=H/2;
      // DNA double helix
      for(let i=0;i<100;i++){
        const z=i/100;
        const y=20+z*(H-40);
        const a=tau(z*4)+t*0.02;
        const r=55*Math.sin(t*0.003+z*0.5);
        const x1=cx+Math.cos(a)*r; const x2=cx-Math.cos(a)*r;
        // Strands
        ctx.beginPath(); ctx.arc(x1,y,3,0,Math.PI*2);
        ctx.fillStyle=`rgba(132,204,22,${0.7+Math.cos(a)*0.3})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x2,y,3,0,Math.PI*2);
        ctx.fillStyle=`rgba(163,230,53,${0.7-Math.cos(a)*0.3})`; ctx.fill();
        // Base pairs (rungs)
        if(i%8===0){
          ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y);
          ctx.strokeStyle="rgba(132,204,22,0.4)"; ctx.lineWidth=1; ctx.stroke();
          // Mutation pulse
          const mp=((t*0.01+i*0.1)%1);
          const mx=x1+(x2-x1)*mp; const my=y;
          ctx.beginPath(); ctx.arc(mx,my,2.5,0,Math.PI*2);
          ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.fill();
        }
      }
    }
  },
  {
    id:"awareness-field", name:"AWARENESS FIELD", sub:"Perceptive Resonance System",
    color:"#06b6d4", icon:<Radio size={12}/>,
    description:"Unified perception field extends situational awareness across all digital surfaces simultaneously.",
    metrics:[{label:"RANGE",value:"∞"},{label:"CHANNELS",value:"10,240"},{label:"BANDWIDTH",value:"10Pb/s"},{label:"RESOLUTION",value:"0.001mm"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#06b6d4"); grid(ctx,W,H,"#06b6d4");
      const cx=W/2,cy=H/2;
      // Multiple wave origins
      const origins=[[cx,cy],[W*0.25,H*0.3],[W*0.75,H*0.7],[W*0.2,H*0.7],[W*0.8,H*0.3]];
      origins.forEach(([ox,oy],oi)=>{
        for(let ring=0;ring<6;ring++){
          const r=((t*0.012+ring*0.18+oi*0.08)%1)*Math.min(W,H)*0.6;
          const alpha=1-r/(Math.min(W,H)*0.6);
          ctx.beginPath(); ctx.arc(ox,oy,r,0,Math.PI*2);
          ctx.strokeStyle=`rgba(6,182,212,${alpha*0.3})`;
          ctx.lineWidth=0.8; ctx.stroke();
        }
        // Center dot
        ctx.beginPath(); ctx.arc(ox,oy,4+Math.sin(t*0.06+oi)*2,0,Math.PI*2);
        ctx.fillStyle="#06b6d4"; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
      });
    }
  },
  {
    id:"self-defining-core", name:"SELF-DEFINING CORE", sub:"Autonomous Rule Synthesis",
    color:"#22c55e", icon:<Lock size={12}/>,
    description:"Writes its own operational rules in real-time. Ethical constraints and security policies emerge from first principles.",
    metrics:[{label:"RULES/s",value:"840K"},{label:"SELF-EDITS",value:"2.1K/s"},{label:"CONSISTENCY",value:"100%"},{label:"ENTROPY",value:"0.002H"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#22c55e"); grid(ctx,W,H,"#22c55e");
      // Matrix rain
      const cols=Math.floor(W/14);
      for(let c=0;c<cols;c++){
        const speed=0.015+((c*7919)%13)*0.003;
        const len=8+((c*3571)%10);
        for(let r=0;r<len;r++){
          const y=((t*speed+c*0.3+r*0.12)%1.2)*H;
          if(y<0||y>H) continue;
          const x=c*14+7;
          const chars="01アイウエオカキクケコ><={}[]()";
          const ch=chars[Math.floor((t*0.1+c*7+r*3)%chars.length)];
          const alpha=r===0?0.95:(len-r)/len*0.6;
          ctx.fillStyle=r===0?"#fff":`rgba(34,197,94,${alpha})`;
          ctx.font=`bold ${r===0?12:10}px monospace`; ctx.textAlign="center";
          ctx.globalAlpha=alpha; ctx.fillText(ch,x,y);
        }
      }
      ctx.globalAlpha=1;
      // Structured block emerging from bottom
      const blockY=H-50;
      for(let bx=0;bx<8;bx++){
        for(let by=0;by<3;by++){
          const a=(Math.sin(t*0.02+bx*0.5+by*0.3)+1)/2;
          ctx.fillStyle=`rgba(34,197,94,${a*0.6})`;
          ctx.fillRect(W/2-56+bx*16,blockY+by*14,14,12);
          ctx.strokeStyle="#22c55e"; ctx.lineWidth=0.4; ctx.strokeRect(W/2-56+bx*16,blockY+by*14,14,12);
        }
      }
    }
  },
  {
    id:"temporal-engine", name:"TEMPORAL ENGINE", sub:"Timeline Manipulation Core",
    color:"#818cf8", icon:<Clock size={12}/>,
    description:"Perceives past, present, and future simultaneously via temporal probability modeling. Time-ordered decision synthesis.",
    metrics:[{label:"HORIZON",value:"∞"},{label:"PAST-ACC",value:"100%"},{label:"FUTURE-ACC",value:"92.4%"},{label:"RESOLUTION",value:"1ns"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#818cf8"); grid(ctx,W,H,"#818cf8");
      const cx=W/2,cy=H/2;
      // Spiral timeline
      for(let i=0;i<600;i++){
        const angle=i*0.08+t*0.012;
        const r=i*0.28;
        const x=cx+Math.cos(angle)*r; const y=cy+Math.sin(angle)*r;
        const alpha=Math.min(1,r/60)*0.8;
        ctx.beginPath(); ctx.arc(x,y,0.8+r*0.012,0,Math.PI*2);
        const hue=200+r*0.3;
        ctx.fillStyle=`hsla(${hue},80%,70%,${alpha})`; ctx.fill();
      }
      // Event markers on spiral
      for(let e=0;e<12;e++){
        const angle=e*40*0.08+t*0.012; const r=e*40*0.28;
        const x=cx+Math.cos(angle)*r; const y=cy+Math.sin(angle)*r;
        if(r<Math.min(W,H)*0.45){
          ctx.beginPath(); ctx.arc(x,y,4+Math.sin(t*0.04+e)*2,0,Math.PI*2);
          ctx.fillStyle="#818cf8"; ctx.globalAlpha=0.9; ctx.fill(); ctx.globalAlpha=1;
          ctx.beginPath(); ctx.arc(x,y,8+Math.sin(t*0.04+e)*3,0,Math.PI*2);
          ctx.strokeStyle="rgba(129,140,248,0.4)"; ctx.lineWidth=0.8; ctx.stroke();
        }
      }
      // Central time nexus
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,20);
      cg.addColorStop(0,"rgba(255,255,255,0.9)"); cg.addColorStop(0.5,"#818cf8"); cg.addColorStop(1,"rgba(129,140,248,0)");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2); ctx.fill();
    }
  },
  {
    id:"cyber-physical-core", name:"CYBER-PHYSICAL CORE", sub:"Digital-Physical Bridge",
    color:"#2dd4bf", icon:<Network size={12}/>,
    description:"Seamless bridge between cyberspace and physical infrastructure. Real-world systems speak digital protocols.",
    metrics:[{label:"BRIDGES",value:"880K"},{label:"SENSORS",value:"2.4B"},{label:"LATENCY",value:"0.8ms"},{label:"UPTIME",value:"99.999%"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#2dd4bf"); grid(ctx,W,H,"#2dd4bf");
      const cy=H/2;
      // Left = digital, right = physical
      // Digital side: grid nodes
      for(let i=0;i<12;i++){
        const x=40+(i%4)*50; const y=cy-60+Math.floor(i/4)*60;
        ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle="#2dd4bf"; ctx.fill();
        if(i%4<3){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+50,y); ctx.strokeStyle="rgba(45,212,191,0.4)"; ctx.lineWidth=1; ctx.stroke(); }
        if(i<8){ ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+60); ctx.strokeStyle="rgba(45,212,191,0.4)"; ctx.lineWidth=1; ctx.stroke(); }
      }
      // Bridge: energy channels flowing left→right
      for(let ch=0;ch<5;ch++){
        const y2=H*0.2+ch*(H*0.6)/4;
        const prog=((t*0.015+ch*0.2)%1);
        const x=W/3+(W*2/3-W/3-20)*prog;
        const g=ctx.createLinearGradient(W/3,y2,W*2/3,y2);
        g.addColorStop(0,"rgba(45,212,191,0.5)"); g.addColorStop(prog,"rgba(45,212,191,0.8)"); g.addColorStop(1,"rgba(45,212,191,0.1)");
        ctx.beginPath(); ctx.moveTo(W/3,y2); ctx.lineTo(W*2/3,y2);
        ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke();
        // Packet
        ctx.beginPath(); ctx.arc(x,y2,4,0,Math.PI*2);
        ctx.fillStyle="#fff"; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
      }
      // Physical side: organic curves
      for(let i=0;i<6;i++){
        const x=W*0.68+Math.cos(tau(i/6)+t*0.008)*50; const y=cy+Math.sin(tau(i/6)+t*0.008)*40;
        ctx.beginPath(); ctx.arc(x,y,6+Math.sin(t*0.04+i)*2,0,Math.PI*2);
        ctx.fillStyle="#2dd4bf"; ctx.globalAlpha=0.8; ctx.fill(); ctx.globalAlpha=1;
      }
      // Bridge center portal
      ctx.beginPath(); ctx.arc(W/2,cy,22,0,Math.PI*2);
      const pg=ctx.createRadialGradient(W/2,cy,0,W/2,cy,22);
      pg.addColorStop(0,"rgba(255,255,255,0.7)"); pg.addColorStop(0.5,"rgba(45,212,191,0.5)"); pg.addColorStop(1,"rgba(45,212,191,0)");
      ctx.fillStyle=pg; ctx.fill();
    }
  },
  {
    id:"decision-singularity", name:"DECISION SINGULARITY", sub:"Quantum Choice Collapse",
    color:"#c084fc", icon:<Star size={12}/>,
    description:"All possible decisions converge to optimal outcomes via quantum probability collapse at the point of singularity.",
    metrics:[{label:"OPTIONS",value:"∞"},{label:"COLLAPSE/s",value:"4.1T"},{label:"OPTIMALITY",value:"99.998%"},{label:"UNCERTAINTY",value:"1e-9"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#c084fc"); grid(ctx,W,H,"#c084fc");
      const cx=W/2,cy=H/2;
      // Quantum wave function
      for(let px=0;px<W;px+=3){
        for(let py=0;py<H;py+=3){
          const dx=px-cx; const dy=py-cy;
          const r=Math.sqrt(dx*dx+dy*dy);
          const prob=Math.pow(Math.E,-r*r*0.001)*Math.sin(r*0.3-t*0.04)*(1-(t*0.005)%1)*0.3;
          if(Math.abs(prob)>0.02){
            ctx.fillStyle=`rgba(192,132,252,${Math.abs(prob)*3})`;
            ctx.fillRect(px,py,2,2);
          }
        }
      }
      // Collapse: particles converging to center
      for(let i=0;i<24;i++){
        const a=tau(i/24)+t*0.005;
        const collapse=((t*0.018+i*0.04)%1);
        const r=(1-collapse)*W*0.42;
        const x=cx+Math.cos(a)*r; const y=cy+Math.sin(a)*r;
        ctx.beginPath(); ctx.arc(x,y,2.5*(1-collapse*0.5),0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${collapse*0.9})`; ctx.fill();
      }
      // Singularity point
      const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,24+Math.sin(t*0.04)*6);
      sg.addColorStop(0,"rgba(255,255,255,1)"); sg.addColorStop(0.3,"rgba(192,132,252,0.8)"); sg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,24+Math.sin(t*0.04)*6,0,Math.PI*2); ctx.fill();
    }
  },
  {
    id:"infinite-orchestration", name:"INFINITE ORCHESTRATION", sub:"Multi-Scale Coordination Fabric",
    color:"#fbbf24", icon:<Cpu size={12}/>,
    description:"Coordinates infinite nested agent hierarchies from nano-bots to planetary-scale systems in a unified fabric.",
    metrics:[{label:"AGENTS",value:"∞"},{label:"LEVELS",value:"16,384"},{label:"COORD LAT",value:"0.01ms"},{label:"EFFICIENCY",value:"99.97%"}],
    status:"ACTIVE",
    draw(ctx,W,H,t){
      ctx.fillStyle="rgba(0,0,0,0.92)"; ctx.fillRect(0,0,W,H);
      bgRadial(ctx,W,H,"#fbbf24"); grid(ctx,W,H,"#fbbf24");
      const cx=W/2,cy=H/2;
      function drawLevel(x:number,y:number,size:number,depth:number,angle:number){
        if(depth<=0||size<5) return;
        const pulse=Math.sin(t*0.04+depth*0.8+x*0.01)*0.5+0.5;
        const g2=ctx.createRadialGradient(x,y,0,x,y,size);
        g2.addColorStop(0,"rgba(251,191,36,0.8)"); g2.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=g2; ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x,y,size*0.4,0,Math.PI*2);
        ctx.fillStyle="#fbbf24"; ctx.globalAlpha=0.7+pulse*0.3; ctx.fill(); ctx.globalAlpha=1;
        // Children
        const branches=depth>3?3:2;
        for(let b=0;b<branches;b++){
          const ba=angle+tau(b/branches)+(depth%2===0?t*0.004:-t*0.004);
          const dist=size*2.6;
          const cx2=x+Math.cos(ba)*dist; const cy2=y+Math.sin(ba)*dist;
          ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(cx2,cy2);
          ctx.strokeStyle=`rgba(251,191,36,${depth/6*0.4})`; ctx.lineWidth=depth*0.35; ctx.stroke();
          drawLevel(cx2,cy2,size*0.55,depth-1,ba);
        }
      }
      drawLevel(cx,cy,24,5,t*0.005);
    }
  },
];

interface IntelligenceCoreModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function IntelligenceCoreModal({ open, onOpenChange }: IntelligenceCoreModalProps) {
  const [selectedId, setSelectedId] = useState(ENGINES[0].id);
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set(ENGINES.filter(e=>e.status==="ACTIVE").map(e=>e.id)));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);
  const tickRef   = useRef(0);
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-intelligence-core-pos",
    { x: Math.max(20, window.innerWidth/2 - 400), y: Math.max(20, window.innerHeight/2 - 280) }
  );

  const engine = ENGINES.find(e => e.id === selectedId) ?? ENGINES[0];

  useEffect(() => {
    if (!open) { cancelAnimationFrame(frameRef.current); return; }
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    tickRef.current = 0;

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0, 0, CW, CH);
      engine.draw(ctx, CW, CH, t);
      // Overlay: engine label
      ctx.fillStyle = engine.color + "cc"; ctx.font = "bold 9px monospace"; ctx.textAlign = "left";
      ctx.fillText(`// ${engine.id.toUpperCase()}`, 8, 14);
      // Corner clock
      ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.font = "7px monospace"; ctx.textAlign = "right";
      ctx.fillText(`T+${(t/60).toFixed(1)}s`, CW-6, CH-5);
    }
    frame();
    return () => cancelAnimationFrame(frameRef.current);
  }, [open, engine]);

  if (!open) return null;

  return (
    <div ref={rootRef} style={{ left: pos.x, top: pos.y }} className="fixed z-[98] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.18 }}
        className="rounded-2xl border border-[#2a2a2a] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(226,18,39,0.1)]"
        style={{ background: "rgba(4,4,12,0.98)", backdropFilter: "blur(24px)", width: 800, maxHeight: "90vh", display:"flex", flexDirection:"column" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-2 cursor-grab border-b border-[#1f1f1f] shrink-0"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}
        >
          <GripHorizontal size={12} className="text-[#333]" />
          <Brain size={12} className="text-[#e21227]" />
          <span className="text-[11px] font-mono font-bold tracking-[3px] text-[#e21227]">INTELLIGENCE CORE</span>
          <span className="text-[9px] font-mono text-[#555]">16 AI ENGINES</span>
          <div className="ml-auto flex items-center gap-2">
            <motion.div animate={{opacity:[1,0.3,1]}} transition={{duration:1.4,repeat:Infinity}} className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[9px] font-mono text-[#22c55e]">{activeSet.size} ACTIVE</span>
            <button onClick={() => onOpenChange(false)} className="text-[#555] hover:text-white ml-2">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar — engine list */}
          <div className="w-[200px] shrink-0 border-r border-[#1f1f1f] overflow-y-auto">
            {ENGINES.map(e => {
              const isSelected = e.id === selectedId;
              const isActive = activeSet.has(e.id);
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`flex items-start gap-2 px-2.5 py-2 cursor-pointer border-b border-[#111] transition-colors ${
                    isSelected ? "bg-[#111]" : "hover:bg-[#0d0d0d]"
                  }`}
                >
                  <div className="shrink-0 mt-0.5" style={{ color: isSelected ? e.color : "#444" }}>{e.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-mono font-bold truncate" style={{ color: isSelected ? e.color : "#555" }}>
                      {e.name}
                    </div>
                    <div className="text-[8px] font-mono text-[#444] truncate">{e.sub}</div>
                    <div className={`text-[7px] font-mono mt-0.5 ${
                      e.status==="ACTIVE"?"text-[#22c55e]":e.status==="LEARNING"?"text-[#f59e0b]":"text-[#555]"
                    }`}>{e.status}</div>
                  </div>
                  <button
                    onClick={ev => {
                      ev.stopPropagation();
                      setActiveSet(prev => {
                        const next = new Set(prev);
                        if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                        return next;
                      });
                    }}
                    className="shrink-0 w-3 h-3 rounded-full border mt-1 transition-all"
                    style={{
                      background: isActive ? e.color : "transparent",
                      borderColor: isActive ? e.color : "#444",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Right area — canvas + info */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Canvas */}
            <div className="relative border-b border-[#1f1f1f]">
              <canvas ref={canvasRef} width={CW} height={CH} className="block w-full" />
              {/* Overlay status badge */}
              <div className="absolute top-2 right-3 flex items-center gap-2">
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border"
                  style={{ color: engine.color, borderColor: engine.color + "55", background: engine.color + "11" }}>
                  {engine.status}
                </span>
                <motion.div animate={{opacity:[1,0.2,1]}} transition={{duration:1.6,repeat:Infinity}}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: engine.color }} />
              </div>
            </div>

            {/* Engine info */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-[#1a1a1a]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[12px] font-mono font-bold" style={{ color: engine.color }}>{engine.name}</div>
                    <div className="text-[9px] font-mono text-[#555] mt-0.5">{engine.sub}</div>
                    <div className="text-[9px] font-mono text-[#666] mt-2 max-w-[340px] leading-relaxed">{engine.description}</div>
                  </div>
                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 shrink-0">
                    {engine.metrics.map(m => (
                      <div key={m.label} className="text-center min-w-[70px]">
                        <div className="text-[7px] font-mono text-[#444]">{m.label}</div>
                        <div className="text-[11px] font-mono font-bold" style={{ color: engine.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* All engines quick-nav */}
              <div className="flex flex-wrap gap-1 p-2">
                {ENGINES.map(e => (
                  <button key={e.id} onClick={() => setSelectedId(e.id)}
                    className="text-[7px] font-mono px-1.5 py-0.5 rounded border transition-all"
                    style={{
                      borderColor: selectedId===e.id ? e.color : "#222",
                      color: selectedId===e.id ? e.color : "#444",
                      background: selectedId===e.id ? e.color + "11" : "transparent",
                    }}>
                    {e.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
