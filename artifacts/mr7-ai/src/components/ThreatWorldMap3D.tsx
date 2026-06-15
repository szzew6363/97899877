import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Zap, Shield, AlertTriangle, Activity, Wifi, Target, Radio } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   WORLD LAND MASS DOTS  [lon°, lat°]
══════════════════════════════════════════════════════════════════════ */
const LAND: [number, number][] = [
  // North America
  [-140,60],[-135,59],[-130,56],[-125,54],[-120,55],[-115,55],[-110,53],[-105,51],[-100,50],
  [-95,49],[-90,47],[-85,46],[-80,44],[-75,44],[-70,45],[-65,47],[-60,46],[-55,47],
  [-130,60],[-125,60],[-120,57],[-115,57],[-110,55],[-105,53],[-100,52],[-95,50],
  [-150,65],[-145,62],[-140,62],[-160,60],[-155,62],[-165,63],[-168,66],
  [-125,50],[-120,49],[-115,47],[-110,45],[-105,43],[-100,42],[-95,40],[-90,38],
  [-85,37],[-80,37],[-75,40],[-70,42],[-68,44],
  [-100,33],[-95,33],[-90,32],[-85,33],[-80,35],[-78,34],[-76,36],
  [-110,35],[-115,36],[-120,37],[-120,38],[-118,36],[-116,33],[-118,34],
  [-95,30],[-90,30],[-88,28],[-84,28],[-80,27],[-82,27],[-86,30],
  [-70,44],[-72,43],[-74,41],[-74,40],[-76,39],[-78,38],[-80,37],
  // Central America
  [-90,14],[-88,15],[-86,14],[-85,11],[-80,9],[-77,9],[-75,10],[-84,10],
  // Caribbean
  [-75,22],[-72,22],[-68,19],[-66,18],[-64,18],[-70,18],[-76,18],[-80,22],
  // South America
  [-78,5],[-76,3],[-73,2],[-70,0],[-68,-2],[-65,-5],[-60,-8],[-55,-10],
  [-50,-10],[-45,-8],[-40,-5],[-38,-3],[-35,-5],[-34,-8],
  [-75,-10],[-70,-12],[-65,-15],[-62,-20],[-58,-22],[-55,-28],[-52,-32],
  [-50,-28],[-48,-20],[-44,-18],[-42,-13],[-40,-10],[-38,-8],
  [-68,-35],[-65,-40],[-68,-45],[-70,-50],[-72,-45],[-75,-40],[-72,-38],
  [-55,-35],[-50,-30],[-48,-28],[-46,-24],[-43,-22],[-47,-16],
  [-60,-3],[-55,-2],[-50,-5],[-54,-7],[-56,-6],[-58,-4],
  // Europe
  [-10,52],[-5,52],[0,52],[5,52],[10,55],[15,55],[20,56],[25,58],[28,60],
  [30,62],[25,62],[20,62],[15,60],[10,57],[5,57],[0,56],[-5,56],
  [-5,44],[0,45],[5,46],[10,47],[14,48],[18,48],[22,50],[26,50],[30,50],
  [10,51],[12,52],[14,54],[16,52],[14,50],[12,50],[8,48],[6,46],
  [22,46],[26,44],[28,42],[24,38],[22,40],[18,42],[16,44],[14,42],
  [32,50],[35,48],[38,46],[34,42],[30,40],[26,38],[24,40],[28,44],
  [-8,42],[-6,40],[-2,40],[0,40],[2,42],[4,44],[2,46],[-5,40],
  [15,42],[18,44],[16,46],[12,46],[10,44],[8,46],
  [-3,56],[0,56],[2,53],[-5,54],[-8,52],[-3,52],
  [22,58],[26,62],[28,65],[30,68],[25,65],[20,65],[24,62],
  [10,60],[14,62],[18,64],[16,64],[10,63],[6,62],
  [2,48],[4,50],[6,50],[8,50],[6,52],[2,52],
  // Russia/N Asia
  [30,58],[40,58],[50,60],[60,62],[70,65],[80,68],[90,70],[100,70],
  [110,68],[120,65],[130,62],[140,62],[150,60],[160,58],[165,62],
  [140,55],[135,55],[130,52],[125,55],[120,58],[115,58],[110,55],
  [105,55],[100,58],[95,62],[90,65],[85,65],[80,65],[75,65],
  [70,65],[65,62],[60,58],[55,55],[50,55],[45,55],[40,55],[35,57],
  [170,65],[172,64],[170,68],[165,65],[155,60],[155,56],[150,56],
  [145,52],[140,50],[135,48],[140,46],[145,44],[148,46],
  // Africa
  [-17,15],[-15,13],[-12,12],[-10,8],[-5,5],[0,5],[5,5],[10,5],
  [15,8],[20,10],[25,12],[30,8],[35,5],[38,2],[40,-2],[42,-5],
  [35,-8],[30,-12],[28,-18],[25,-22],[22,-28],[18,-34],[22,-34],[26,-30],
  [30,-22],[34,-20],[36,-18],[38,-12],[40,-8],[42,-5],[44,-2],[46,0],
  [-8,12],[-5,10],[0,8],[5,10],[10,12],[15,14],[20,15],[25,14],
  [28,12],[32,8],[36,5],[40,5],[42,8],[45,12],[48,10],
  [10,-5],[15,-5],[20,-2],[25,-2],[30,-5],[35,-8],[40,-12],
  [32,-22],[28,-26],[24,-30],[20,-26],[16,-22],[12,-18],[10,-12],
  [16,-5],[18,-8],[22,-10],[26,-8],[30,-10],[34,-12],[36,-15],
  [-8,4],[-5,2],[0,2],[4,4],[8,4],[12,2],[14,4],[16,2],
  // Middle East
  [35,32],[38,34],[42,37],[46,38],[48,35],[50,30],[55,28],
  [58,24],[60,22],[56,22],[52,24],[48,28],[44,32],[40,36],[36,36],
  [44,36],[46,38],[50,36],[52,32],[56,28],[60,26],[64,22],
  [32,30],[34,32],[36,34],[38,36],[40,38],[36,38],[34,36],
  // Central & South Asia
  [55,40],[60,42],[65,45],[70,48],[75,48],[80,46],[85,48],[90,48],
  [60,38],[64,36],[68,34],[72,32],[72,36],[68,40],[64,44],[62,42],
  [68,22],[72,22],[76,22],[80,22],[84,24],[88,24],[90,26],[92,26],
  [94,24],[96,22],[100,20],[104,18],[106,16],[100,16],[96,18],
  [88,18],[84,20],[80,18],[76,18],[72,20],[68,24],[70,28],[74,26],
  [80,12],[82,14],[84,18],[86,20],[88,22],[86,26],[82,28],[78,26],
  [76,12],[78,10],[80,8],[78,12],[74,18],[72,22],
  // SE Asia
  [96,18],[100,18],[104,12],[108,12],[110,8],[114,6],[118,4],
  [102,2],[104,0],[106,-4],[110,-8],[112,-8],[114,-8],[116,-8],[118,-8],[120,-10],
  [122,-8],[124,-6],[126,-4],[128,-2],[130,0],[132,2],
  [108,18],[110,20],[112,22],[116,24],[118,22],[120,20],[120,24],
  [100,14],[102,12],[104,10],[106,8],[108,4],[110,2],[112,2],
  // Japan
  [130,32],[132,34],[134,36],[136,38],[138,40],[140,42],[141,44],[143,44],
  [130,34],[128,36],[126,36],[128,38],[130,38],[132,36],[134,34],
  [142,36],[144,38],[144,42],[144,44],
  // Australia
  [114,-22],[116,-28],[118,-28],[120,-28],[122,-28],[124,-26],[126,-24],
  [128,-24],[130,-22],[132,-20],[134,-22],[136,-22],[138,-20],[140,-20],
  [142,-18],[144,-18],[146,-20],[148,-22],[150,-24],[152,-26],[152,-30],
  [150,-36],[148,-38],[146,-38],[144,-38],[142,-38],[140,-36],[138,-36],
  [136,-36],[134,-34],[132,-32],[130,-32],[128,-30],[126,-26],[124,-24],
  [136,-14],[138,-16],[140,-18],[142,-16],[144,-14],[146,-16],
  // New Zealand
  [172,-40],[174,-38],[176,-36],[174,-40],[170,-44],[172,-42],[174,-42],[176,-40],
  // Greenland
  [-50,80],[-45,78],[-40,76],[-35,74],[-30,72],[-25,70],[-20,68],
  [-22,66],[-26,66],[-32,68],[-38,70],[-44,72],[-50,76],[-56,78],
  [-60,76],[-55,74],[-48,72],[-42,70],[-36,68],[-30,66],[-28,70],
  // Iceland
  [-22,65],[-18,65],[-14,64],[-20,63],[-24,64],[-20,66],
];

