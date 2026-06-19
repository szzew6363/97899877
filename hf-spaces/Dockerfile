FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    nginx \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install fastapi uvicorn requests

WORKDIR /app
COPY proxy.py .
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 7860

CMD ["./start.sh"]
