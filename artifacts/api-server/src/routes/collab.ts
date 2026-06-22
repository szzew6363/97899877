import { Router, type Request, type Response } from "express";
import { jwtAuth } from "../middlewares/jwtAuth";
import { WebSocket } from "ws";

/* ─── REST router for collab rooms ──────────────────────────────────────── */
const router = Router();

const restRooms = new Map<string, { id: string; name: string; createdBy: string; createdAt: number }>();

router.get("/collab/rooms", jwtAuth, (_req: Request, res: Response): void => {
  const list = Array.from(restRooms.values());
  res.json({ rooms: list, total: list.length });
});

router.post("/collab/rooms", jwtAuth, (req: Request, res: Response): void => {
  const user = (req as Request & { user?: { id: string; username?: string } }).user;
  const id = Math.random().toString(36).slice(2, 11);
  const room = { id, name: req.body.name ?? `غرفة ${id}`, createdBy: user?.id ?? "anon", createdAt: Date.now() };
  restRooms.set(id, room);
  res.status(201).json(room);
});

router.get("/collab/rooms/:id/messages", jwtAuth, (req: Request, res: Response): void => {
  const msgs = history.get(req.params.id) ?? [];
  res.json({ messages: msgs, total: msgs.length });
});

router.post("/collab/rooms/:id/messages", jwtAuth, (req: Request, res: Response): void => {
  const user = (req as Request & { user?: { id: string; username?: string } }).user;
  const msg: CollabMessage = {
    id: Math.random().toString(36).slice(2, 11),
    userId: user?.id ?? "anon",
    userName: user?.username ?? "مستخدم",
    color: req.body.color ?? "#e21227",
    content: String(req.body.content ?? "").slice(0, 4000),
    timestamp: Date.now(),
    type: "message",
  };
  addHistory(req.params.id, msg);
  broadcastAll(req.params.id, { type: "message", message: msg });
  res.status(201).json(msg);
});

router.post("/collab/rooms/:id/join", jwtAuth, (req: Request, res: Response): void => {
  res.json({ ok: true, roomId: req.params.id });
});

export { router as collabRouter };

/* ─── Types ──────────────────────────────────────────────────────────────── */
type UserId = string;
type RoomId = string;

interface CollabUser {
  id:    UserId;
  name:  string;
  color: string;
  ws:    WebSocket;
  roomId: RoomId;
  typingAt: number;
  joinedAt:  number;
  lastPing:  number;
}

interface CollabMessage {
  id:        string;
  userId:    UserId;
  userName:  string;
  color:     string;
  content:   string;
  timestamp: number;
  type:      "message" | "system";
}

/* ─── State ──────────────────────────────────────────────────────────────── */
const rooms   = new Map<RoomId, Set<UserId>>();
const users   = new Map<UserId, CollabUser>();
const history = new Map<RoomId, CollabMessage[]>();

const MAX_HISTORY = 200;
const TYPING_TTL  = 4_000;
const PING_INTERVAL = 20_000;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function uid(): string {
  return Math.random().toString(36).slice(2, 11);
}

function send(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(roomId: RoomId, data: object, exclude?: UserId): void {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const uid_ of room) {
    if (uid_ === exclude) continue;
    const u = users.get(uid_);
    if (u) send(u.ws, data);
  }
}

function broadcastAll(roomId: RoomId, data: object): void {
  broadcast(roomId, data, undefined);
}

function getRoomUsers(roomId: RoomId): object[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room).map(uid_ => {
    const u = users.get(uid_);
    return u ? { id: u.id, name: u.name, color: u.color, joinedAt: u.joinedAt } : null;
  }).filter(Boolean);
}

function getHistory(roomId: RoomId): CollabMessage[] {
  return history.get(roomId) ?? [];
}

function addHistory(roomId: RoomId, msg: CollabMessage): void {
  let h = history.get(roomId);
  if (!h) { h = []; history.set(roomId, h); }
  h.push(msg);
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
}

/* ─── Typing cleanup interval ────────────────────────────────────────────── */
setInterval(() => {
  const now = Date.now();
  for (const [uid_, user] of users) {
    if (user.typingAt > 0 && now - user.typingAt > TYPING_TTL) {
      user.typingAt = 0;
      broadcast(user.roomId, { type: "typing", userId: uid_, userName: user.name, isTyping: false }, uid_);
    }
  }
}, 1_000);

