FROM python:3.13-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Production image ───────────────────────────────────────────
FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

RUN mkdir -p /app/storage /app/uploads && \
    adduser --disabled-password --gecos "" appuser && \
    chown -R appuser:appuser /app/storage /app/uploads

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOAD_DIR=/app/uploads \
    STORAGE_DIR=/app/storage

EXPOSE 8000

USER appuser

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["api"]
