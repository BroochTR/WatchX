import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError
from fastapi.responses import JSONResponse

from database import Base, engine

from routers import (
    auth,
    cameras,
    events,
    settings,
    users,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger("watchx")

app = FastAPI(
    title="WatchX API",
    version="0.1.0"
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cameras.router)
app.include_router(events.router)
app.include_router(settings.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {
        "name": "WatchX",
        "status": "online"
    }

@app.get("/health")
async def health():
    return {
        "status": "ok"
    }

@app.exception_handler(OperationalError)
async def db_error_handler(_, exc):
    logger.error(f"Database error: {exc}")

    return JSONResponse(
        status_code=503,
        content={
            "status": "error",
            "message": "database unavailable"
        }
    )