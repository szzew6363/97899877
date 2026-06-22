import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

const app = express();
app.get("/healthz", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

describe("Health endpoint", () => {
  it("GET /healthz returns 200 with status ok", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
