#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║        OLLAMA INSTALLER FOR REPLIT — v0.30.10               ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

OLLAMA_DIR="/home/runner/.ollama-bin"
OLLAMA_BIN="$OLLAMA_DIR/ollama"
OLLAMA_VERSION="v0.30.10"
TARBALL_URL="https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-amd64.tar.zst"
MODEL="${1:-}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🧠 Ollama Installer — Replit Edition"
echo "  Version: $OLLAMA_VERSION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "$OLLAMA_BIN" ]; then
  echo "✅ Ollama already installed at $OLLAMA_BIN"
else
  echo "⬇️  Downloading Ollama $OLLAMA_VERSION (tar.zst)..."
  mkdir -p "$OLLAMA_DIR"
  TMP=$(mktemp -d)
  curl -fL "$TARBALL_URL" -o "$TMP/ollama.tar.zst"
  echo "📦 Extracting..."
  cd "$TMP"
  tar --use-compress-program=zstd -xf ollama.tar.zst
  FOUND=$(find "$TMP" -name "ollama" -type f | head -1)
  if [ -z "$FOUND" ]; then
    # try bin/ollama
    FOUND=$(find "$TMP" -name "ollama" | head -1)
  fi
  cp "$FOUND" "$OLLAMA_BIN"
  chmod +x "$OLLAMA_BIN"
  rm -rf "$TMP"
  echo "✅ Ollama installed at $OLLAMA_BIN"
fi

# Kill stale processes
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

echo "🚀 Starting Ollama server..."
OLLAMA_MODELS="/home/runner/.ollama/models" \
HOME=/home/runner \
"$OLLAMA_BIN" serve &>/tmp/ollama.log &

echo "⏳ Waiting for Ollama..."
for i in $(seq 1 20); do
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "🟢 Ollama is running on :11434"
    break
  fi
  sleep 1
done

if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "❌ Ollama failed to start. Log:"
  cat /tmp/ollama.log 2>/dev/null || true
  exit 1
fi

if [ -n "$MODEL" ]; then
  echo ""
  echo "📦 Pulling model: $MODEL"
  "$OLLAMA_BIN" pull "$MODEL"
  echo "✅ Model $MODEL ready!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🎉 Ollama ready!  API: http://localhost:11434"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
