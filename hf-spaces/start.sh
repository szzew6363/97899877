#!/bin/bash
set -e

echo "🚀 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

echo "⏳ Waiting for Ollama..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "🟢 Ollama ready!"
    break
  fi
  sleep 1
done

echo "🌐 Starting FastAPI proxy on port 7860..."
python3 /app/proxy.py &

wait $OLLAMA_PID
