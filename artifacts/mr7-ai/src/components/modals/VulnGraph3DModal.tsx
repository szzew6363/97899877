import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Network, Bug, Shield, Zap, Eye, Link2, AlertTriangle, Server, Database, Globe, Cpu } from "lucide-react";
import * as THREE from "three";

interface VulnGraph3DModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type VulnNode = {
  id: string; label: string; type: "system" | "vuln" | "exploit" | "target";
  cvss: number; cve: string; desc: string;
  x: number; y: number; z: number;
  color: string; size: number;
  connections: string[];
};

const NODES: VulnNode[] = [
  { id: "n1", label: "Web Server", type: "system", cvss: 0, cve: "—", desc: "Apache 2.4.51 · Port 80/443", x: 0, y: 0, z: 0, color: "#00e5ff", size: 0.14, connections: ["v1","v2","v3"] },
  { id: "n2", label: "Database", type: "system", cvss: 0, cve: "—", desc: "MySQL 8.0.26 · Port 3306", x: 2.2, y: 0.4, z: -0.6, color: "#3b82f6", size: 0.13, connections: ["v4","v5"] },
  { id: "n3", label: "Auth Service", type: "system", cvss: 0, cve: "—", desc: "JWT Auth · Port 8443", x: -2, y: 0.8, z: 0.4, color: "#a78bfa", size: 0.12, connections: ["v6","v7"] },
  { id: "n4", label: "Admin Panel", type: "system", cvss: 0, cve: "—", desc: "Django 3.2 Admin · /admin", x: 0.4, y: 2, z: 1.2, color: "#f97316", size: 0.11, connections: ["v8"] },
  { id: "n5", label: "API Gateway", type: "system", cvss: 0, cve: "—", desc: "Kong Gateway · Port 8001", x: -0.8, y: -1.8, z: 0.6, color: "#10b981", size: 0.12, connections: ["v9"] },
  { id: "v1", label: "Log4Shell", type: "vuln", cvss: 10.0, cve: "CVE-2021-44228", desc: "JNDI Injection RCE — Critical severity", x: 1, y: 1, z: 0.8, color: "#e21227", size: 0.18, connections: ["e1"] },
  { id: "v2", label: "XSS Stored", type: "vuln", cvss: 8.2, cve: "CVE-2023-1234", desc: "Persistent XSS via user input field", x: -1, y: 0.8, z: 1.4, color: "#f97316", size: 0.13, connections: ["e2"] },
  { id: "v3", label: "Path Traversal", type: "vuln", cvss: 7.5, cve: "CVE-2023-5678", desc: "Directory traversal to /etc/passwd", x: 0.8, y: -1, z: 0.6, color: "#fbbf24", size: 0.12, connections: ["e3"] },
  { id: "v4", label: "SQL Injection", type: "vuln", cvss: 9.8, cve: "CVE-2022-9012", desc: "Union-based SQLi in login endpoint", x: 2.8, y: 1.2, z: 0.2, color: "#e21227", size: 0.16, connections: ["e4"] },
  { id: "v5", label: "Auth Bypass", type: "vuln", cvss: 9.1, cve: "CVE-2023-4321", desc: "JWT algorithm confusion attack", x: 1.8, y: -0.8, z: -1, color: "#e21227", size: 0.15, connections: ["e5"] },
  { id: "v6", label: "Weak JWT", type: "vuln", cvss: 7.8, cve: "CVE-2022-1357", desc: "HS256 key brute-forceable", x: -2.8, y: 1.6, z: 0, color: "#f97316", size: 0.13, connections: ["e6"] },
  { id: "v7", label: "SSRF", type: "vuln", cvss: 8.6, cve: "CVE-2023-7890", desc: "Server-side request forgery via redirect", x: -1.6, y: -0.4, z: 1.8, color: "#f97316", size: 0.14, connections: ["e7"] },
  { id: "v8", label: "Default Creds", type: "vuln", cvss: 9.0, cve: "CVE-2023-0001", desc: "Admin:admin default password", x: 0.2, y: 2.8, z: 0.8, color: "#e21227", size: 0.15, connections: ["e8"] },
  { id: "v9", label: "API Key Leak", type: "vuln", cvss: 6.5, cve: "CVE-2022-5432", desc: "API key exposed in JS bundle", x: -1.2, y: -2.6, z: 0.4, color: "#fbbf24", size: 0.12, connections: ["e9"] },
  { id: "e1", label: "RCE Exploit", type: "exploit", cvss: 10, cve: "EDB-50593", desc: "Public PoC · weaponized", x: 1.6, y: 1.8, z: 1.6, color: "#ff0040", size: 0.16, connections: ["t1"] },
  { id: "e2", label: "Session Hijack", type: "exploit", cvss: 8, cve: "EDB-51234", desc: "Cookie theft via reflected payload", x: -1.8, y: 1.4, z: 2, color: "#ff6b00", size: 0.12, connections: ["t2"] },
  { id: "e3", label: "File Read", type: "exploit", cvss: 7, cve: "EDB-48506", desc: "Read arbitrary files", x: 1.4, y: -1.6, z: 1.2, color: "#fbbf24", size: 0.11, connections: ["t3"] },
  { id: "e4", label: "Data Dump", type: "exploit", cvss: 9.8, cve: "EDB-52000", desc: "Full DB exfiltration", x: 3.4, y: 1.8, z: -0.2, color: "#ff0040", size: 0.15, connections: ["t4"] },
  { id: "e5", label: "Priv Escalation", type: "exploit", cvss: 9, cve: "EDB-49001", desc: "Forge admin JWT token", x: 2.4, y: -1.4, z: -1.6, color: "#ff6b00", size: 0.14, connections: ["t4"] },
  { id: "e6", label: "Token Forge", type: "exploit", cvss: 7.5, cve: "EDB-47892", desc: "Forge arbitrary JWT payloads", x: -3.4, y: 2.2, z: -0.4, color: "#f97316", size: 0.12, connections: ["t5"] },
  { id: "e7", label: "SSRF→Internal", type: "exploit", cvss: 8.5, cve: "EDB-50001", desc: "Access metadata · cloud pivot", x: -2.2, y: -0.8, z: 2.6, color: "#ff6b00", size: 0.13, connections: ["t6"] },
  { id: "e8", label: "Full Takeover", type: "exploit", cvss: 9.0, cve: "EDB-53000", desc: "Admin account takeover chain", x: 0.4, y: 3.6, z: 1.4, color: "#ff0040", size: 0.15, connections: ["t1","t4"] },
  { id: "e9", label: "API Abuse", type: "exploit", cvss: 6, cve: "EDB-48999", desc: "Unauthorized API calls", x: -1.6, y: -3.4, z: 0.8, color: "#fbbf24", size: 0.11, connections: ["t7"] },
  { id: "t1", label: "Full System", type: "target", cvss: 10, cve: "—", desc: "Complete compromise · root access", x: 2.2, y: 2.6, z: 2.2, color: "#ff0000", size: 0.2, connections: [] },
  { id: "t2", label: "User Accounts", type: "target", cvss: 8, cve: "—", desc: "Session takeover · PII exposure", x: -2.6, y: 2, z: 2.8, color: "#ff4444", size: 0.15, connections: [] },
  { id: "t3", label: "Config Files", type: "target", cvss: 7, cve: "—", desc: "Secrets · credentials disclosure", x: 2, y: -2.2, z: 1.8, color: "#ff8800", size: 0.13, connections: [] },
  { id: "t4", label: "Database", type: "target", cvss: 10, cve: "—", desc: "Full data exfiltration", x: 4, y: 2.2, z: -0.8, color: "#ff0000", size: 0.2, connections: [] },
  { id: "t5", label: "Auth System", type: "target", cvss: 8, cve: "—", desc: "All user tokens compromised", x: -4, y: 2.8, z: -0.8, color: "#ff4444", size: 0.16, connections: [] },
  { id: "t6", label: "Cloud Meta", type: "target", cvss: 9, cve: "—", desc: "AWS metadata · IAM keys", x: -3, y: -1.4, z: 3.4, color: "#ff2222", size: 0.17, connections: [] },
  { id: "t7", label: "3rd Party APIs", type: "target", cvss: 6, cve: "—", desc: "External service abuse", x: -2, y: -4, z: 1.2, color: "#ff8800", size: 0.13, connections: [] },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

export function VulnGraph3DModal({ open, onOpenChange }: VulnGraph3DModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const [selected, setSelected] = useState<VulnNode | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const container = canvasRef.current;
    const W = container.clientWidth, H = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.01, 200);
    camera.position.set(0, 0, 9);

    scene.add(new THREE.AmbientLight(0x111133, 3));
    const pt1 = new THREE.PointLight(0x2244ff, 2, 30); pt1.position.set(3, 3, 3); scene.add(pt1);
    const pt2 = new THREE.PointLight(0xe21227, 1.5, 20); pt2.position.set(-3, -3, 2); scene.add(pt2);

    // Stars
    const sg = new THREE.BufferGeometry();
    const sp = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000 * 3; i++) sp[i] = (Math.random() - 0.5) * 100;
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x334477, size: 0.04, transparent: true, opacity: 0.5 })));

    // Build meshes
    const meshMap: Record<string, THREE.Mesh> = {};
    const group = new THREE.Group();
    scene.add(group);

    NODES.forEach(node => {
      const geo = new THREE.SphereGeometry(node.size, 24, 24);
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color).multiplyScalar(0.3),
        transparent: true, opacity: 0.9, shininess: 80,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData.id = node.id;
      group.add(mesh);
      meshMap[node.id] = mesh;

      // Glow ring for vulns/exploits
      if (node.type === "vuln" || node.type === "exploit" || node.type === "target") {
        const rg = new THREE.TorusGeometry(node.size * 1.6, 0.008, 8, 48);
        const rm = new THREE.MeshBasicMaterial({ color: new THREE.Color(node.color), transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(rg, rm);
        ring.position.copy(mesh.position);
        ring.rotation.x = Math.PI / 2;
        ring.userData.orbitOf = node.id;
        group.add(ring);
      }
    });

    // Connections
    NODES.forEach(node => {
      node.connections.forEach(cid => {
        const target = nodeMap[cid];
        if (!target) return;
        const pts = [new THREE.Vector3(node.x, node.y, node.z), new THREE.Vector3(target.x, target.y, target.z)];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(node.color), transparent: true, opacity: 0.25
        });
        group.add(new THREE.Line(geo, mat));
      });
    });

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / W) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / H) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(meshMap));
      if (hits.length > 0) {
        const id = hits[0].object.userData.id;
        setSelected(nodeMap[id] || null);
      } else {
        setSelected(null);
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    // Orbit control
    let isDragging = false, lastMouse = { x: 0, y: 0 };
    renderer.domElement.addEventListener("mousedown", e => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; });
    window.addEventListener("mouseup", () => { isDragging = false; });
    window.addEventListener("mousemove", e => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouse.x, dy = e.clientY - lastMouse.y;
      group.rotation.y += dx * 0.007;
      group.rotation.x += dy * 0.005;
      lastMouse = { x: e.clientX, y: e.clientY };
    });
    renderer.domElement.addEventListener("wheel", e => {
      camera.position.z = Math.max(3, Math.min(20, camera.position.z + e.deltaY * 0.01));
    }, { passive: true });

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.01;
      group.rotation.y += 0.0025;
      // Pulse rings
      group.children.forEach(child => {
        if (child.userData.orbitOf) {
          const node = nodeMap[child.userData.orbitOf];
          if (node) {
            (child as THREE.Mesh).rotation.y = t * 1.2;
            ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.2 * Math.sin(t * 2);
          }
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      rendererRef.current = null;
    };
  }, [open]);

  const typeColor = { system: "#00e5ff", vuln: "#f97316", exploit: "#e21227", target: "#ff0040" };
  const typeIcon = { system: Server, vuln: Bug, exploit: Zap, target: AlertTriangle };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "linear-gradient(135deg,#050510 0%,#080818 50%,#050510 100%)" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(167,139,250,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.4)" }}>
                  <Network className="w-4 h-4" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#a78bfa" }}>VULNERABILITY GRAPH 3D</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>INTERACTIVE EXPLOIT CHAIN VISUALIZATION · CLICK NODES TO INSPECT</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {Object.entries(typeColor).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: v, boxShadow: `0 0 6px ${v}` }} />
                    <span className="text-[8px] font-mono uppercase" style={{ color: v }}>{k}</span>
                  </div>
                ))}
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 ml-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div ref={canvasRef} className="flex-1" style={{ cursor: "grab" }} />
              <div className="w-[260px] border-l border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#a78bfa" }}>NODE INSPECTOR</div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto">
                  {selected ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ background: selected.color, boxShadow: `0 0 10px ${selected.color}` }} />
                        <span className="text-sm font-black" style={{ color: selected.color }}>{selected.label}</span>
                      </div>
                      <div className="space-y-1.5 text-[10px] font-mono">
                        {[
                          ["TYPE", selected.type.toUpperCase()],
                          ["CVE/ID", selected.cve],
                          ["CVSS", selected.cvss > 0 ? `${selected.cvss}/10` : "N/A"],
                          ["POS", `${selected.x.toFixed(1)}, ${selected.y.toFixed(1)}, ${selected.z.toFixed(1)}`],
                          ["LINKS", `${selected.connections.length} outbound`],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
                            <span style={{ color: (typeColor as any)[selected.type] }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 rounded text-[9px] font-mono leading-relaxed"
                        style={{ background: `${selected.color}10`, border: `1px solid ${selected.color}25`, color: "rgba(255,255,255,0.6)" }}>
                        {selected.desc}
                      </div>
                      {selected.connections.length > 0 && (
                        <div>
                          <div className="text-[8px] font-mono font-bold mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>EXPLOITS / TARGETS</div>
                          {selected.connections.map(cid => {
                            const n = nodeMap[cid];
                            if (!n) return null;
                            return (
                              <div key={cid} className="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80"
                                onClick={() => setSelected(n)}>
                                <div className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                                <span className="text-[9px] font-mono" style={{ color: n.color }}>{n.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Network className="w-8 h-8 mb-3" style={{ color: "rgba(167,139,250,0.2)" }} />
                      <div className="text-[10px] font-mono text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                        Click any node<br />to inspect it
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-[#0f0f0f] space-y-1">
                  {[["NODES", NODES.length], ["EDGES", NODES.reduce((a,n)=>a+n.connections.length,0)], ["CRITICAL CVEs", NODES.filter(n=>n.cvss>=9).length]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-[8px] font-mono">
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>{k}</span>
                      <span style={{ color: "#a78bfa" }}>{v}</span>
                    </div>
                  ))}
                  <div className="text-[8px] font-mono mt-2" style={{ color: "rgba(255,255,255,0.15)" }}>Drag · Scroll to zoom</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
