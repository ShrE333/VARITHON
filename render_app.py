import os
import secrets

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

# The original VARITHON lav main.py is fetched during Render's build.
from main import app


PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


@app.get("/health", include_in_schema=False)
async def render_health():
    return {
        "status": "ok",
        "service": "varimitra-backend",
        "auth": "X-API-Key",
    }


@app.middleware("http")
async def varimitra_api_key_middleware(request: Request, call_next):
    # Allow Render health checks and FastAPI API documentation.
    if request.url.path in PUBLIC_PATHS:
        return await call_next(request)

    expected_key = os.getenv("VARIMITRA_API_KEY", "").strip()

    if not expected_key:
        return JSONResponse(
            status_code=500,
            content={"detail": "VARIMITRA_API_KEY is not configured on the server"},
        )

    supplied_key = request.headers.get("X-API-Key", "").strip()

    if not supplied_key:
        return JSONResponse(
            status_code=401,
            content={"detail": "API key missing. Send it in the X-API-Key header."},
        )

    if not secrets.compare_digest(supplied_key, expected_key):
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid API key"},
        )

    return await call_next(request)
