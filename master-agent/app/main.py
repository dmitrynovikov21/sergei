"""
Master Agent - AI Executive Producer
FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import producer, health

settings = get_settings()

app = FastAPI(
    title="Master Agent",
    description="AI Executive Producer - Autonomous Content Production",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(producer.router, prefix="/producer", tags=["Producer"])


@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    print("🚀 Master Agent starting...")
    print(f"📊 Database: {settings.database_url[:50]}...")
    print(f"🤖 Anthropic API configured: {bool(settings.anthropic_api_key)} ({settings.anthropic_model})")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("👋 Master Agent shutting down...")
