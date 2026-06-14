/*
  INTELLIGENCE MEMORY — persists scoring history, decisions, and anomalies
  across sessions. Used by the Command Center timeline and trend displays.
*/

import type { BrainScores, BrainDecision } from './cyberBrain';

export interface ScoreSnapshot {
  ts:      number;
  health:  number;
  network: number;
  threat:  number;
  engage:  number;
  overall: number;
}

export interface MemorySummary {
  scoreHistory:   ScoreSnapshot[];
  decisionHistory: BrainDecision[];
  anomalyHistory:  { ts: number; message: string; severity: string }[];
  sessionCount:    number;
  avgHealth:       number;
  avgThreat:       number;
  peakThreat:      number;
  peakHealth:      number;
}

const SCORE_KEY    = 'mr7-intel-scores-v1';
const DECISION_KEY = 'mr7-intel-decisions-v1';
const ANOMALY_KEY  = 'mr7-intel-anomalies-v1';
const SESSION_KEY  = 'mr7-intel-sessions-v1';

const MAX_SCORES    = 500;
const MAX_DECISIONS = 200;
const MAX_ANOMALIES = 200;

class IntelligenceMemory {
  private scores:    ScoreSnapshot[] = [];
  private decisions: BrainDecision[] = [];
  private anomalies: { ts: number; message: string; severity: string }[] = [];
  private sessionCount = 0;

  constructor() {
    this.load();
    this.sessionCount++;
    this.save();
  }

  private load() {
    try {
      const s = localStorage.getItem(SCORE_KEY);
      const d = localStorage.getItem(DECISION_KEY);
      const a = localStorage.getItem(ANOMALY_KEY);
      const c = localStorage.getItem(SESSION_KEY);
      if (s) this.scores    = JSON.parse(s).slice(-MAX_SCORES);
      if (d) this.decisions = JSON.parse(d).slice(-MAX_DECISIONS);
      if (a) this.anomalies = JSON.parse(a).slice(-MAX_ANOMALIES);
      if (c) this.sessionCount = parseInt(c, 10) || 0;
    } catch { /* ignore */ }
  }

  private save() {
    try {
      localStorage.setItem(SCORE_KEY,    JSON.stringify(this.scores.slice(-MAX_SCORES)));
      localStorage.setItem(DECISION_KEY, JSON.stringify(this.decisions.slice(-MAX_DECISIONS)));
      localStorage.setItem(ANOMALY_KEY,  JSON.stringify(this.anomalies.slice(-MAX_ANOMALIES)));
      localStorage.setItem(SESSION_KEY,  String(this.sessionCount));
    } catch { /* ignore */ }
  }

  pushScores(s: BrainScores) {
    this.scores.push({
      ts:      Date.now(),
      health:  s.systemHealth,
      network: s.networkStability,
      threat:  s.threatLevel,
      engage:  s.userEngagement,
      overall: s.overallScore,
    });
    if (this.scores.length > MAX_SCORES) this.scores.shift();
    if (this.scores.length % 10 === 0) this.save();
  }

  pushDecision(d: BrainDecision) {
    this.decisions.unshift(d);
    if (this.decisions.length > MAX_DECISIONS) this.decisions.pop();
    this.save();
  }

  pushAnomaly(msg: string, severity = 'medium') {
    this.anomalies.unshift({ ts: Date.now(), message: msg, severity });
    if (this.anomalies.length > MAX_ANOMALIES) this.anomalies.pop();
    this.save();
  }

  getSummary(): MemorySummary {
    const recent200 = this.scores.slice(-200);
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      scoreHistory:    [...this.scores],
      decisionHistory: [...this.decisions],
      anomalyHistory:  [...this.anomalies],
      sessionCount:    this.sessionCount,
      avgHealth:  Math.round(avg(recent200.map(s => s.health))),
      avgThreat:  Math.round(avg(recent200.map(s => s.threat))),
      peakThreat: Math.round(Math.max(0, ...this.scores.map(s => s.threat))),
      peakHealth: Math.round(Math.max(0, ...this.scores.map(s => s.health))),
    };
  }

  getRecentScores(n = 60): ScoreSnapshot[] {
    return this.scores.slice(-n);
  }

  clear() {
    this.scores = []; this.decisions = []; this.anomalies = [];
    this.save();
  }
}

export const intelligenceMemory = new IntelligenceMemory();