/* ─── Ping keepalive ─────────────────────────────────────────────────────── */
setInterval(() => {
  const now = Date.now();
  for (const [, user] of users) {
    if (now - user.lastPing > PING_INTERVAL * 2) {
      user.ws.terminate();
    } else {
      send(user.ws, { type: "ping" });
    }
  }
}, PING_INTERVAL);

/* ─── Leave logic ────────────────────────────────────────────────────────── */
function leaveRoom(userId: UserId): void {
  const user = users.get(userId);
  if (!user) return;
  const { roomId, name, color } = user;

  users.delete(userId);
  rooms.get(roomId)?.delete(userId);
  if (rooms.get(roomId)?.size === 0) {
    rooms.delete(roomId);
    // keep history for re-joins
  }

  broadcast(roomId, { type: "left", userId, userName: name, color });
  broadcast(roomId, { type: "users", users: getRoomUsers(roomId) });

  const sysMsg: CollabMessage = {
    id: uid(), userId: "system", userName: "النظام", color: "#555",
    content: `${name} غادر الغرفة`, timestamp: Date.now(), type: "system",
  };
  addHistory(roomId, sysMsg);
  broadcast(roomId, { type: "history_append", message: sysMsg });
}

/* ─── Main connection handler ────────────────────────────────────────────── */
export function handleCollabSocket(ws: WebSocket): void {
  let currentUserId: UserId | null = null;

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    const type = msg.type as string;

    /* ── join ─────────────────────────────────────────────────────────── */
    if (type === "join") {
      const roomId  = (msg.roomId as string) || uid();
      const name    = String(msg.name  || "مستخدم مجهول").slice(0, 32);
      const color   = String(msg.color || "#e21227");

      if (currentUserId) leaveRoom(currentUserId);

      const userId = uid();
      currentUserId = userId;

      const user: CollabUser = { id: userId, name, color, ws, roomId, typingAt: 0, joinedAt: Date.now(), lastPing: Date.now() };
      users.set(userId, user);

      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId)!.add(userId);

      // Confirm join to this user
      send(ws, {
        type:    "joined_ack",
        userId,
        roomId,
        users:   getRoomUsers(roomId),
        history: getHistory(roomId),
      });

      // Notify others
      broadcast(roomId, { type: "joined", userId, userName: name, color }, userId);
      broadcast(roomId, { type: "users", users: getRoomUsers(roomId) });

      // System message
      const sysMsg: CollabMessage = {
        id: uid(), userId: "system", userName: "النظام", color: "#555",
        content: `${name} انضم إلى الغرفة`, timestamp: Date.now(), type: "system",
      };
      addHistory(roomId, sysMsg);
      broadcast(roomId, { type: "history_append", message: sysMsg });
      return;
    }

    if (!currentUserId) { send(ws, { type: "error", message: "انضم إلى غرفة أولاً" }); return; }
    const user = users.get(currentUserId);
    if (!user) return;

    /* ── typing ───────────────────────────────────────────────────────── */
    if (type === "typing") {
      const isTyping = Boolean(msg.isTyping);
      user.typingAt = isTyping ? Date.now() : 0;
      broadcast(user.roomId, { type: "typing", userId: currentUserId, userName: user.name, color: user.color, isTyping }, currentUserId);
      return;
    }

    /* ── message ──────────────────────────────────────────────────────── */
    if (type === "message") {
      const content = String(msg.content || "").slice(0, 4000).trim();
      if (!content) return;
      user.typingAt = 0;
      const chatMsg: CollabMessage = {
        id: uid(), userId: currentUserId, userName: user.name, color: user.color,
        content, timestamp: Date.now(), type: "message",
      };
      addHistory(user.roomId, chatMsg);
      broadcastAll(user.roomId, { type: "message", message: chatMsg });
      return;
    }

    /* ── cursor ───────────────────────────────────────────────────────── */
    if (type === "cursor") {
      broadcast(user.roomId, {
        type: "cursor", userId: currentUserId, color: user.color,
        x: Number(msg.x) || 0, y: Number(msg.y) || 0,
      }, currentUserId);
      return;
    }

    /* ── pong ─────────────────────────────────────────────────────────── */
    if (type === "pong") {
      user.lastPing = Date.now();
      return;
    }

    /* ── leave ────────────────────────────────────────────────────────── */
    if (type === "leave") {
      leaveRoom(currentUserId);
      currentUserId = null;
      return;
    }
  });

  ws.on("close", () => {
    if (currentUserId) leaveRoom(currentUserId);
  });

  ws.on("error", () => {
    if (currentUserId) leaveRoom(currentUserId);
  });
}
