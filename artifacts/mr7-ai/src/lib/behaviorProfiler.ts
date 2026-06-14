/*
  BEHAVIOR PROFILER — tracks user interaction patterns and classifies behavior.
  Stores history in localStorage. Completely non-intrusive.
*/

export type UserType = 'explorer' | 'focused' | 'passive';

export interface BehaviorSession {
  start:        number;
  end:          number;
  clicks:       number;
  keystrokes:   number;
  scrollEvents: number;
  panelsOpened: number;
  userType:     UserType;
}

export interface BehaviorSummary {
  currentType:       UserType;
  totalSessions:     number;
  avgClicksPerMin:   number;
  avgSessionMinutes: number;
  dominantBehavior:  UserType;
  recentSessions:    BehaviorSession[];
}

const STORAGE_KEY = 'mr7-behavior-v1';
const MAX_SESSIONS = 50;

class BehaviorProfiler {
  private sessions:   BehaviorSession[] = [];
  private current:    { start: number; clicks: number; keys: number; scroll: number; panels: number } = {
    start: Date.now(), clicks: 0, keys: 0, scroll: 0, panels: 0,
  };
  private recentClicks: number[] = [];
  private listening = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.sessions = JSON.parse(raw).slice(-MAX_SESSIONS);
    } catch { /* ignore */ }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions.slice(-MAX_SESSIONS)));
    } catch { /* ignore */ }
  }

  private classifyCurrentSession(): UserType {
    const durationMin  = (Date.now() - this.current.start) / 60_000;
    const cpm          = durationMin > 0 ? this.current.clicks / durationMin : 0;
    const panelRate    = durationMin > 0 ? this.current.panels / durationMin : 0;

    if (cpm > 12 || panelRate > 2) return 'explorer';
    if (Date.now() - this.current.start > 120_000 && this.current.clicks < 5) return 'passive';
    return 'focused';
  }

  recordClick()   { this.current.clicks++; this.recentClicks.push(Date.now()); }
  recordKey()     { this.current.keys++; }
  recordScroll()  { this.current.scroll++; }
  recordPanel()   { this.current.panels++; }

  flushSession() {
    const type = this.classifyCurrentSession();
    const sess: BehaviorSession = {
      start:        this.current.start,
      end:          Date.now(),
      clicks:       this.current.clicks,
      keystrokes:   this.current.keys,
      scrollEvents: this.current.scroll,
      panelsOpened: this.current.panels,
      userType:     type,
    };
    this.sessions.push(sess);
    this.saveToStorage();
    this.current = { start: Date.now(), clicks: 0, keys: 0, scroll: 0, panels: 0 };
  }

  getSummary(): BehaviorSummary {
    const recent = this.sessions.slice(-10);
    const total  = this.sessions.length;
    const now    = Date.now();

    this.recentClicks = this.recentClicks.filter(t => now - t < 60_000);
    const avgCPM  = this.recentClicks.length;

    const avgMin  = recent.length > 0
      ? recent.reduce((a, s) => a + (s.end - s.start) / 60_000, 0) / recent.length
      : 0;

    const typeCounts = { explorer: 0, focused: 0, passive: 0 };
    this.sessions.forEach(s => { typeCounts[s.userType]++; });
    const dominant = (Object.keys(typeCounts) as UserType[]).reduce((a, b) =>
      typeCounts[a] >= typeCounts[b] ? a : b, 'focused' as UserType);

    return {
      currentType:       this.classifyCurrentSession(),
      totalSessions:     total,
      avgClicksPerMin:   avgCPM,
      avgSessionMinutes: Math.round(avgMin * 10) / 10,
      dominantBehavior:  dominant,
      recentSessions:    recent,
    };
  }

  startListening() {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;

    window.addEventListener('click',   () => this.recordClick(),  { passive: true });
    window.addEventListener('keydown', () => this.recordKey(),    { passive: true });
    window.addEventListener('scroll',  () => this.recordScroll(), { passive: true, capture: true });

    setInterval(() => this.flushSession(), 5 * 60_000);
  }
}

export const behaviorProfiler = new BehaviorProfiler();
if (typeof window !== 'undefined') behaviorProfiler.startListening();
