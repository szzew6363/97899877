/**
 * Organizations & Teams — System #8
 * Full org management: create, invite, roles, members, billing seat tracking
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth, requireAuth } from "../middlewares/jwtAuth";
import crypto from "crypto";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getUserOrg(userId: string) {
  const { rows } = await pool.query(
    `SELECT o.*, om.role as member_role FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function requireOrgRole(req: Request, res: Response, minRole: "member" | "admin" | "owner"): Promise<{ orgId: string; role: string } | null> {
  const org = await getUserOrg(req.authUser!.id);
  if (!org) { res.status(404).json({ error: "You are not part of any organization" }); return null; }
  const roleOrder = { member: 0, admin: 1, owner: 2 };
  if (roleOrder[org.member_role as keyof typeof roleOrder] < roleOrder[minRole]) {
    res.status(403).json({ error: `Requires ${minRole} role` }); return null;
  }
  return { orgId: org.id, role: org.member_role };
}

// ── POST /api/orgs — Create organization ─────────────────────────────────────
router.post("/orgs", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, description, domain } = req.body as Record<string, string>;
  if (!name?.trim()) { res.status(400).json({ error: "Organization name required" }); return; }
  try {
    const existing = await getUserOrg(req.authUser!.id);
    if (existing) { res.status(409).json({ error: "You already belong to an organization" }); return; }

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 50);
    const { rows } = await pool.query(
      `INSERT INTO organizations (name, slug, description, domain, owner_id, plan, max_members)
       VALUES ($1, $2, $3, $4, $5, 'free', 5) RETURNING *`,
      [name.trim(), slug, description || null, domain || null, req.authUser!.id]
    );
    const org = rows[0];
    await pool.query(
      `INSERT INTO org_members (org_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
      [org.id, req.authUser!.id]
    );
    res.status(201).json({ org });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

// ── GET /api/orgs/me — Get my organization ───────────────────────────────────
router.get("/orgs/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const org = await getUserOrg(req.authUser!.id);
    if (!org) { res.json({ org: null }); return; }

    const { rows: members } = await pool.query(
      `SELECT om.id, om.role, om.status, om.created_at,
              u.id as user_id, u.email, u.first_name, u.last_name, u.profile_image_url, u.last_login_at
       FROM org_members om JOIN users u ON u.id = om.user_id
       WHERE om.org_id = $1 ORDER BY om.created_at ASC`,
      [org.id]
    );

    const { rows: invites } = await pool.query(
      `SELECT id, email, role, status, expires_at, created_at FROM org_invites
       WHERE org_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
      [org.id]
    );

    res.json({ org, members, invites });
  } catch { res.status(500).json({ error: "Failed to fetch organization" }); }
});

// ── PUT /api/orgs/me — Update organization ───────────────────────────────────
router.put("/orgs/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const ctx = await requireOrgRole(req, res, "admin");
  if (!ctx) return;
  const { name, description, domain, avatarUrl } = req.body as Record<string, string>;
  try {
    await pool.query(
      `UPDATE organizations SET name=COALESCE($1,name), description=COALESCE($2,description),
       domain=COALESCE($3,domain), avatar_url=COALESCE($4,avatar_url), updated_at=NOW() WHERE id=$5`,
      [name || null, description || null, domain || null, avatarUrl || null, ctx.orgId]
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update" }); }
});

// ── POST /api/orgs/invite — Invite member ────────────────────────────────────
router.post("/orgs/invite", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const ctx = await requireOrgRole(req, res, "admin");
  if (!ctx) return;
  const { email, role = "member" } = req.body as { email?: string; role?: string };
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  if (!["member", "admin"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

  try {
    const { rows: org } = await pool.query("SELECT * FROM organizations WHERE id=$1", [ctx.orgId]);
    const { rows: members } = await pool.query("SELECT COUNT(*) as cnt FROM org_members WHERE org_id=$1 AND status='active'", [ctx.orgId]);
    if (parseInt(members[0].cnt) >= org[0].max_members) {
      res.status(429).json({ error: `Organization is at capacity (${org[0].max_members} members)` }); return;
    }

    // Check if user already member
    const { rows: existing } = await pool.query(
      `SELECT u.id FROM users u JOIN org_members om ON om.user_id=u.id WHERE u.email=$1 AND om.org_id=$2`,
      [email, ctx.orgId]
    );
    if (existing.length) { res.status(409).json({ error: "User is already a member" }); return; }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 7 * 86400_000);

    await pool.query(
      `INSERT INTO org_invites (org_id, email, role, token, status, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6)
       ON CONFLICT (org_id, email) DO UPDATE SET token=$4, role=$3, status='pending', expires_at=$6`,
      [ctx.orgId, email, role, token, req.authUser!.id, expires]
    );

    res.json({ ok: true, token, inviteUrl: `/join?token=${token}` });
  } catch { res.status(500).json({ error: "Failed to send invite" }); }
});

// ── POST /api/orgs/join — Accept invite ──────────────────────────────────────
router.post("/orgs/join", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ error: "Token required" }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM org_invites WHERE token=$1 AND status='pending' AND expires_at>NOW()`,
      [token]
    );
    if (!rows.length) { res.status(400).json({ error: "Invalid or expired invite" }); return; }
    const invite = rows[0];

    const existing = await getUserOrg(req.authUser!.id);
    if (existing) { res.status(409).json({ error: "You already belong to an organization" }); return; }

    await pool.query(
      `INSERT INTO org_members (org_id, user_id, role, status) VALUES ($1, $2, $3, 'active')`,
      [invite.org_id, req.authUser!.id, invite.role]
    );
    await pool.query(`UPDATE org_invites SET status='accepted' WHERE id=$1`, [invite.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to join organization" }); }
});

// ── PUT /api/orgs/members/:userId — Change role ───────────────────────────────
router.put("/orgs/members/:userId", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const ctx = await requireOrgRole(req, res, "admin");
  if (!ctx) return;
  const { role } = req.body as { role?: string };
  if (!role || !["member", "admin"].includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }
  try {
    await pool.query(`UPDATE org_members SET role=$1 WHERE org_id=$2 AND user_id=$3 AND role!='owner'`, [role, ctx.orgId, req.params.userId]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to update role" }); }
});

// ── DELETE /api/orgs/members/:userId — Remove member ─────────────────────────
router.delete("/orgs/members/:userId", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const ctx = await requireOrgRole(req, res, "admin");
  if (!ctx) return;
  try {
    await pool.query(`DELETE FROM org_members WHERE org_id=$1 AND user_id=$2 AND role!='owner'`, [ctx.orgId, req.params.userId]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed to remove member" }); }
});

// ── GET /api/orgs/usage — Organization usage stats ───────────────────────────
router.get("/orgs/usage", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const org = await getUserOrg(req.authUser!.id);
    if (!org) { res.status(404).json({ error: "Not in org" }); return; }

    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.tokens_used, u.last_login_at
       FROM org_members om JOIN users u ON u.id=om.user_id
       WHERE om.org_id=$1 ORDER BY u.tokens_used DESC`,
      [org.id]
    );
    const totalTokens = rows.reduce((s: number, r: Record<string, unknown>) => s + (r.tokens_used as number || 0), 0);
    res.json({ members: rows, totalTokens, memberCount: rows.length });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
