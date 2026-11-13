import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1 import accounts, auth, dashboard, portfolio, transactions, goals, balance_sheet, planner, manual_holdings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="Financial OS API",
    description="Personal Financial Operating System — Backend API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth.router,           prefix=API_PREFIX)
app.include_router(accounts.router,       prefix=API_PREFIX)
app.include_router(dashboard.router,      prefix=API_PREFIX)
app.include_router(portfolio.router,      prefix=API_PREFIX)
app.include_router(transactions.router,   prefix=API_PREFIX)
app.include_router(goals.router,          prefix=API_PREFIX)
app.include_router(balance_sheet.router,  prefix=API_PREFIX)
app.include_router(planner.router,         prefix=API_PREFIX)
app.include_router(manual_holdings.router, prefix=API_PREFIX)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "app": settings.app_name}


@app.get("/", tags=["System"])
async def root():
    return {"app": settings.app_name, "version": "1.0.0", "docs": "/docs"}
