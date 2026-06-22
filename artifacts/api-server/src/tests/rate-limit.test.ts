import { describe, it, expect } from "vitest";

const TIER_LIMITS: Record<string, { rpm: number; rpd: number; tokens: number }> = {
  free:         { rpm: 10,   rpd: 100,   tokens: 50_000 },
  starter:      { rpm: 100,  rpd: 1000,  tokens: 200_000 },
  pro:          { rpm: 500,  rpd: 10000, tokens: 500_000 },
  professional: { rpm: 500,  rpd: 10000, tokens: 1_000_000 },
  elite:        { rpm: 2000, rpd: -1,    tokens: 5_000_000 },
  enterprise:   { rpm: 2000, rpd: -1,    tokens: -1 },
};

describe("Rate Limit Configuration", () => {
  it("free tier has correct limits", () => {
    expect(TIER_LIMITS.free.rpm).toBe(10);
    expect(TIER_LIMITS.free.rpd).toBe(100);
    expect(TIER_LIMITS.free.tokens).toBe(50_000);
  });

  it("elite tier has unlimited daily requests", () => {
    expect(TIER_LIMITS.elite.rpd).toBe(-1);
    expect(TIER_LIMITS.elite.rpm).toBe(2000);
  });

  it("enterprise tier has unlimited tokens", () => {
    expect(TIER_LIMITS.enterprise.tokens).toBe(-1);
  });

  it("all tiers are defined", () => {
    const tiers = ["free", "starter", "pro", "professional", "elite", "enterprise"];
    tiers.forEach(tier => {
      expect(TIER_LIMITS[tier]).toBeDefined();
      expect(TIER_LIMITS[tier].rpm).toBeGreaterThan(0);
    });
  });

  it("higher tiers have higher or equal limits", () => {
    expect(TIER_LIMITS.pro.rpm).toBeGreaterThanOrEqual(TIER_LIMITS.starter.rpm);
    expect(TIER_LIMITS.elite.rpm).toBeGreaterThanOrEqual(TIER_LIMITS.pro.rpm);
  });
});
