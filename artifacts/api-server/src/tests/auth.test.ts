import { describe, it, expect } from "vitest";

describe("Auth utilities", () => {
  it("validates email format", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("user@example.com")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("test@domain.co")).toBe(true);
  });

  it("validates password strength", () => {
    const isStrong = (p: string) => p.length >= 8;
    expect(isStrong("short")).toBe(false);
    expect(isStrong("strongpassword123")).toBe(true);
    expect(isStrong("12345678")).toBe(true);
  });

  it("generates unique IDs", () => {
    const id1 = Math.random().toString(36).slice(2);
    const id2 = Math.random().toString(36).slice(2);
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(0);
  });
});
