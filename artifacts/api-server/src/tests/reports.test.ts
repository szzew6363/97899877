import { describe, it, expect } from "vitest";

const TEMPLATES = ["pentest", "vulnerability", "audit"];
const SEVERITIES = ["critical", "high", "medium", "low", "info"];

function buildReport(template: string, title: string, findings: { severity: string; title: string }[]) {
  const summary = {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
    info: findings.filter(f => f.severity === "info").length,
  };
  return { id: Math.random().toString(36).slice(2), template, title, findings, summary, generatedAt: new Date().toISOString() };
}

describe("Report Generation", () => {
  it("builds a pentest report with correct structure", () => {
    const report = buildReport("pentest", "Test Report", [
      { severity: "critical", title: "SQL Injection" },
      { severity: "high", title: "XSS" },
      { severity: "medium", title: "Insecure Cookie" },
    ]);
    expect(report.template).toBe("pentest");
    expect(report.title).toBe("Test Report");
    expect(report.summary.critical).toBe(1);
    expect(report.summary.high).toBe(1);
    expect(report.summary.medium).toBe(1);
    expect(report.findings.length).toBe(3);
    expect(report.id).toBeTruthy();
  });

  it("all report templates are valid", () => {
    TEMPLATES.forEach(tpl => {
      const report = buildReport(tpl, "Test", []);
      expect(report.template).toBe(tpl);
    });
  });

  it("handles empty findings gracefully", () => {
    const report = buildReport("audit", "Clean Audit", []);
    expect(report.summary.critical).toBe(0);
    expect(report.summary.high).toBe(0);
    expect(report.findings.length).toBe(0);
  });

  it("severity counts are accurate", () => {
    const findings = SEVERITIES.map(s => ({ severity: s, title: `${s} finding` }));
    const report = buildReport("vulnerability", "Full Report", findings);
    expect(report.summary.critical).toBe(1);
    expect(report.summary.high).toBe(1);
    expect(report.summary.medium).toBe(1);
    expect(report.summary.low).toBe(1);
    expect(report.summary.info).toBe(1);
  });
});
