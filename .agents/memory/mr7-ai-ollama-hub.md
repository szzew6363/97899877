---
name: mr7-ai Ollama Hub
description: OllamaHub3D integration — architecture, Replit install limitations, HF Spaces deployment
---

## What was built

- `artifacts/mr7-ai/src/components/OllamaHub3D.tsx` — 838-line Three.js 3D model management UI
  - Orbital rings + node particles canvas (Three.js)
  - 4 tabs: Installed / Library / Chat / HF Spaces
  - Pull progress, live chat with any local model, parallel model selector
- `artifacts/api-server/src/routes/ollama.ts` — Full Ollama REST proxy
  - Endpoints: GET /api/ollama/status, /models, /ps, /show/:model, POST /ollama/pull (SSE), /delete, /chat, /generate, /start, /install (SSE)
  - Registered in routes/index.ts
- Integrated in App.tsx (`ollamaHub` modal ID, lazy import) and TopBar.tsx (`onOpenOllamaHub` prop, purple HUDBtn)
- HF Spaces deployment files in `hf-spaces/`: Dockerfile, README.md, proxy.py (FastAPI auth proxy), start.sh, nginx.conf
- `scripts/start-ollama.sh` — auto-start script if binary exists at /home/runner/.ollama-bin/ollama
- `scripts/install-ollama.sh` — full install script with correct tar.zst extraction

## Replit binary install limitation

**Why:** Ollama v0.30.10 tarball is 1.3GB (tar.zst). It includes CUDA v12/v13 libraries that together exceed the Replit container disk quota. Even stream-extracting just `bin/ollama` times out at the bash 120s limit due to network speed.

**How to apply:** Do not attempt to install Ollama binary as part of the app startup on Replit. The `/api/ollama/install` SSE endpoint handles it at user request. The real solution is HF Spaces.

## HF Spaces deployment (recommended)

1. Create a new HF Space with Docker SDK and T4 GPU
2. Upload files from `hf-spaces/` folder
3. Set `API_KEY` secret in Space settings
4. Enter the Space URL in OllamaHub3D "HF Spaces" tab → Connect button

## Remote Ollama connection

Any remote Ollama instance can be used: enter its URL in the HF Spaces tab. The API proxy in `ollama.ts` forwards requests to `OLLAMA_BASE_URL` (default: http://localhost:11434).
