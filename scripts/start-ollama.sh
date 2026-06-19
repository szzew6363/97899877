#!/usr/bin/env bash
# Auto-start Ollama if binary exists — runs as background service
OLLAMA_BIN="/home/runner/.ollama-bin/ollama"

if [ ! -f "$OLLAMA_BIN" ]; then
  echo "[ollama] Binary not found at $OLLAMA_BIN — skipping auto-start."
  echo "[ollama] Use the Ollama Hub in the app to install."
  exit 0
fi

# Kill stale process
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

echo "[ollama] Starting Ollama server on :11434..."
OLLAMA_MODELS="/home/runner/.ollama/models" \
HOME=/home/runner \
"$OLLAMA_BIN" serve &>/tmp/ollama.log &

for i in $(seq 1 15); do
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "[ollama] ✅ Running on :11434 — $(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | wc -l) models loaded"
    exit 0
  fi
  sleep 1
done

echo "[ollama] ⚠️  Didn't respond in 15s — check /tmp/ollama.log"
