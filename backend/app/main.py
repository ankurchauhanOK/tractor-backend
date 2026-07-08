import logging
import os
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import REDIS_URL
from app.models.database import engine, init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        logging.warning("Database init failed at startup: %s", e)
    yield

app = FastAPI(title="Tractor Inspection OCR System", lifespan=lifespan)

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,https://tractor-inspection-ocr.vercel.app").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import upload, entries, export, speech, batches, analytics

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(entries.router, prefix="/api", tags=["entries"])
app.include_router(export.router, prefix="/api", tags=["export"])
app.include_router(speech.router, prefix="/api", tags=["speech"])
app.include_router(batches.router, prefix="/api", tags=["batches"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])

@app.get("/")
def read_root():
    return {"message": "Tractor Inspection OCR System API"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/ready")
def ready():
    checks = {"database": False, "redis": False}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception as e:
        checks["database_error"] = str(e)

    try:
        from redis import Redis
        r = Redis.from_url(REDIS_URL)
        r.ping()
        r.close()
        checks["redis"] = True
    except Exception as e:
        checks["redis_error"] = str(e)

    all_ok = checks["database"] and checks["redis"]
    status_code = 200 if all_ok else 503
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"status": "ok" if all_ok else "unavailable", **checks},
        status_code=status_code,
    )
