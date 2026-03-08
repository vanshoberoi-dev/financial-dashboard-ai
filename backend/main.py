import os
import time
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from database import engine, Base
from routers import advisor, mutual_funds, stocks, insurance, tax

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("finance_dashboard")

# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all database tables on startup."""
    logger.info("Starting up 
def Indian Finance Dashboard API 
def â¦")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created / verified successfully.")
    except SQLAlchemyError as exc:
        logger.error("Failed to initialise database tables: %s", exc)
        raise

    yield  # application runs here

    logger.info("Shutting down Indian Finance Dashboard API â¦")

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Indian Personal Finance Dashboard API",
    description=(
        "A comprehensive backend for managing personal finances in India. "
        "Covers mutual funds, stocks, insurance, tax planning, and AI-powered "
        "financial advice 
def tailored to Indian markets (INR)."
    ),
    version="1.0.0",
    contact={
        "name": "Finance Dashboard Support",
        "email": "support@financedashboard.in",
    },
    license_info={
        "name": "MIT",
    },
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
allowed_origins: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

extra_origins = os.getenv("EXTRA_CORS_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log every incoming request and its processing time."""
    start = time.perf_counter()
    logger.info(
        "Incoming  %s %s  | client=%s",
        request.method,
        request.url.path,
        request.client.host if request.client else "unknown",
    )

    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001
        elapsed = (time.perf_counter() - start) * 1000
        logger.error(
            "Unhandled exception during %s %s after %.2f ms: %s",
            request.method,
            request.url.path,
            elapsed,
            exc,
        )
        raise

    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "Completed %s %s  | status=%s | %.2f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    response.headers["X-Process-Time-Ms"] = f"{elapsed:.2f}"
    return response

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "HTTPException %s on %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail,
            "path": str(request.url.path),
        },
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(
        "Database error on %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "message": "A database error occurred. Please try again later.",
            "path": str(request.url.path),
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "Unexpected error on %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "message": "An unexpected internal server error occurred.",
            "path": str(request.url.path),
        },
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(
    advisor.router,
    prefix="/api/v1/advisor",
    tags=["AI Financial Advisor"],
)
app.include_router(
    mutual_funds.router,
    prefix="/api/v1/mutual-funds",
    tags=["Mutual Funds"],
)
app.include_router(
    stocks.router,
    prefix="/api/v1/stocks",
    tags=["Stocks & Equities"],
)
app.include_router(
    insurance.router,
    prefix="/api/v1/insurance",
    tags=["Insurance"],
)
app.include_router(
    tax.router,
    prefix="/api/v1/tax",
    tags=["Tax Planning"],
)

# ---------------------------------------------------------------------------
# Root & health endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["Root"], summary="API information")
async def root():
    """
    Returns basic metadata about the Indian Finance Dashboard API.
    All monetary values throughout the API are expressed in **Indian Rupees (INR 
def â¹)**.
    """
    return {
        "name": "Indian Personal Finance Dashboard API",
        "version": "1.0.0",
        "description": (
            "Comprehensive personal finance management for Indian investors. "
            "Supports mutual funds, equities, insurance, tax planning, and "
            "AI-driven advisory services."
        ),
        "currency": "INR (â¹)",
        "documentation": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "endpoints": {
            "advisor": "/api/v1/advisor",
            "mutual_funds": "/api/v1/mutual-funds",
            "stocks": "/api/v1/stocks",
            "insurance": "/api/v1/insurance",
            "tax": "/api/v1/tax",
        },
    }


@app.get("/health", tags=["Health"], summary="Health check")
async def health_check():
    """
    Performs a lightweight liveness / readiness check.

    * Verifies the database connection is reachable.
    * Returns HTTP 200 when healthy, HTTP 503 when the database is unavailable.
    """
    db_status = "ok"
    db_message = "Database connection is healthy."

    try:
        with engine.connect() as connection:
            connection.execute(__import__("sqlalchemy").text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Health check â database unreachable: %s", exc)
        db_status = "error"
        db_message = "Database connection failed."

    overall_status = "healthy" if db_status == "ok" else "unhealthy"
    http_status_code = 200 if db_status == "ok" else 503

    response_body = {
        "status": overall_status,
        "api_version": "1.0.0",
        "checks": {
            "database": {
                "status": db_status,
                "message": db_message,
            },
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    if http_status_code != 200:
        return JSONResponse(status_code=http_status_code, content=response_body)

    return response_body
