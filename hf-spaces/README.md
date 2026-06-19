---
title: KaliGPT Ollama Server
emoji: 🧠
colorFrom: red
colorTo: purple
sdk: docker
pinned: true
license: mit
---

# KaliGPT Ollama Server on Hugging Face Spaces

This Space runs Ollama with GPU acceleration on Hugging Face infrastructure, providing a 24/7 API endpoint for local LLMs.

## Setup

1. Fork this Space on Hugging Face
2. Enable GPU in Space Settings (T4 GPU recommended)
3. Set the following secrets in Space Settings:
   - `API_KEY` — your secret key to protect the API
4. Copy your Space URL and enter it in your KaliGPT settings

## Supported Models

- `llama3.2:3b` — Fast, 2GB
- `qwen2.5:7b` — Balanced, 4GB
- `mistral:7b` — Powerful, 4GB
- `deepseek-r1:7b` — Reasoning, 4GB
- `phi3:mini` — Ultra-fast, 2GB
- `gemma2:2b` — Google, 1.6GB

## API Usage from your phone

```bash
# List models
curl https://YOUR-SPACE.hf.space/api/tags \
  -H "Authorization: Bearer YOUR_API_KEY"

# Chat
curl https://YOUR-SPACE.hf.space/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"llama3.2:3b","messages":[{"role":"user","content":"Hello!"}]}'
```
