/*
 ██████╗██╗   ██╗██████╗ ███████╗██████╗     ██████╗ ██████╗  █████╗ ██╗███╗   ██╗
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗    ██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝    ██████╔╝██████╔╝███████║██║██╔██╗ ██║
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗    ██╔══██╗██╔══██╗██╔══██║██║██║╚██╗██║
╚██████╗   ██║   ██████╔╝███████╗██║  ██║    ██████╔╝██║  ██║██║  ██║██║██║ ╚████║
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝

Central AI Decision Engine — aggregates all system singletons, scores state,
makes autonomous decisions, drives the Intelligence HUD and Command Center.
*/

import { anomalyDetector } from './anomaly-detector';
import { trafficBus } from './trafficBus';
import { perfMonitor } from './perf-monitor';

export type ThreatLevel = 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface BrainScores {
  systemHealth:      number;  // 0–100
  networkStability:  number;  // 0–100
  threatLevel:       number;  // 0–100 (higher = more threat)
  userEngagement:    number;  // 0–100
  overallScore:      number;  // 0–100
}

export type DecisionType =
  | 'reduce_load' | 'highlight_network' | 'alert_threat'
  | 'optimize' | 'idle_mode' | 'stress_test' | 'latency_spike'
  | 'intrusion_sim' | 'traffic_spike' | 'reset' | 'stabilized' | 'engaged';

export interface BrainDecision {
  id:       string;
  ts:       number;
  type:     DecisionType;
  message:  string;
  severity: 'info' | 'warn' | 'critical';
  auto:     boolean;
}

export type BrainEventType = 'scores_update' | 'decision' | 'threat_detected'
  | 'simulation_start' | 'simulation_end' | 'anomaly';

export interface BrainEvent {
  type:    BrainEventType;
  payload: BrainScores | BrainDecision | { message: string; simulationType?: string };
  ts:      number;
}

export interface SimulationState {
  stressTest:    boolean;
  latencySpike:  boolean;
  intrusionSim:  boolean;
  trafficSpike:  boolean;
}

export interface UserProfile {
  type:              'explorer' | 'focused' | 'passive';
  interactionCount:  number;
  sessionDurationMs: number;
  lastActive:        number;
  clicksPerMinute:   number;
  keystrokes:        number;
}

/* ── Decision cooldown: avoid spam ── */
const DECISION_COOLDOWN_MS = 30_000;
const lastDecisionByType = new Map<DecisionType, number>();

let _decisionCounter = 0;

class CyberBrainEngine {
  private scores: BrainScores = {
    systemHealth:     85,
    networkStability: 90,
    threatLevel:      8,
    userEngagement:   50,
    overallScore:     82,
  };

  private decisions:  BrainDecision[] = [];
  private subscribers = new Set<(e: BrainEvent) => void>();
  private intervalId:  ReturnType<typeof setInterval> | null = null;
  private ticks = 0;

  private sim: SimulationState = {
    stressTest:   false,
    latencySpike: false,
    intrusionSim: false,
    trafficSpike: false,
  };

  private userProfile: UserProfile = {
    type:              'focused',
    interactionCount:  0,
    sessionDurationMs: 0,
    lastActive:        Date.now(),
    clicksPerMinute:   0,
    keystrokes:        0,
  };

  private recentClicks: number[] = [];
  private sessionStart = Date.now();

  /* ── Public API ──────────────────────────────────────────────────────────── */

