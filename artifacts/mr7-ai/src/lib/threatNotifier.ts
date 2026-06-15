/**
 * THREAT NOTIFIER — Real-time cybersecurity alert system
 *
 * Architecture:
 * 1. Connects to /api/cisa-live WebSocket — receives new KEV entries pushed by server
 * 2. Requests browser Notification API permission on first new entry
 * 3. Shows native OS notification for each new CISA KEV CVE
 * 4. Stores seen CVE IDs in localStorage to survive page reloads
 * 5. Exports `useThreatNotifications()` React hook for UI integration
 */

import { useEffect, useRef, useState } from "react";

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface ThreatAlert {
  id: string;
  cveID: string;
  product: string;
  vendorProject: string;
  vulnerabilityName: string;
  shortDescription: string;
  dateAdded: string;
  ransomware: boolean;
  receivedAt: number;
  type: "kev_new" | "kev_snapshot";
}

type WsMessage =
  | { type: "new_entries"; items: KevVuln[]; total: number; version: string }
  | { type: "snapshot"; items: KevVuln[]; total: number; version: string };

interface KevVuln {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  knownRansomwareCampaignUse: string;
}

/* ── localStorage helpers ────────────────────────────────────────────────── */
const SEEN_KEY = "mr7-ai-seen-cve-ids";
const ALERTS_KEY = "mr7-ai-threat-alerts";
const MAX_ALERTS = 50;

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-500)));
  } catch {}
}

function loadAlerts(): ThreatAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as ThreatAlert[]) : [];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: ThreatAlert[]) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts.slice(-MAX_ALERTS)));
  } catch {}
}

/* ── Browser Notification helper ─────────────────────────────────────────── */
async function requestNotifPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showOsNotification(alert: ThreatAlert) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const ransomTag = alert.ransomware ? "[RANSOMWARE]" : "";
    const n = new Notification(`CRITICAL: ${alert.cveID} ${ransomTag}`, {
      body: `${alert.vendorProject} ${alert.product}\n${alert.shortDescription}`,
      icon: "/favicon.ico",
      tag: alert.cveID,
      requireInteraction: alert.ransomware,
    });
    /* Auto-close non-ransomware notifications after 8s */
    if (!alert.ransomware) setTimeout(() => n.close(), 8000);
  } catch {}
}

/* ── Core service class ──────────────────────────────────────────────────── */
type AlertListener = (alerts: ThreatAlert[]) => void;
type CountListener = (count: number) => void;

class ThreatNotifierService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 2000;
  private destroyed = false;
  private alertListeners = new Set<AlertListener>();
  private countListeners = new Set<CountListener>();

  private seenIds: Set<string> = loadSeenIds();
  private alerts: ThreatAlert[] = loadAlerts();
  private permissionGranted = false;
  private newCount = 0;

  start() {
    this.connect();
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onAlerts(cb: AlertListener) {
    this.alertListeners.add(cb);
    cb(this.alerts);
    return () => this.alertListeners.delete(cb);
  }

  onCount(cb: CountListener) {
    this.countListeners.add(cb);
    cb(this.newCount);
    return () => this.countListeners.delete(cb);
  }

  clearCount() {
    this.newCount = 0;
    this.countListeners.forEach(cb => cb(0));
  }

  getAlerts() { return this.alerts; }
  getNewCount() { return this.newCount; }

  private connect() {
    if (this.destroyed) return;
    try {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${location.host}/api/cisa-live`;
      this.ws = new WebSocket(url);
      this.ws.onopen = () => { this.reconnectDelay = 2000; };
      this.ws.onmessage = (ev) => { this.handleMessage(ev); };
      this.ws.onclose = () => { this.scheduleReconnect(); };
      this.ws.onerror = () => { this.ws?.close(); };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.destroyed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(60000, this.reconnectDelay * 1.5);
      this.connect();
    }, this.reconnectDelay);
  }

  private async handleMessage(ev: MessageEvent) {
    let msg: WsMessage;
    try { msg = JSON.parse(ev.data as string) as WsMessage; } catch { return; }

    if (msg.type === "new_entries" && msg.items.length > 0) {
      /* Filter out already-seen CVEs */
      const fresh = msg.items.filter(v => !this.seenIds.has(v.cveID));
      if (fresh.length === 0) return;

      /* Request permission if not yet granted */
      if (!this.permissionGranted) {
        this.permissionGranted = await requestNotifPermission();
      }

      const now = Date.now();
      const newAlerts: ThreatAlert[] = fresh.map(v => ({
        id: `${v.cveID}-${now}`,
        cveID: v.cveID,
        product: v.product,
        vendorProject: v.vendorProject,
        vulnerabilityName: v.vulnerabilityName,
        shortDescription: v.shortDescription,
        dateAdded: v.dateAdded,
        ransomware: v.knownRansomwareCampaignUse === "Known",
        receivedAt: now,
        type: "kev_new",
      }));

      /* Update state */
      fresh.forEach(v => this.seenIds.add(v.cveID));
      saveSeenIds(this.seenIds);

      this.alerts = [...newAlerts, ...this.alerts].slice(0, MAX_ALERTS);
      saveAlerts(this.alerts);

      this.newCount += fresh.length;

      /* Fire OS notifications */
      newAlerts.forEach(a => showOsNotification(a));

      /* Notify React subscribers */
      this.alertListeners.forEach(cb => cb(this.alerts));
      this.countListeners.forEach(cb => cb(this.newCount));

    } else if (msg.type === "snapshot") {
      /* Initial snapshot — mark all as seen without notifying */
      msg.items.forEach(v => this.seenIds.add(v.cveID));
      saveSeenIds(this.seenIds);
    }
  }
}

/* ── Singleton ────────────────────────────────────────────────────────────── */
let _instance: ThreatNotifierService | null = null;

export function getThreatNotifier(): ThreatNotifierService {
  if (!_instance) {
    _instance = new ThreatNotifierService();
    _instance.start();
  }
  return _instance;
}

/* ── React hook ──────────────────────────────────────────────────────────── */
export function useThreatNotifications() {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const serviceRef = useRef<ThreatNotifierService | null>(null);

  useEffect(() => {
    const svc = getThreatNotifier();
    serviceRef.current = svc;

    const unAlerts = svc.onAlerts(setAlerts);
    const unCount = svc.onCount(setNewCount);

    /* Check current notification permission */
    if (typeof Notification !== "undefined") {
      setPermissionGranted(Notification.permission === "granted");
    }

    return () => { unAlerts(); unCount(); };
  }, []);

  const clearCount = () => serviceRef.current?.clearCount();
  const requestPermission = async () => {
    const ok = await requestNotifPermission();
    setPermissionGranted(ok);
    return ok;
  };

  return { alerts, newCount, permissionGranted, clearCount, requestPermission };
}
