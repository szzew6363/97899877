"""
FastAPI proxy for Ollama on HuggingFace Spaces.
Adds API key authentication and model management.
"""
import os
import httpx
import asyncio
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="KaliGPT Ollama Proxy")
API_KEY = os.environ.get("API_KEY", "")
OLLAMA_URL = "http://localhost:11434"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS_TO_PRELOAD = os.environ.get("PRELOAD_MODELS", "llama3.2:3b").split(",")


def verify_key(request: Request):
    if not API_KEY:
        return True
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth[7:] != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


@app.on_event("startup")
async def startup():
    await asyncio.sleep(5)
    async with httpx.AsyncClient(timeout=300) as client:
        for model in MODELS_TO_PRELOAD:
            model = model.strip()
            if model:
                try:
                    print(f"Pulling model: {model}")
                    await client.post(f"{OLLAMA_URL}/api/pull", json={"name": model})
                    print(f"✅ {model} ready")
                except Exception as e:
                    print(f"⚠️  Failed to pull {model}: {e}")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/tags", dependencies=[Depends(verify_key)])
async def list_models():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{OLLAMA_URL}/api/tags")
        return r.json()


@app.post("/api/chat", dependencies=[Depends(verify_key)])
async def chat(request: Request):
    body = await request.json()
    if body.get("stream", False):
        async def stream_gen():
            async with httpx.AsyncClient(timeout=120) as client:
                async with client.stream("POST", f"{OLLAMA_URL}/api/chat", json=body) as r:
                    async for chunk in r.aiter_bytes():
                        yield chunk
        return StreamingResponse(stream_gen(), media_type="application/x-ndjson")
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{OLLAMA_URL}/api/chat", json=body)
        return r.json()


@app.post("/api/generate", dependencies=[Depends(verify_key)])
async def generate(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(f"{OLLAMA_URL}/api/generate", json=body)
        return r.json()


@app.post("/api/pull", dependencies=[Depends(verify_key)])
async def pull_model(request: Request):
    body = await request.json()
    async def stream_pull():
        async with httpx.AsyncClient(timeout=600) as client:
            async with client.stream("POST", f"{OLLAMA_URL}/api/pull", json=body) as r:
                async for chunk in r.aiter_bytes():
                    yield chunk
    return StreamingResponse(stream_pull(), media_type="application/x-ndjson")


@app.delete("/api/delete", dependencies=[Depends(verify_key)])
async def delete_model(request: Request):
    body = await request.json()
    async with httpx.AsyncClient() as client:
        r = await client.request("DELETE", f"{OLLAMA_URL}/api/delete", json=body)
        return {"ok": r.status_code < 400}


@app.get("/api/ps", dependencies=[Depends(verify_key)])
async def running_models():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{OLLAMA_URL}/api/ps")
        return r.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
