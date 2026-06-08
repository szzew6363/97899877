import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { Shield, Terminal, Zap, Eye, Brain, Lock, ChevronRight, Server, Code2, Crosshair, Cpu, Activity, Globe } from "lucide-react";
import { MatrixRain } from "@/components/MatrixRain";
import { HoloCoreOrb } from "@/components/HoloCoreOrb";
import { Cyber3DGrid } from "@/components/Cyber3DGrid";

/* ── 3D PARTICLE SYSTEM ── */
interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; alpha: number; color: string; type: "dot" | "cross" | "ring";
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#e21227", "#ff3c3c", "#ff6b35", "rgba(226,18,39,0.6)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0.2)"];
    const TYPES: Particle["type"][] = ["dot", "dot", "dot", "cross", "ring"];

    particles.current = Array.from({ length: 180 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: -0.5 - Math.random() * 1.5,
      r: 1 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
    }));

    function onMouse(e: MouseEvent) {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    }
    window.addEventListener("mousemove", onMouse);

    function draw() {
      const w = canvas!.width; const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);

      const focalLength = 600;
      const mx = (mouseRef.current.x - 0.5) * 30;
      const my = (mouseRef.current.y - 0.5) * 20;

      particles.current.forEach(p => {
        // Update
        p.z += p.vz;
        p.x += p.vx + mx * 0.002;
        p.y += p.vy + my * 0.002;

        if (p.z <= 0) p.z = 1000;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Project to 2D
        const scale = focalLength / (focalLength + p.z);
        const px = (p.x - w / 2) * scale + w / 2;
        const py = (p.y - h / 2) * scale + h / 2;
        const r = Math.max(0.3, p.r * scale);
        const alpha = p.alpha * scale * 0.8;

        ctx.globalAlpha = Math.min(1, alpha);

        if (p.type === "dot") {
          // Glow
          const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
          grd.addColorStop(0, p.color);
          grd.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(px, py, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.type === "cross") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * 0.5;
          ctx.beginPath();
          ctx.moveTo(px - r * 3, py); ctx.lineTo(px + r * 3, py);
          ctx.moveTo(px, py - r * 3); ctx.lineTo(px, py + r * 3);
          ctx.stroke();
        } else {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * 0.4;
          ctx.beginPath();
          ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });

      // Draw connection lines between nearby particles
      const pts = particles.current;
      for (let i = 0; i < pts.length; i++) {
        const focalLength2 = 600;
        const scale1 = focalLength2 / (focalLength2 + pts[i].z);
        const px1 = (pts[i].x - canvas!.width / 2) * scale1 + canvas!.width / 2;
        const py1 = (pts[i].y - canvas!.height / 2) * scale1 + canvas!.height / 2;
        for (let j = i + 1; j < Math.min(pts.length, i + 8); j++) {
          const scale2 = focalLength2 / (focalLength2 + pts[j].z);
          const px2 = (pts[j].x - canvas!.width / 2) * scale2 + canvas!.width / 2;
          const py2 = (pts[j].y - canvas!.height / 2) * scale2 + canvas!.height / 2;
          const dx = px1 - px2; const dy = py1 - py2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.globalAlpha = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = "#e21227";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px1, py1);
            ctx.lineTo(px2, py2);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

const features = [
  { icon: Brain, title: "ذكاء اصطناعي متخصص", desc: "نماذج مدرّبة خصيصاً على الأمن السيبراني — اختبار الاختراق، تحليل الثغرات، والأوامر الهجومية.", color: "#e21227" },
  { icon: Terminal, title: "ترمينال تفاعلي", desc: "طرفية أوامر مدمجة في المتصفح تتيح تنفيذ أوامر Shell بشكل مباشر داخل جلسة الذكاء الاصطناعي.", color: "#ff6b35" },
  { icon: Eye, title: "وحدة OSINT المتقدمة", desc: "جمع المعلومات مفتوحة المصدر، تحليل المواقع، وتتبع البصمة الرقمية بدقة عالية.", color: "#e21227" },
  { icon: Crosshair, title: "أسلوب Red Team", desc: "محاكاة هجمات حقيقية، تقييم الدفاعات، وتحليل نقاط الضعف من منظور المهاجم.", color: "#ff6b35" },
  { icon: Server, title: "وضع المجلس — Council Mode", desc: "6 عقول متخصصة تعمل في آنٍ واحد على مسألة واحدة: مخترق، محلل، مطور، محقق جنائي، وأكثر.", color: "#e21227" },
  { icon: Code2, title: "ترسانة Arsenal", desc: "+70 أداة متخصصة: JARVIS، Parseltongue، RAGFlow، NexusAI، وأدوات هجومية ودفاعية متكاملة.", color: "#ff6b35" },
];

const models = [
  { name: "CHAT-GPT Fast", tag: "سريع", color: "#3b82f6" },
  { name: "CHAT-GPT Thinking", tag: "تفكير عميق", color: "#a855f7" },
  { name: "CHAT-GPT Coder", tag: "برمجة", color: "#22c55e" },
  { name: "CHAT-GPT Researcher", tag: "بحث", color: "#eab308" },
  { name: "KaliGPT Red Team", tag: "هجومي", color: "#e21227" },
  { name: "GodMode", tag: "لا حدود", color: "#f97316" },
];

const faqs = [
  { q: "هل يمكن استخدام KaliGPT للأغراض التعليمية فقط؟", a: "نعم. KaliGPT مصمم للباحثين الأمنيين والمختبرين المرخصين وطلاب الأمن السيبراني في بيئات اختبار قانونية فقط." },
  { q: "ما الفرق بين KaliGPT وChatGPT العادي؟", a: "KaliGPT مخصص 100% للأمن السيبراني ويمتلك قاعدة معرفية بالأدوات الهجومية والدفاعية، بينما ChatGPT نموذج عام متحفظ." },
  { q: "هل بياناتي محفوظة أم تُعالج محلياً؟", a: "تُرسل المحادثات إلى الخادم لمعالجتها عبر نموذج اللغة. لا نحتفظ بمحتوى المحادثات بعد انتهاء الجلسة." },
];

function HolographicCard({ children, className = "", style = {} }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setRot({ x: -dy * 8, y: dx * 8 });
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        perspective: "1000px",
        ...style,
      }}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setRot({ x: 0, y: 0 }); }}
    >
      <div style={{
        transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) ${hovered ? "translateZ(8px)" : "translateZ(0px)"}`,
        transformStyle: "preserve-3d",
        transition: hovered ? "none" : "transform 0.5s cubic-bezier(0.23,1,0.32,1)",
        willChange: "transform",
      }}>
        {children}
      </div>
    </div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(226,18,39,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(226,18,39,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        transform: "perspective(600px) rotateX(35deg) scaleX(1.6)",
        transformOrigin: "50% 0%",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
      }} />
    </div>
  );
}

function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.4), rgba(255,255,255,0.15), rgba(226,18,39,0.4), transparent)",
        animation: "scanline 6s linear infinite",
        boxShadow: "0 0 20px rgba(226,18,39,0.3)",
      }} />
    </div>
  );
}

function FloatingOrb({ size, x, y, color, delay }: { size: number; x: string; y: string; color: string; delay: number }) {
  return (
    <div style={{
      position: "absolute",
      left: x, top: y,
      width: size, height: size,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${color}30, ${color}08 60%, transparent 80%)`,
      border: `1px solid ${color}20`,
      animation: `orbFloat ${4 + delay}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      boxShadow: `0 0 ${size * 0.8}px ${color}15, inset 0 0 ${size * 0.3}px ${color}10`,
      pointerEvents: "none",
    }} />
  );
}

export default function LandingPage() {
  const [, navigate] = useLocation();
  const [counter, setCounter] = useState({ users: 0, attacks: 0, uptime: 0 });

  useEffect(() => {
    const target = { users: 12847, attacks: 3421, uptime: 99 };
    const duration = 2000;
    const steps = 60;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const p = step / steps;
      const ease = 1 - Math.pow(1 - p, 3);
      setCounter({
        users: Math.round(target.users * ease),
        attacks: Math.round(target.attacks * ease),
        uptime: Math.round(target.uptime * ease),
      });
      if (step >= steps) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      color: "#fff",
      fontFamily: "'Inter', sans-serif",
      overflowX: "hidden",
      position: "relative",
    }}>
      <style>{`
        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes orbFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes pulse3d {
          0%, 100% { box-shadow: 0 0 20px rgba(226,18,39,0.3), 0 0 60px rgba(226,18,39,0.1); }
          50% { box-shadow: 0 0 40px rgba(226,18,39,0.6), 0 0 120px rgba(226,18,39,0.2); }
        }
        @keyframes rotateHex {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dataFlow {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes glitch {
          0%, 100% { clip-path: inset(0 0 100% 0); transform: translate(0); }
          20% { clip-path: inset(30% 0 50% 0); transform: translate(-3px, 1px); }
          40% { clip-path: inset(60% 0 20% 0); transform: translate(3px, -1px); }
          60% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); }
          80% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
        }
        @keyframes holoshimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes neonFlicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
          96% { opacity: 0.7; }
          97% { opacity: 1; }
        }
        @keyframes float3d {
          0%, 100% { transform: translateY(0px) rotateX(0deg); }
          33% { transform: translateY(-12px) rotateX(2deg); }
          66% { transform: translateY(-6px) rotateX(-1deg); }
        }
        @keyframes terminalBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .neon-text-red {
          color: #e21227;
          text-shadow: 0 0 10px rgba(226,18,39,0.8), 0 0 30px rgba(226,18,39,0.4), 0 0 60px rgba(226,18,39,0.2);
          animation: neonFlicker 8s infinite;
        }
        .holo-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .holo-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%);
          animation: holoshimmer 3s linear infinite;
        }
        .holo-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 32px rgba(226,18,39,0.5), 0 0 0 1px rgba(226,18,39,0.8);
        }
        .card-3d {
          transition: transform 0.1s ease;
        }
        .glass-panel {
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(226,18,39,0.15);
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(226,18,39,0.08);
        }
        .glass-panel:hover {
          border-color: rgba(226,18,39,0.35);
          box-shadow: 0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(226,18,39,0.1);
        }
      `}</style>

      <ParticleCanvas />
      {/* DATA STREAMS background */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${10 + i * 12}%`,
            top: 0,
            width: "1px",
            height: "120px",
            background: "linear-gradient(to bottom, transparent, rgba(226,18,39,0.4), transparent)",
            animation: `dataFlow ${3 + i * 0.7}s linear infinite`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
        <FloatingOrb size={500} x="-10%" y="5%" color="#e21227" delay={0} />
        <FloatingOrb size={300} x="70%" y="20%" color="#ff6b35" delay={1.5} />
        <FloatingOrb size={200} x="40%" y="60%" color="#e21227" delay={3} />
      </div>

      {/* NAV */}
      <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "linear-gradient(180deg, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.90) 100%)",
        borderBottom: "1px solid rgba(226,18,39,0.2)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 1px 0 rgba(226,18,39,0.15), 0 4px 30px rgba(0,0,0,0.6)",
      }}>
        {/* Bottom neon line */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.6) 30%, rgba(255,100,50,0.4) 50%, rgba(226,18,39,0.6) 70%, transparent)",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* 3D Logo */}
          <div style={{
            width: "36px", height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #e21227 0%, #ff6b35 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(226,18,39,0.5), 0 4px 12px rgba(226,18,39,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            transform: "perspective(100px) rotateX(5deg)",
            animation: "pulse3d 3s ease-in-out infinite",
          }}>
            <Shield style={{ width: "18px", height: "18px", color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.5px" }}>KaliGPT</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginLeft: "2px" }}>mr7.ai</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            {["Roadmap", "FAQ", "Contact"].map((item, i) => (
              <button key={i}
                onClick={() => navigate(`/${item.toLowerCase()}`)}
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontSize: "13px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.2s",
                  letterSpacing: "0.3px",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >{item}</button>
            ))}
          </div>
          <button
            onClick={() => navigate("/app")}
            className="holo-btn"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 20px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #e21227 0%, #c4101f 100%)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(226,18,39,0.35), 0 4px 12px rgba(226,18,39,0.2)",
            }}
          >
            Launch App <ChevronRight style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        position: "relative",
        paddingTop: "120px",
        paddingBottom: "80px",
        paddingLeft: "24px",
        paddingRight: "24px",
        zIndex: 10,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}>
        {/* Matrix rain — very subtle behind hero */}
        <MatrixRain opacity={0.07} color="#e21227" speed={0.7} density={0.6} style={{ zIndex: 0 }} />
        <Cyber3DGrid opacity={0.45} color="#e21227" style={{ zIndex: 1 }} />
        <ScanLine />

        {/* HoloCoreOrb — floating right side desktop */}
        <div style={{
          position: "absolute",
          right: "clamp(2%, 6%, 120px)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 3,
          opacity: 0.9,
          pointerEvents: "none",
          display: "none",
        }} className="hero-orb-desktop">
          <HoloCoreOrb
            size={320}
            color="#e21227"
            stats={[
              { label: "Models", value: "15+" },
              { label: "Modes", value: "18" },
              { label: "Brains", value: "105" },
              { label: "Uptime", value: "99%" },
            ]}
          />
        </div>

        {/* Left side floating data stream */}
        <div style={{
          position: "absolute",
          left: "clamp(2%, 4%, 60px)",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 3,
          opacity: 0.4,
          pointerEvents: "none",
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#e21227",
          lineHeight: 2,
          letterSpacing: "0.5px",
        }} className="hero-data-stream">
          {["0xDEADBEEF", "CVE-2024-1234", "SHELL::REVERSE", "OSINT::SCAN", "AGENT::LOOP", "NET::INTERCEPT", "FUZZ::TARGET", "MEM::INJECT", "0xCAFEBABE", "KERNEL::EXPLOIT"].map((line, i) => (
            <div key={i} style={{ opacity: 0.3 + (i % 3) * 0.2 }}>{line}</div>
          ))}
        </div>

        {/* Main glow */}
        <div style={{
          position: "absolute",
          top: "10%", left: "50%",
          transform: "translateX(-50%)",
          width: "900px", height: "600px",
          background: "radial-gradient(ellipse at center, rgba(226,18,39,0.12) 0%, rgba(226,18,39,0.04) 40%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderRadius: "100px",
          border: "1px solid rgba(226,18,39,0.4)",
          background: "linear-gradient(135deg, rgba(226,18,39,0.12) 0%, rgba(226,18,39,0.05) 100%)",
          color: "#e21227",
          fontSize: "11px",
          fontFamily: "monospace",
          marginBottom: "28px",
          boxShadow: "0 0 20px rgba(226,18,39,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#e21227", boxShadow: "0 0 8px #e21227", animation: "neonFlicker 3s infinite" }} />
          v2.0 — Arsenal Mode Active
        </div>

        {/* Title 3D */}
        <div style={{ marginBottom: "20px", perspective: "800px" }}>
          <h1 style={{
            fontSize: "clamp(64px, 10vw, 120px)",
            fontWeight: 900,
            letterSpacing: "-4px",
            lineHeight: 1,
            transform: "perspective(600px) rotateX(3deg)",
            transformStyle: "preserve-3d",
            display: "inline-block",
          }}>
            <span style={{
              color: "#fff",
              textShadow: "0 4px 20px rgba(255,255,255,0.1), 0 1px 0 rgba(255,255,255,0.5)",
              display: "inline-block",
              transform: "translateZ(20px)",
            }}>Kali</span>
            <span className="neon-text-red" style={{
              display: "inline-block",
              transform: "translateZ(40px)",
              letterSpacing: "-4px",
            }}>GPT</span>
          </h1>
        </div>

        <p style={{
          fontSize: "clamp(16px, 2.5vw, 22px)",
          color: "rgba(255,255,255,0.55)",
          fontWeight: 300,
          marginBottom: "12px",
          maxWidth: "600px",
        }}>
          مساعدك الذكي المتقدم في اختبارات الاختراق وتحليل الثغرات
        </p>
        <p style={{
          fontSize: "12px",
          color: "rgba(255,255,255,0.25)",
          fontFamily: "monospace",
          marginBottom: "44px",
          letterSpacing: "1px",
        }}>
          Offensive AI · Red Team · OSINT · Arsenal · Council Mode
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginBottom: "70px" }}>
          <button
            onClick={() => navigate("/app")}
            className="holo-btn"
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "16px 36px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 40px rgba(226,18,39,0.45), 0 8px 24px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
              animation: "pulse3d 3s ease-in-out infinite",
            }}
          >
            <Terminal style={{ width: "20px", height: "20px" }} />
            ابدأ الآن — مجاناً
          </button>
          <button
            onClick={() => navigate("/roadmap")}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "16px 36px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.7)",
              fontSize: "16px",
              fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(226,18,39,0.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)"; }}
          >
            خريطة الطريق
          </button>
        </div>

        {/* 3D Terminal */}
        <div style={{
          width: "100%",
          maxWidth: "720px",
          animation: "float3d 6s ease-in-out infinite",
          perspective: "1200px",
        }}>
          <div style={{
            borderRadius: "16px",
            border: "1px solid rgba(226,18,39,0.25)",
            overflow: "hidden",
            background: "linear-gradient(180deg, #111 0%, #0d0d0d 100%)",
            boxShadow: `
              0 40px 80px rgba(0,0,0,0.7),
              0 0 0 1px rgba(226,18,39,0.1),
              0 0 60px rgba(226,18,39,0.1),
              inset 0 1px 0 rgba(255,255,255,0.06)
            `,
            transform: "perspective(1200px) rotateX(4deg)",
            transformStyle: "preserve-3d",
          }}>
            {/* Terminal header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "12px 18px",
              borderBottom: "1px solid rgba(226,18,39,0.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f57", boxShadow: "0 0 6px rgba(255,95,87,0.6)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e", boxShadow: "0 0 6px rgba(255,189,46,0.4)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28ca41", boxShadow: "0 0 6px rgba(40,202,65,0.4)" }} />
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>kaligpt@mr7 ~ $</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "rgba(226,18,39,0.6)", fontFamily: "monospace", border: "1px solid rgba(226,18,39,0.2)", padding: "1px 6px", borderRadius: "4px" }}>RED TEAM</span>
              </div>
            </div>
            {/* Terminal body */}
            <div style={{ padding: "20px 22px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.8" }}>
              <p>
                <span style={{ color: "#e21227", textShadow: "0 0 8px rgba(226,18,39,0.5)" }}>user@kali</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>:~$</span>
                <span style={{ color: "rgba(255,255,255,0.8)", marginLeft: "8px" }}>scan --target example.com --mode recon</span>
              </p>
              <p style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.4)" }}>[✓] Initializing KaliGPT Red Team module...</p>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>[*] Running OSINT sweep on target...</p>
              <p style={{ color: "#60a5fa", textShadow: "0 0 8px rgba(96,165,250,0.4)" }}>[&gt;] Found 3 subdomains, 12 open ports, 2 critical CVEs</p>
              <p style={{ color: "#fbbf24", textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>[!] CVE-2024-1234 — CVSS 9.8 — Remote Code Execution</p>
              <p style={{ color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>█</span>
                <span style={{ animation: "terminalBlink 1s step-end infinite" }}>_</span>
              </p>
            </div>
          </div>
          {/* Terminal glow reflection */}
          <div style={{
            height: "40px",
            marginTop: "-1px",
            background: "linear-gradient(to bottom, rgba(226,18,39,0.06), transparent)",
            borderRadius: "0 0 16px 16px",
            filter: "blur(8px)",
          }} />
        </div>

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: "40px",
          marginTop: "60px",
          justifyContent: "center",
          flexWrap: "wrap",
        }}>
          {[
            { value: counter.users.toLocaleString(), label: "باحث أمني نشط", icon: Activity },
            { value: `${counter.attacks.toLocaleString()}+`, label: "هجوم محاكَى", icon: Crosshair },
            { value: `${counter.uptime}%`, label: "وقت تشغيل", icon: Cpu },
          ].map(({ value, label, icon: Icon }, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "4px" }}>
                <Icon style={{ width: "14px", height: "14px", color: "#e21227" }} />
                <span style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{value}</span>
              </div>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES — 3D Cards */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div style={{
              display: "inline-block",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "#e21227",
              border: "1px solid rgba(226,18,39,0.3)",
              padding: "4px 14px",
              borderRadius: "100px",
              marginBottom: "16px",
              background: "rgba(226,18,39,0.08)",
            }}>CAPABILITIES</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>لماذا KaliGPT؟</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", maxWidth: "480px", margin: "0 auto" }}>بُنيَ من الصفر للمختصين الأمنيين — ليس ChatGPT معدَّلاً</p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}>
            {features.map((f, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div className="glass-panel" style={{
                  padding: "28px",
                  borderRadius: "20px",
                  cursor: "default",
                  transition: "border-color 0.3s, box-shadow 0.3s",
                }}>
                  {/* Icon */}
                  <div style={{
                    width: "48px", height: "48px",
                    borderRadius: "14px",
                    background: `linear-gradient(135deg, ${f.color}20 0%, ${f.color}08 100%)`,
                    border: `1px solid ${f.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: "20px",
                    boxShadow: `0 0 20px ${f.color}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
                    transform: "translateZ(10px)",
                  }}>
                    <f.icon style={{ width: "22px", height: "22px", color: f.color }} />
                  </div>
                  {/* Number badge */}
                  <div style={{
                    position: "absolute",
                    top: "20px", right: "20px",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "rgba(255,255,255,0.15)",
                    fontWeight: 700,
                  }}>0{i + 1}</div>
                  <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px", letterSpacing: "-0.3px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{f.desc}</p>
                  {/* Bottom accent line */}
                  <div style={{
                    position: "absolute",
                    bottom: 0, left: "28px", right: "28px",
                    height: "1px",
                    background: `linear-gradient(90deg, transparent, ${f.color}30, transparent)`,
                  }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* MODELS */}
      <section style={{
        padding: "100px 24px",
        position: "relative",
        zIndex: 10,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div style={{
            display: "inline-block",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#e21227",
            border: "1px solid rgba(226,18,39,0.3)",
            padding: "4px 14px",
            borderRadius: "100px",
            marginBottom: "16px",
            background: "rgba(226,18,39,0.08)",
          }}>AI MODELS</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>نماذج متخصصة لكل مهمة</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "52px" }}>اختر النموذج المناسب أو شغّل عدة نماذج في آنٍ واحد</p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}>
            {models.map((m, i) => (
              <HolographicCard key={i} style={{ borderRadius: "16px" }}>
                <div className="glass-panel" style={{
                  padding: "22px 20px",
                  borderRadius: "16px",
                  textAlign: "left",
                  cursor: "default",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{
                      width: "8px", height: "8px",
                      borderRadius: "50%",
                      background: m.color,
                      boxShadow: `0 0 8px ${m.color}`,
                    }} />
                    <span style={{
                      fontSize: "10px",
                      fontFamily: "monospace",
                      color: m.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 700,
                    }}>{m.tag}</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "-0.3px" }}>{m.name}</div>
                  {/* Glow accent */}
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: "2px",
                    borderRadius: "16px 16px 0 0",
                    background: `linear-gradient(90deg, transparent, ${m.color}50, transparent)`,
                  }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{
        padding: "100px 24px",
        position: "relative",
        zIndex: 10,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
          <div style={{
            display: "inline-block",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "#e21227",
            border: "1px solid rgba(226,18,39,0.3)",
            padding: "4px 14px",
            borderRadius: "100px",
            marginBottom: "16px",
            background: "rgba(226,18,39,0.08)",
          }}>PRICING</div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>ابدأ مجاناً</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "52px" }}>خطط مرنة للأفراد والفرق الأمنية</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {[
              { name: "Free", price: "$0", features: ["50k رمز/يوم", "النماذج الأساسية", "ترمينال محدود"], highlight: false },
              { name: "Pro", price: "$19", features: ["500k رمز/يوم", "كل النماذج", "Arsenal كامل", "OSINT متقدم"], highlight: true },
              { name: "Elite", price: "$49", features: ["نقاط غير محدودة", "Council Mode", "API Access", "أولوية الدعم"], highlight: false },
            ].map((plan, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div style={{
                  padding: "32px 28px",
                  borderRadius: "20px",
                  background: plan.highlight
                    ? "linear-gradient(135deg, rgba(226,18,39,0.12) 0%, rgba(226,18,39,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                  border: plan.highlight
                    ? "1px solid rgba(226,18,39,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: plan.highlight
                    ? "0 0 40px rgba(226,18,39,0.12), 0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
                  position: "relative",
                }}>
                  {plan.highlight && (
                    <div style={{
                      position: "absolute",
                      top: "-1px", left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(90deg, #e21227, #ff6b35)",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "3px 14px",
                      borderRadius: "0 0 8px 8px",
                      letterSpacing: "0.5px",
                    }}>الأكثر شيوعاً</div>
                  )}
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "1px", fontFamily: "monospace" }}>{plan.name.toUpperCase()}</div>
                  <div style={{ marginBottom: "24px" }}>
                    <span style={{ fontSize: "42px", fontWeight: 900, letterSpacing: "-2px", color: plan.highlight ? "#e21227" : "#fff" }}>{plan.price}</span>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", marginLeft: "4px" }}>/شهر</span>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", textAlign: "right" }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start", padding: "6px 0", fontSize: "13px", color: "rgba(255,255,255,0.55)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#e21227", fontWeight: 700, fontSize: "14px" }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate("/app")}
                    className="holo-btn"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      background: plan.highlight
                        ? "linear-gradient(135deg, #e21227 0%, #c4101f 100%)"
                        : "rgba(255,255,255,0.05)",
                      color: plan.highlight ? "#fff" : "rgba(255,255,255,0.6)",
                      fontSize: "13px",
                      fontWeight: 600,
                      border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                      boxShadow: plan.highlight ? "0 0 20px rgba(226,18,39,0.35)" : "none",
                    }}
                  >ابدأ الآن</button>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{
        padding: "100px 24px",
        position: "relative",
        zIndex: 10,
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <div style={{
              display: "inline-block",
              fontSize: "11px",
              fontFamily: "monospace",
              color: "#e21227",
              border: "1px solid rgba(226,18,39,0.3)",
              padding: "4px 14px",
              borderRadius: "100px",
              marginBottom: "16px",
              background: "rgba(226,18,39,0.08)",
            }}>FAQ</div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>أسئلة شائعة</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {faqs.map((item, i) => (
              <HolographicCard key={i} style={{ borderRadius: "16px" }}>
                <div className="glass-panel" style={{ padding: "24px", borderRadius: "16px", cursor: "default" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <span style={{
                      minWidth: "24px", height: "24px",
                      borderRadius: "8px",
                      background: "rgba(226,18,39,0.12)",
                      border: "1px solid rgba(226,18,39,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, color: "#e21227",
                      marginTop: "2px",
                    }}>Q</span>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px", color: "#fff" }}>{item.q}</h3>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>{item.a}</p>
                    </div>
                  </div>
                </div>
              </HolographicCard>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button onClick={() => navigate("/faq")} style={{ fontSize: "13px", color: "#e21227", background: "none", border: "none", cursor: "pointer" }}>
              عرض كل الأسئلة ←
            </button>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{
        padding: "100px 24px",
        position: "relative",
        zIndex: 10,
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          {/* 3D Hexagon */}
          <div style={{
            width: "80px", height: "80px",
            margin: "0 auto 32px",
            position: "relative",
            animation: "pulse3d 3s ease-in-out infinite",
          }}>
            <div style={{
              width: "80px", height: "80px",
              borderRadius: "22px",
              background: "linear-gradient(135deg, rgba(226,18,39,0.2) 0%, rgba(226,18,39,0.05) 100%)",
              border: "1px solid rgba(226,18,39,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 40px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
              transform: "perspective(200px) rotateX(15deg)",
            }}>
              <Zap style={{ width: "36px", height: "36px", color: "#e21227" }} />
            </div>
          </div>

          <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-2px", marginBottom: "16px" }}>جاهز للانطلاق؟</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "40px", fontSize: "15px", lineHeight: 1.7 }}>
            انضم لآلاف الباحثين الأمنيين الذين يستخدمون KaliGPT يومياً
          </p>
          <button
            onClick={() => navigate("/app")}
            className="holo-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "18px 48px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)",
              color: "#fff",
              fontSize: "18px",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 60px rgba(226,18,39,0.45), 0 12px 32px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.2)",
              letterSpacing: "-0.3px",
            }}
          >
            <Terminal style={{ width: "22px", height: "22px" }} />
            افتح KaliGPT
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid rgba(226,18,39,0.12)",
        padding: "32px 24px",
        position: "relative",
        zIndex: 10,
        background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.03) 100%)",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #e21227, #c4101f)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(226,18,39,0.4)",
            }}>
              <Shield style={{ width: "14px", height: "14px", color: "#fff" }} />
            </div>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>mr7.ai / KaliGPT</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {["سياسة الخصوصية", "شروط الخدمة", "FAQ", "Roadmap", "تواصل معنا"].map((item, i) => (
              <button key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >{item}</button>
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>© 2025 mr7.ai · For authorized security research only</p>
        </div>
      </footer>
    </div>
  );
}
