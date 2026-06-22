/**
 * PDF Report Generator — client-side using jsPDF
 * Generates professional dark-themed security reports
 */
import type { ChatMsg } from "./store";

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  line?: number;
  snippet?: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

interface ScanReportData {
  filename?: string;
  language?: string;
  summary: string;
  vulnerabilities: Vulnerability[];
  severityCounts: Record<string, number>;
  scanTimeMs?: number;
}

const SEV_COLORS = {
  critical: [220, 38, 38],
  high:     [234, 88, 12],
  medium:   [202, 138, 4],
  low:      [37, 99, 235],
  info:     [107, 114, 128],
} as const;

const SEV_LABELS = {
  critical: "حرج",
  high:     "عالٍ",
  medium:   "متوسط",
  low:      "منخفض",
  info:     "معلومة",
};

function wrapText(text: string, maxLen = 85): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

export async function generateScanReport(data: ScanReportData, filename = "security-report"): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210, margin = 16;
  let y = 0;

  // ── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 297, "F");

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(20, 5, 5);
  doc.rect(0, 0, W, 42, "F");
  // Red accent line
  doc.setFillColor(226, 18, 39);
  doc.rect(0, 0, 4, 42, "F");

  doc.setTextColor(226, 18, 39);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("KaliGPT Security Report", margin + 8, 16);

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`mr7.ai / KaliGPT v3.0`, margin + 8, 24);
  doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, margin + 8, 30);
  doc.text("CLASSIFICATION: CONFIDENTIAL", margin + 8, 36);

  y = 52;

  // ── File Info ────────────────────────────────────────────────────────────────
  if (data.filename || data.language) {
    doc.setFillColor(18, 18, 18);
    doc.rect(margin, y, W - margin * 2, 14, "F");
    doc.setFillColor(226, 18, 39);
    doc.rect(margin, y, 3, 14, "F");
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    if (data.filename) doc.text(`File: ${data.filename}`, margin + 7, y + 6);
    if (data.language) doc.text(`Language: ${data.language}`, margin + 7, y + 12);
    if (data.scanTimeMs) doc.text(`Scan time: ${(data.scanTimeMs / 1000).toFixed(2)}s`, margin + 100, y + 6);
    y += 20;
  }

  // ── Severity Summary ─────────────────────────────────────────────────────────
  doc.setTextColor(226, 18, 39);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Severity Summary", margin, y);
  y += 8;

  const sev = ["critical", "high", "medium", "low", "info"] as const;
  const boxW = (W - margin * 2 - 12) / 5;
  sev.forEach((s, i) => {
    const x = margin + i * (boxW + 3);
    const cnt = data.severityCounts[s] || 0;
    const [r, g, b] = SEV_COLORS[s];
    doc.setFillColor(r, g, b, 0.15);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, boxW, 18, 2, 2, "FD");
    doc.setTextColor(r, g, b);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(cnt), x + boxW / 2, y + 11, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.toUpperCase(), x + boxW / 2, y + 16, { align: "center" });
  });
  y += 26;

  // ── Executive Summary ────────────────────────────────────────────────────────
  doc.setTextColor(226, 18, 39);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  y += 6;
  doc.setFillColor(18, 18, 18);
  const summaryLines = wrapText(data.summary, 88);
  const summaryH = summaryLines.length * 5 + 8;
  doc.rect(margin, y, W - margin * 2, summaryH, "F");
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  summaryLines.forEach((line, i) => doc.text(line, margin + 4, y + 6 + i * 5));
  y += summaryH + 8;

  // ── Vulnerabilities ───────────────────────────────────────────────────────────
  doc.setTextColor(226, 18, 39);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Vulnerabilities (${data.vulnerabilities.length} found)`, margin, y);
  y += 8;

  for (const vuln of data.vulnerabilities) {
    // Page break check
    if (y > 255) {
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, W, 297, "F");
      y = 16;
    }

    const [r, g, b] = SEV_COLORS[vuln.severity as keyof typeof SEV_COLORS] || SEV_COLORS.info;
    doc.setFillColor(r / 10, g / 10, b / 10);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);

    const descLines = wrapText(vuln.description, 82);
    const recLines  = wrapText(vuln.recommendation, 82);
    const cardH = 8 + 6 + descLines.length * 4.5 + 6 + recLines.length * 4.5 + 6;

    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");
    doc.setFillColor(r, g, b);
    doc.rect(margin, y, 3, cardH, "F");

    // Title row
    doc.setTextColor(r, g, b);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(vuln.title, margin + 6, y + 6.5);

    // Badges
    doc.setFontSize(7);
    let bx = W - margin - 4;
    if (vuln.owasp) { doc.setTextColor(150, 150, 150); doc.text(vuln.owasp, bx, y + 6.5, { align: "right" }); bx -= doc.getTextWidth(vuln.owasp) + 6; }
    if (vuln.cwe) { doc.setTextColor(100, 160, 220); doc.text(vuln.cwe, bx, y + 6.5, { align: "right" }); }
    if (vuln.line) { doc.setTextColor(180, 180, 100); doc.text(`Line ${vuln.line}`, margin + 6, y + 11.5); }

    // Description
    let iy = y + 14;
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    descLines.forEach(l => { doc.text(l, margin + 6, iy); iy += 4.5; });

    // Recommendation
    iy += 2;
    doc.setTextColor(100, 200, 100);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendation:", margin + 6, iy); iy += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 210, 160);
    recLines.forEach(l => { doc.text(l, margin + 6, iy); iy += 4.5; });

    y += cardH + 4;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(20, 5, 5);
    doc.rect(0, 285, W, 12, "F");
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text("KaliGPT / mr7.ai — Confidential Security Report", margin, 292);
    doc.text(`Page ${i}/${pageCount}`, W - margin, 292, { align: "right" });
  }

  doc.save(`${filename}-${Date.now()}.pdf`);
}

export async function generateChatReport(
  messages: ChatMsg[],
  title = "تقرير محادثة KaliGPT",
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210, margin = 16;
  let y = 0;

  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 297, "F");

  // Header
  doc.setFillColor(20, 5, 5);
  doc.rect(0, 0, W, 38, "F");
  doc.setFillColor(226, 18, 39);
  doc.rect(0, 0, 4, 38, "F");

  doc.setTextColor(226, 18, 39);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("KaliGPT Chat Export", margin + 8, 14);
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, margin + 8, 22);
  doc.text(`${new Date().toLocaleString("en-US")} — ${messages.length} messages`, margin + 8, 29);
  y = 46;

  for (const msg of messages) {
    if (y > 265) {
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, W, 297, "F");
      y = 16;
    }

    const isUser = msg.role === "user";
    const lines = wrapText(msg.content, 85);
    const cardH = lines.length * 5 + 12;

    doc.setFillColor(isUser ? 30 : 18, isUser ? 10 : 18, isUser ? 10 : 18);
    doc.setDrawColor(isUser ? 226 : 40, isUser ? 18 : 40, isUser ? 39 : 40);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W - margin * 2, cardH, 2, 2, "FD");

    doc.setTextColor(isUser ? 226 : 100, isUser ? 100 : 210, isUser ? 120 : 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(isUser ? "USER" : "KALIGPT", margin + 4, y + 5.5);
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.text(new Date(msg.ts).toLocaleTimeString("en-US"), W - margin - 4, y + 5.5, { align: "right" });

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    lines.forEach((line, i) => doc.text(line, margin + 4, y + 10 + i * 5));
    y += cardH + 3;
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(20, 5, 5);
    doc.rect(0, 285, W, 12, "F");
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(7);
    doc.text("KaliGPT / mr7.ai — Chat Export", margin, 292);
    doc.text(`Page ${i}/${pageCount}`, W - margin, 292, { align: "right" });
  }

  doc.save(`chat-report-${Date.now()}.pdf`);
}