  subscribe(cb: (e: BrainEvent) => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  getScores():      BrainScores    { return { ...this.scores }; }
  getDecisions():   BrainDecision[]{ return [...this.decisions]; }
  getSimState():    SimulationState { return { ...this.sim }; }
  getUserProfile(): UserProfile    { return { ...this.userProfile }; }

  getThreatLevel(): ThreatLevel {
    const t = this.scores.threatLevel;
    if (t >= 75) return 'CRITICAL';
    if (t >= 50) return 'HIGH';
    if (t >= 25) return 'ELEVATED';
    return 'NOMINAL';
  }

  /* ── Simulations ─────────────────────────────────────────────────────────── */

  simulateStressTest(durationMs = 30_000) {
    if (this.sim.stressTest) return;
    this.sim.stressTest = true;
    this.addDecision({ type: 'stress_test', message: 'CPU stress simulation active — monitoring resilience thresholds', severity: 'warn', auto: false });
    this.emit({ type: 'simulation_start', payload: { message: 'Stress test initiated', simulationType: 'stress_test' }, ts: Date.now() });
    setTimeout(() => {
      this.sim.stressTest = false;
      this.addDecision({ type: 'stabilized', message: 'Stress test complete — system returned to baseline', severity: 'info', auto: true });
      this.emit({ type: 'simulation_end', payload: { message: 'Stress test ended', simulationType: 'stress_test' }, ts: Date.now() });
    }, durationMs);
  }

  simulateLatencySpike(durationMs = 20_000) {
    if (this.sim.latencySpike) return;
    this.sim.latencySpike = true;
    this.addDecision({ type: 'latency_spike', message: 'Latency spike simulation — testing network tolerance', severity: 'warn', auto: false });
    this.emit({ type: 'simulation_start', payload: { message: 'Latency spike initiated', simulationType: 'latency_spike' }, ts: Date.now() });
    setTimeout(() => {
      this.sim.latencySpike = false;
      this.addDecision({ type: 'stabilized', message: 'Latency simulation ended — network recovered', severity: 'info', auto: true });
      this.emit({ type: 'simulation_end', payload: { message: 'Latency spike ended', simulationType: 'latency_spike' }, ts: Date.now() });
    }, durationMs);
  }

  simulateIntrusionAttempt(durationMs = 15_000) {
    if (this.sim.intrusionSim) return;
    this.sim.intrusionSim = true;
    this.addDecision({ type: 'intrusion_sim', message: 'Simulated intrusion attempt — testing detection systems', severity: 'critical', auto: false });
    this.emit({ type: 'simulation_start', payload: { message: 'Intrusion simulation initiated', simulationType: 'intrusion_sim' }, ts: Date.now() });
    setTimeout(() => {
      this.sim.intrusionSim = false;
      this.addDecision({ type: 'stabilized', message: 'Intrusion simulation resolved — defenses validated', severity: 'info', auto: true });
      this.emit({ type: 'simulation_end', payload: { message: 'Intrusion sim ended', simulationType: 'intrusion_sim' }, ts: Date.now() });
    }, durationMs);
  }

  simulateTrafficSpike(durationMs = 25_000) {
    if (this.sim.trafficSpike) return;
    this.sim.trafficSpike = true;
    this.addDecision({ type: 'traffic_spike', message: 'Simulated traffic spike — evaluating load handling', severity: 'warn', auto: false });
    this.emit({ type: 'simulation_start', payload: { message: 'Traffic spike initiated', simulationType: 'traffic_spike' }, ts: Date.now() });
    setTimeout(() => {
      this.sim.trafficSpike = false;
      this.addDecision({ type: 'stabilized', message: 'Traffic spike simulation complete', severity: 'info', auto: true });
      this.emit({ type: 'simulation_end', payload: { message: 'Traffic spike ended', simulationType: 'traffic_spike' }, ts: Date.now() });
    }, durationMs);
  }

  resetAllSimulations() {
    this.sim = { stressTest: false, latencySpike: false, intrusionSim: false, trafficSpike: false };
    this.addDecision({ type: 'reset', message: 'All simulations reset — system returned to observation mode', severity: 'info', auto: false });
  }

  /* ── Internals ───────────────────────────────────────────────────────────── */

  private emit(e: BrainEvent) {
    this.subscribers.forEach(cb => { try { cb(e); } catch { /**/ } });
  }

  private makeId() { return `dec-${++_decisionCounter}-${Date.now().toString(36)}`; }

  private canDecide(type: DecisionType): boolean {
    const last = lastDecisionByType.get(type) ?? 0;
    if (Date.now() - last < DECISION_COOLDOWN_MS) return false;
    lastDecisionByType.set(type, Date.now());
    return true;
  }

  private addDecision(params: Omit<BrainDecision, 'id' | 'ts'>) {
    const dec: BrainDecision = { ...params, id: this.makeId(), ts: Date.now() };
    this.decisions.unshift(dec);
    if (this.decisions.length > 200) this.decisions.length = 200;
    this.emit({ type: 'decision', payload: dec, ts: Date.now() });
  }

  private computeScores() {
    /* System health from perf monitor */
    const perf   = perfMonitor.snapshot();
    const fps    = perf.fps > 0 ? perf.fps : 60;
    const fpsScore   = Math.min(fps / 60, 1) * 100;
    const memScore   = (1 - Math.min(perf.memoryPct, 1)) * 100;
    const latMs      = perf.avgLatencyMs;
    const latScore   = latMs < 150 ? 100 : latMs < 400 ? 80 : latMs < 800 ? 55 : latMs < 2000 ? 30 : 15;
    let systemHealth = fpsScore * 0.25 + memScore * 0.30 + latScore * 0.45;
    if (this.sim.stressTest) systemHealth = Math.max(5, systemHealth - 38);

    /* Network from traffic bus */
    const traffic    = trafficBus.history.slice(0, 20);
    const finished   = traffic.filter(t => t.status === 'success' || t.status === 'error');
    const errorRate  = finished.length > 0 ? finished.filter(t => t.status === 'error').length / finished.length : 0;
    const avgLat     = finished.filter(t => t.latency).reduce((a, t) => a + (t.latency ?? 0), 0) / Math.max(finished.filter(t => t.latency).length, 1);
    let netStability = Math.max(0, 100 - errorRate * 60 - (avgLat > 2000 ? 30 : avgLat > 800 ? 15 : 0));
    if (this.sim.latencySpike)  netStability = Math.max(10, netStability - 42);
    if (this.sim.trafficSpike)  netStability = Math.max(20, netStability - 25);

    /* Threat from anomaly detector + simulations */
    const anomStats  = anomalyDetector.getStats();
    let   threat     = Math.min(100, anomStats.riskScore * 1.2);
    if (this.sim.stressTest)    threat = Math.min(100, threat + 28);
    if (this.sim.intrusionSim)  threat = Math.min(100, threat + 55);
    if (this.sim.trafficSpike)  threat = Math.min(100, threat + 18);

    /* User engagement */
    const idle       = Date.now() - this.userProfile.lastActive;
    const engBase    = idle < 5_000 ? 95 : idle < 30_000 ? 75 : idle < 120_000 ? 42 : 18;
    const engagement = Math.min(100, engBase + Math.min(this.recentClicks.length * 3, 20));

    /* Overall */
    const overall = systemHealth * 0.30 + netStability * 0.28 + (100 - threat) * 0.28 + engagement * 0.14;

    this.scores = {
      systemHealth:     Math.round(Math.max(0, Math.min(100, systemHealth))),
      networkStability: Math.round(Math.max(0, Math.min(100, netStability))),
      threatLevel:      Math.round(Math.max(0, Math.min(100, threat))),
      userEngagement:   Math.round(Math.max(0, Math.min(100, engagement))),
      overallScore:     Math.round(Math.max(0, Math.min(100, overall))),
    };
  }

  private computeUserProfile() {
    const now    = Date.now();
    this.recentClicks = this.recentClicks.filter(t => now - t < 60_000);
    const cpm    = this.recentClicks.length;
    this.userProfile.clicksPerMinute   = cpm;
    this.userProfile.sessionDurationMs = now - this.sessionStart;

    const idle   = now - this.userProfile.lastActive;
    if (idle > 120_000) {
      this.userProfile.type = 'passive';
    } else if (cpm > 8 || this.userProfile.keystrokes > 50) {
      this.userProfile.type = 'explorer';
    } else {
      this.userProfile.type = 'focused';
    }
  }

  private runAutoDecisions() {
    const { systemHealth, networkStability, threatLevel, userEngagement } = this.scores;

    if (systemHealth < 40 && this.canDecide('reduce_load'))
      this.addDecision({ type: 'reduce_load', message: `System health at ${systemHealth}% — visual load reduction activated`, severity: 'critical', auto: true });

    if (networkStability < 35 && this.canDecide('highlight_network'))
      this.addDecision({ type: 'highlight_network', message: `Network instability (${networkStability}%) — route analysis triggered`, severity: 'warn', auto: true });

    if (threatLevel > 65 && this.canDecide('alert_threat'))
      this.addDecision({ type: 'alert_threat', message: `Threat level elevated to ${threatLevel}% — defense systems on standby`, severity: 'critical', auto: true });

    if (userEngagement < 20 && this.canDecide('idle_mode'))
      this.addDecision({ type: 'idle_mode', message: 'User idle — reducing background processing', severity: 'info', auto: true });

    if (userEngagement > 80 && systemHealth > 75 && this.canDecide('engaged'))
      this.addDecision({ type: 'engaged', message: 'High engagement detected — optimizing response pipeline', severity: 'info', auto: true });
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────────── */

  recordInteraction(type: 'click' | 'key' = 'click') {
    const now = Date.now();
    this.userProfile.lastActive = now;
    this.userProfile.interactionCount++;
    if (type === 'click') this.recentClicks.push(now);
    else this.userProfile.keystrokes++;
  }

  start() {
    if (this.intervalId) return;

    anomalyDetector.subscribe((ev) => {
      this.emit({ type: 'threat_detected', payload: { message: ev.message }, ts: Date.now() });
      this.emit({ type: 'anomaly', payload: { message: ev.message }, ts: Date.now() });
    });

    this.intervalId = setInterval(() => {
      this.ticks++;
      this.computeScores();
      this.computeUserProfile();
      this.emit({ type: 'scores_update', payload: { ...this.scores }, ts: Date.now() });
      if (this.ticks % 15 === 0) this.runAutoDecisions();
    }, 2_000);

    if (typeof window !== 'undefined') {
      window.addEventListener('click',   () => this.recordInteraction('click'), { passive: true });
      window.addEventListener('keydown', () => this.recordInteraction('key'),   { passive: true });
    }
  }

  stop() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }
}

export const cyberBrain = new CyberBrainEngine();
if (typeof window !== 'undefined') cyberBrain.start();
