---
name: mr7-ai local model proxy
description: Ollama/LM Studio/Jan access must go through the API server proxy, not direct browser fetch, due to Replit HTTPS/CORS constraints.
---

# Rule
On Replit, the frontend is served over HTTPS. Fetching `http://localhost:11434` directly from the browser fails with a mixed-content / CORS error.

**Fix implemented:**
- New route: `artifacts/api-server/src/routes/local-proxy.ts`
  - `GET /api/local-proxy/ping?endpoint=...` — health check + model list
  - `POST /api/local-proxy/chat` — streams SSE from local model back to browser
- Registered in `artifacts/api-server/src/routes/index.ts`
- `streamLocalChatViaProxy()` in `chat-client.ts` — uses `/api/local-proxy/chat`
- `LocalModelModal.tsx` `runAutoScan` — uses `/api/local-proxy/ping` instead of direct fetch
- ChatView calls `streamLocalChatViaProxy` (not `streamLocalChat`) for local model path

**Security:** Both routes validate that the endpoint hostname is localhost/127.0.0.1/192.168.x/10.x only. Remote endpoints are rejected with 403.

**Why:** Direct browser fetch to localhost HTTP from an HTTPS page is blocked by all modern browsers as mixed content. The server proxy runs on the same host as the user's Ollama/Jan, so it can reach localhost without any CORS or mixed-content restriction.