/* ══════════════════════════════════════════════════════════════════════
   THREAT ACTORS & TARGETS
══════════════════════════════════════════════════════════════════════ */
const ORIGINS = [
  { name:"Beijing",    lon:116, lat:40, color:"#e21227", type:"APT"      },
  { name:"Moscow",     lon:37,  lat:55, color:"#ff4d00", type:"Ransomware"},
  { name:"Tehran",     lon:51,  lat:36, color:"#ff8c00", type:"APT"      },
  { name:"Pyongyang",  lon:126, lat:39, color:"#fbbf24", type:"APT"      },
  { name:"Lagos",      lon:3,   lat:6,  color:"#e21227", type:"BEC"      },
  { name:"Bucharest",  lon:26,  lat:44, color:"#ff6b35", type:"Botnet"   },
  { name:"Jakarta",    lon:107, lat:-6, color:"#ff4d4d", type:"Phishing" },
  { name:"Kinshasa",   lon:15,  lat:-4, color:"#e21227", type:"BEC"      },
  { name:"São Paulo",  lon:-46, lat:-23,color:"#f97316", type:"Fraud"    },
  { name:"Karachi",    lon:67,  lat:25, color:"#fbbf24", type:"DDoS"     },
];
const TARGETS = [
  { name:"Washington", lon:-77,  lat:39  },
  { name:"London",     lon:0,    lat:51  },
  { name:"Berlin",     lon:13,   lat:52  },
  { name:"Tokyo",      lon:139,  lat:35  },
  { name:"Sydney",     lon:151,  lat:-33 },
  { name:"Seoul",      lon:127,  lat:37  },
  { name:"Paris",      lon:2,    lat:49  },
  { name:"Toronto",    lon:-79,  lat:43  },
  { name:"Singapore",  lon:104,  lat:1   },
  { name:"Tel Aviv",   lon:35,   lat:32  },
  { name:"Amsterdam",  lon:4,    lat:52  },
  { name:"Frankfurt",  lon:8,    lat:50  },
  { name:"New York",   lon:-74,  lat:41  },
  { name:"São Paulo",  lon:-46,  lat:-23 },
  { name:"Mumbai",     lon:73,   lat:19  },
];
const ATTACK_TYPES = ["Ransomware","APT","DDoS","Phishing","BEC","0-day","Botnet","Malware"];
const TYPE_COLORS:  Record<string,string> = {
  Ransomware:"#e21227", APT:"#ff4d00", DDoS:"#fbbf24",
  Phishing:"#f97316", BEC:"#ff6b35", "0-day":"#c084fc",
  Botnet:"#00e5ff", Malware:"#22c55e",
};

