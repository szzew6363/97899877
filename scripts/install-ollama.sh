#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║        OLLAMA INSTALLER FOR REPLIT                          ║
# ║  Downloads & starts Ollama, then pulls the requested model  ║
# ╚══════════════════════════════════════════════════════════════╝

set -euo pipefail

OLLAMA_DIR="/home/runner/.ollama-bin"
OLLAMA_BIN="$OLLAMA_DIR/ollama"
MODEL="${1:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧠 Ollama Installer — Replit Edition"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$OLLAMA_BIN" ]; then
  echo "✅ Ollama already installed at $OLLAMA_BIN"
else
  echo "⬇️  Downloading Ollama Linux AMD64..."
  mkdir -p "$OLLAMA_DIR"
  curl -fsSL https://ollama.com/download/ollama-linux-amd64 -o "$OLLAMA_BIN"
  chmod +x "$OLLAMA_BIN"
  echo "✅ Ollama downloaded successfully"
fi

# Kill any existing ollama process
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

echo "🚀 Starting Ollama server on port 11434..."
OLLAMA_MODELS="/home/runner/.ollama/models" \
HOME=/home/runner \
"$OLLAMA_BIN" serve &>/tmp/ollama.log &

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
for i in $(seq 1 15); do
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "🟢 Ollama is running!"
    break
  fi
  sleep 1
done

if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "❌ Ollama failed to start. Check /tmp/ollama.log"
  cat /tmp/ollama.log 2>/dev/null || true
  exit 1
fi

if [ -n "$MODEL" ]; then
  echo ""
  echo "📦 Pulling model: $MODEL"
  echo "⚠️  Note: Large models need significant disk space and RAM"
  "$OLLAMA_BIN" pull "$MODEL"
  echo "✅ Model $MODEL is ready!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Ollama is ready!"
echo "  API: http://localhost:11434"
echo "  List models: ollama list"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
