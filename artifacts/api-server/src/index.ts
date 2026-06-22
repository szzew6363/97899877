import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { handleTerminalSocket } from "./routes/shell.js";
import { registerCisaWsClient } from "./routes/cisa.js";
import { handleCollabSocket } from "./routes/collab.js";
import { startWeeklyReportScheduler } from "./lib/weekly-report.js";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

const server = createServer(app);

const wss       = new WebSocketServer({ noServer: true });
const cisaWss   = new WebSocketServer({ noServer: true });
const collabWss = new WebSocketServer({ noServer: true });

wss.on("connection", handleTerminalSocket);

cisaWss.on("connection", (ws) => {
  registerCisaWsClient(ws);
});

collabWss.on("connection", (ws) => {
  handleCollabSocket(ws);
});

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "";
  if (url.startsWith("/api/terminal")) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/cisa-live")) {
    cisaWss.handleUpgrade(req, socket, head, (ws) => {
      cisaWss.emit("connection", ws, req);
    });
  } else if (url.startsWith("/api/collab")) {
    collabWss.handleUpgrade(req, socket, head, (ws) => {
      collabWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, (err?: Error) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");

  // Start weekly security report scheduler (runs every Monday 08:00 UTC)
  startWeeklyReportScheduler();
});