/* ══════════════════════════════════════════════════════════════════════
   ARC TYPE
══════════════════════════════════════════════════════════════════════ */
interface Arc {
  ox: number; oy: number; oz: number;  // origin 3D
  dx: number; dy: number; dz: number;  // dest 3D
  originName: string; destName: string;
  color: string; type: string;
  progress: number; speed: number; born: number; fade: number;
}

/* ══════════════════════════════════════════════════════════════════════
   UTIL — degrees → radians → 3D sphere point
══════════════════════════════════════════════════════════════════════ */
function latLonTo3D(lat: number, lon: number, R: number): [number, number, number] {
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;
  return [R * Math.cos(φ) * Math.sin(λ), R * Math.sin(φ), R * Math.cos(φ) * Math.cos(λ)];
}

/* ══════════════════════════════════════════════════════════════════════
   CANVAS COMPONENT
══════════════════════════════════════════════════════════════════════ */
function GlobeCanvas({ w, h }: { w: number; h: number }) {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef   = useRef(0);
  const arcsRef = useRef<Arc[]>([]);
  const statsRef = useRef({ total: 0, active: 0, countries: new Set<string>(), types: new Map<string,number>() });
  const [stats, setStats] = useState({ total: 0, active: 0, countries: 0, topType: "Ransomware" });

  /* spawn a new arc every 1.2s on average */
  const spawnArc = useCallback(() => {
    const o = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
    const d = TARGETS[Math.floor(Math.random() * TARGETS.length)];
    if (o.name === d.name) return;
    const [ox, oy, oz] = latLonTo3D(o.lat, o.lon, 1);
    const [dx, dy, dz] = latLonTo3D(d.lat, d.lon, 1);
    const arc: Arc = {
      ox, oy, oz, dx, dy, dz,
      originName: o.name, destName: d.name,
      color: o.color, type: o.type,
      progress: 0, speed: 0.0028 + Math.random() * 0.0018,
      born: tRef.current, fade: 0,
    };
    arcsRef.current.push(arc);
    if (arcsRef.current.length > 22) arcsRef.current.shift();
    statsRef.current.total++;
    statsRef.current.countries.add(d.name);
    statsRef.current.types.set(o.type, (statsRef.current.types.get(o.type) ?? 0) + 1);
    let maxType = "APT", maxCount = 0;
    statsRef.current.types.forEach((v, k) => { if (v > maxCount) { maxCount = v; maxType = k; } });
    setStats({
      total: statsRef.current.total,
      active: arcsRef.current.filter(a => a.progress < 1).length,
      countries: statsRef.current.countries.size,
      topType: maxType,
    });
  }, []);

  useEffect(() => {
    const iv = setInterval(() => { if (Math.random() < 0.72) spawnArc(); }, 1200);
    return () => clearInterval(iv);
  }, [spawnArc]);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio, 2);
    cv.width  = w * DPR; cv.height = h * DPR;
    ctx.scale(DPR, DPR);

    const cx = w / 2, cy = h / 2;
    const R  = Math.min(w, h) * 0.38;
    const FOV = R * 2.8;

    /* pre-convert land dots to 3D (on unit sphere) */
    const landPts = LAND.map(([lon, lat]) => latLonTo3D(lat, lon, 1));
    /* pre-convert city dots */
    const origPts = ORIGINS.map(o => ({ ...o, pt: latLonTo3D(o.lat, o.lon, 1) }));
    const targPts = TARGETS.map(t => ({ ...t, pt: latLonTo3D(t.lat, t.lon, 1) }));

    function project(x: number, y: number, z: number): { px: number; py: number; sc: number } {
      const sc = FOV / (FOV + z * R);
      return { px: cx + x * R * sc, py: cy - y * R * sc, sc };
    }

    function rotY(pt: [number,number,number], a: number): [number,number,number] {
      const [x, y, z] = pt;
      return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
    }

    /* draw great-circle arc on globe surface with mid-point raised */
    function drawArc(arc: Arc, rotAngle: number) {
      const steps = 80;
      const alpha = arc.progress < 1 ? arc.progress : Math.max(0, 1 - arc.fade);
      if (alpha <= 0.01) return;

      /* visible progress = draw from 0 to progress */
      const drawTo = Math.floor(arc.progress * steps);
      if (drawTo < 2) return;

      const points: { px: number; py: number; visible: boolean; t: number }[] = [];
      for (let i = 0; i <= drawTo; i++) {
        const t = i / steps;
        /* slerp on sphere + height above surface */
        const dot = arc.ox * arc.dx + arc.oy * arc.dy + arc.oz * arc.dz;
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const omega = Math.acos(clampedDot);
        let x: number, y: number, z: number;
        if (omega < 0.001) {
          x = arc.ox; y = arc.oy; z = arc.oz;
        } else {
          const st = Math.sin(omega);
          const f1 = Math.sin((1 - t) * omega) / st;
          const f2 = Math.sin(t * omega) / st;
          x = f1 * arc.ox + f2 * arc.dx;
          y = f1 * arc.oy + f2 * arc.dy;
          z = f1 * arc.oz + f2 * arc.dz;
        }
        /* raise arc above surface */
        const height = 1 + 0.30 * Math.sin(t * Math.PI);
        const [rx, ry, rz] = rotY([x * height, y * height, z * height], rotAngle);
        const { px, py } = project(rx, ry, rz);
        const visible = rz > -0.3;
        points.push({ px, py, visible, t });
      }

      ctx.save();
      ctx.beginPath();
      let first = true;
      points.forEach(p => {
        if (!p.visible) { first = true; return; }
        if (first) { ctx.moveTo(p.px, p.py); first = false; }
        else ctx.lineTo(p.px, p.py);
      });
      const color = arc.color;
      const hex = color.replace("#","");
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.88})`;
      ctx.lineWidth   = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 6;
      ctx.stroke();

      /* draw glow pass */
      ctx.globalAlpha = alpha * 0.22;
      ctx.lineWidth   = 4;
      ctx.shadowBlur  = 18;
      ctx.stroke();
      ctx.restore();

      /* draw progress dot (the leading spark) */
      if (arc.progress < 1 && points.length > 0) {
        const last = points[points.length - 1];
        if (last.visible) {
          ctx.save();
          ctx.beginPath(); ctx.arc(last.px, last.py, 3, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.shadowColor = color; ctx.shadowBlur = 12;
          ctx.fill(); ctx.restore();
        }
      }
    }

    /* HUD scan-line overlay */
    function drawScanLine(t: number) {
      const y = ((t * 45) % h);
      const grad = ctx.createLinearGradient(0, y - 2, 0, y + 2);
      grad.addColorStop(0, "rgba(0,229,255,0)");
      grad.addColorStop(0.5, "rgba(0,229,255,0.08)");
      grad.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 2, w, 4);
    }

    let lastArcTime = 0;
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 1;
      const t = tRef.current;
      ctx.clearRect(0, 0, w, h);

      const rotAngle = t * 0.0045;

      /* ── deep space background ── */
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.7);
      bg.addColorStop(0,   "rgba(4,2,16,0.92)");
      bg.addColorStop(0.5, "rgba(2,1,10,0.96)");
      bg.addColorStop(1,   "rgba(0,0,4,0.98)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      /* ── background stars ── */
      const seed = 123456;
      for (let i = 0; i < 180; i++) {
        const xi = (((seed * (i + 1) * 7919) ^ (i * 31337)) & 0xFFFF) / 65535;
        const yi = (((seed * (i + 1) * 6271) ^ (i * 54321)) & 0xFFFF) / 65535;
        const ai = 0.08 + (((seed * i * 9001) & 0xFFFF) / 65535) * 0.55;
        const twinkle = ai * (0.7 + Math.sin(t * 0.04 + i) * 0.3);
        ctx.beginPath();
        ctx.arc(xi * w, yi * h, 0.5 + (((seed * i * 3) & 0xFFFF) / 65535) * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
        ctx.fill();
      }

      /* ── globe atmosphere glow ── */
      const atmosGrad = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.22);
      atmosGrad.addColorStop(0,    "rgba(0,40,120,0.04)");
      atmosGrad.addColorStop(0.4,  "rgba(0,80,200,0.10)");
      atmosGrad.addColorStop(0.75, "rgba(0,50,150,0.06)");
      atmosGrad.addColorStop(1,    "rgba(0,20,80,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
      ctx.fillStyle = atmosGrad; ctx.fill();

      /* ── globe base ── */
      const globeGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.25, R * 0.05, cx, cy, R);
      globeGrad.addColorStop(0,    "rgba(8,18,40,0.95)");
      globeGrad.addColorStop(0.45, "rgba(4,10,28,0.97)");
      globeGrad.addColorStop(0.85, "rgba(2,5,16,0.99)");
      globeGrad.addColorStop(1,    "rgba(0,2,8,1)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = globeGrad; ctx.fill();

      /* ── grid lines (lat/lon) ── */
      ctx.save();
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let first = true;
        for (let lon = -180; lon <= 180; lon += 6) {
          const [x, y, z] = rotY(latLonTo3D(lat, lon, 1), rotAngle);
          if (z < 0) { first = true; continue; }
          const { px, py } = project(x, y, z);
          if (first) { ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(0,100,200,0.06)";
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath(); let first = true;
        for (let lat = -80; lat <= 80; lat += 4) {
          const [x, y, z] = rotY(latLonTo3D(lat, lon, 1), rotAngle);
          if (z < 0) { first = true; continue; }
          const { px, py } = project(x, y, z);
          if (first) { ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "rgba(0,100,200,0.04)";
        ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.restore();

      /* ── land dots ── */
      landPts.forEach(([lx, ly, lz]) => {
        const [x, y, z] = rotY([lx, ly, lz], rotAngle);
        if (z < 0.05) return;
        const { px, py, sc } = project(x, y, z);
        const depthBrightness = 0.3 + z * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, sc * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(30,160,80,${depthBrightness * 0.7})`;
        ctx.fill();
      });

      /* ── attack arcs ── */
      arcsRef.current.forEach(arc => {
        if (arc.progress < 1) arc.progress += arc.speed;
        else arc.fade += 0.012;
        drawArc(arc, rotAngle);
      });
      arcsRef.current = arcsRef.current.filter(a => a.fade < 1.0);

      /* ── origin city nodes ── */
      origPts.forEach(o => {
        const [x, y, z] = rotY(o.pt, rotAngle);
        if (z < 0.05) return;
        const { px, py } = project(x, y, z);
        ctx.save();
        const pulse = 0.5 + Math.sin(t * 0.08 + origPts.indexOf(o)) * 0.5;
        ctx.beginPath(); ctx.arc(px, py, 2.5 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = o.color;
        ctx.shadowColor = o.color; ctx.shadowBlur = 10;
        ctx.fill();
        /* pulsing ring */
        ctx.beginPath(); ctx.arc(px, py, 4 + pulse * 5, 0, Math.PI * 2);
        ctx.strokeStyle = o.color + "44"; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();
      });

      /* ── target city nodes (cyan/defensive) ── */
      targPts.forEach(t2 => {
        const [x, y, z] = rotY(t2.pt, rotAngle);
        if (z < 0.05) return;
        const { px, py } = project(x, y, z);
        const pulse = 0.5 + Math.sin(t * 0.06 + targPts.indexOf(t2) * 0.7) * 0.5;
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, 1.8 + pulse * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,229,255,${0.6 + pulse * 0.4})`;
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 8;
        ctx.fill(); ctx.restore();
      });

      /* ── globe rim lighting ── */
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.06);
      rimGrad.addColorStop(0, "rgba(0,60,200,0)");
      rimGrad.addColorStop(0.6, "rgba(0,80,255,0.14)");
      rimGrad.addColorStop(1, "rgba(0,40,180,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad; ctx.fill();

      /* ── specular highlight ── */
      const specGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.3, 0, cx, cy, R);
      specGrad.addColorStop(0, "rgba(120,180,255,0.12)");
      specGrad.addColorStop(0.35, "rgba(60,120,255,0.04)");
      specGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = specGrad; ctx.fill();

      /* spawn arc on interval driven by render loop */
      if (t - lastArcTime > 80 && Math.random() < 0.018) {
        spawnArc(); lastArcTime = t;
      }

      /* ── HUD scan line ── */
      if (t % 3 === 0) drawScanLine(t * 0.5);
    }

    spawnArc(); spawnArc(); spawnArc();
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [w, h, spawnArc]);

  return (
    <canvas ref={cvRef}
      style={{ width: w, height: h, display: "block", borderRadius: "inherit" }} />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   STATS BAR
══════════════════════════════════════════════════════════════════════ */
function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 14px", borderRadius: "10px", gap: "2px",
      background: `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.08)`,
      border: `1px solid ${color}30`,
    }}>
      <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "1.5px", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 900, color, textShadow: `0 0 14px ${color}` }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   LIVE FEED TICKER
══════════════════════════════════════════════════════════════════════ */
function LiveFeed() {
  const [items, setItems] = useState<{ id: number; text: string; color: string; type: string }[]>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const iv = setInterval(() => {
      const o = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
      const t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
      const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
      const color = TYPE_COLORS[type] ?? "#e21227";
      const id = ++idRef.current;
      setItems(prev => [{ id, text: `${o.name} → ${t.name}`, color, type }, ...prev].slice(0, 6));
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflow: "hidden" }}>
      <AnimatePresence>
        {items.map(item => (
          <motion.div key={item.id}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "5px 10px", borderRadius: "8px",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }}
              style={{ width: "5px", height: "5px", borderRadius: "50%", background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }} />
            <span style={{ fontSize: "8px", fontFamily: "monospace", color: item.color, fontWeight: 700, letterSpacing: "0.5px", minWidth: "44px" }}>{item.type}</span>
            <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.55)", flex: 1 }}>{item.text}</span>
            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>LIVE</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════════ */
export function ThreatWorldMap3D({ onClose }: { onClose: () => void }) {
  const [attackCount, setAttackCount] = useState(0);
  const [activeArcs,  setActiveArcs]  = useState(0);
  const [countries,   setCountries]   = useState(0);
  const [threatLevel, setThreatLevel] = useState<"LOW"|"MED"|"HIGH"|"CRITICAL">("HIGH");
  const [dim, setDim] = useState({ w: 760, h: 440 });

  useEffect(() => {
    const update = () => {
      const vw = Math.min(window.innerWidth * 0.92, 1100);
      const vh = Math.min(window.innerHeight * 0.75, 600);
      setDim({ w: Math.round(vw * 0.65), h: Math.round(vh) });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const tColor = { LOW:"#22c55e", MED:"#f59e0b", HIGH:"#f97316", CRITICAL:"#e21227" }[threatLevel];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 9900,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)",
      }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        style={{
          width: "clamp(720px, 92vw, 1100px)",
          maxHeight: "92vh",
          borderRadius: "18px",
          overflow: "hidden",
          background: "linear-gradient(160deg, rgba(2,4,16,0.99) 0%, rgba(0,2,12,0.99) 100%)",
          border: "1px solid rgba(0,80,200,0.30)",
          boxShadow: "0 0 120px rgba(0,80,200,0.15), 0 0 50px rgba(0,40,120,0.10), 0 40px 100px rgba(0,0,0,0.98)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Top accent line */}
        <div style={{ height: "2px", background: "linear-gradient(90deg,transparent,#0050c8,#00e5ff,#0050c8,transparent)" }} />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 20px", borderBottom: "1px solid rgba(0,80,200,0.12)",
          background: "rgba(0,10,40,0.5)",
        }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            background: "radial-gradient(circle,rgba(0,80,200,0.3),rgba(0,0,20,0.9))", border: "1px solid rgba(0,100,255,0.35)",
            boxShadow: "0 0 24px rgba(0,80,200,0.4)" }}>
            <Globe style={{ width: "18px", height: "18px", color: "#00e5ff" }} />
          </div>
          <div>
            <div style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3px" }}>GLOBAL THREAT MAP</div>
            <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(0,229,255,0.5)", letterSpacing: "2px", marginTop: "2px" }}>REAL-TIME ATTACK VISUALIZATION</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* Threat level badge */}
          <motion.div animate={{ boxShadow: [`0 0 8px ${tColor}40`, `0 0 20px ${tColor}70`, `0 0 8px ${tColor}40`] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ padding: "5px 14px", borderRadius: "8px", border: `1px solid ${tColor}60`, background: `${tColor}12` }}>
            <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: tColor, letterSpacing: "2px" }}>THREAT: {threatLevel}</span>
          </motion.div>
          <button onClick={onClose} style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "rgba(226,18,39,0.06)", border: "1px solid rgba(226,18,39,0.2)",
            color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Globe canvas */}
          <div style={{
            flex: 1, position: "relative", overflow: "hidden",
            borderRight: "1px solid rgba(0,80,200,0.10)",
          }}>
            <GlobeCanvas w={dim.w} h={dim.h} />
            {/* Corner brackets */}
            {[["top:0,left:0","borderTop:1.5px solid,borderLeft:1.5px solid"],
              ["top:0,right:0","borderTop:1.5px solid,borderRight:1.5px solid"],
              ["bottom:0,left:0","borderBottom:1.5px solid,borderLeft:1.5px solid"],
              ["bottom:0,right:0","borderBottom:1.5px solid,borderRight:1.5px solid"],
            ].map(([pos, border], i) => {
              const posObj = Object.fromEntries(pos.split(",").map(p => p.split(":")));
              return (
                <div key={i} style={{ position: "absolute", width: "14px", height: "14px",
                  ...posObj, ...Object.fromEntries(border.split(",").map(b => {
                    const [k, v] = b.split(":");
                    return [k, `${v} rgba(0,229,255,0.4)`];
                  })) }} />
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ width: "260px", flexShrink: 0, display: "flex", flexDirection: "column", padding: "16px 14px", gap: "14px", overflow: "hidden" }}>
            {/* Stats */}
            <div>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.5)", letterSpacing: "2px", marginBottom: "8px" }}>LIVE STATISTICS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <StatChip label="Total Attacks" value={attackCount} color="#e21227" />
                <StatChip label="Active Arcs" value={activeArcs} color="#f97316" />
                <StatChip label="Countries" value={countries} color="#00e5ff" />
                <StatChip label="Top Threat" value={threatLevel} color={tColor} />
              </div>
            </div>

            {/* Type breakdown */}
            <div>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.5)", letterSpacing: "2px", marginBottom: "8px" }}>ATTACK TYPES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {ATTACK_TYPES.map(type => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: TYPE_COLORS[type] ?? "#e21227", flexShrink: 0,
                      boxShadow: `0 0 6px ${TYPE_COLORS[type] ?? "#e21227"}` }} />
                    <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.55)", flex: 1 }}>{type}</span>
                    <motion.div animate={{ width: [`${20 + Math.random() * 50}%`, `${30 + Math.random() * 50}%`] }}
                      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, repeatType: "reverse" }}
                      style={{ height: "3px", background: TYPE_COLORS[type] ?? "#e21227", borderRadius: "2px", opacity: 0.6 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Live feed */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }}
                  style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
                <span style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.5)", letterSpacing: "2px" }}>ATTACK FEED</span>
              </div>
              <LiveFeed />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          padding: "8px 20px", borderTop: "1px solid rgba(0,80,200,0.10)",
          background: "rgba(0,5,20,0.5)", display: "flex", alignItems: "center", gap: "16px",
        }}>
          {[
            { icon: Zap, label: "High Severity", count: Math.floor(Math.random() * 8) + 2 },
            { icon: Shield, label: "Blocked", count: Math.floor(Math.random() * 20) + 10 },
            { icon: AlertTriangle, label: "Active APT", count: 3 },
            { icon: Radio, label: "C2 Active", count: 7 },
          ].map(({ icon: Icon, label, count }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Icon style={{ width: "10px", height: "10px", color: "rgba(0,229,255,0.55)" }} />
              <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.38)" }}>{label}:</span>
              <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: "#00e5ff" }}>{count}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
            DATA SIMULATED · {new Date().toLocaleTimeString("en-US", { hour12: false })}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
