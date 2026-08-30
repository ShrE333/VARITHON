# VARITHON / VariMitra — Render Backend Package

This package deploys the backend from:

https://github.com/ShrE333/VARITHON/tree/lav

The original `main.py`, `rag.py`, `requirements.txt`, `heritage.json`, and `cache.json`
are fetched from the `lav` branch during the Render build. This preserves the existing
Groq, Sarvam, RAG, cache, heritage, text, and voice logic.

`render_app.py` wraps that backend with an `X-API-Key` check.

## IMPORTANT: Render deployment source

Render currently deploys web services from:
- GitHub / GitLab / Bitbucket repositories
- a public Git repository
- a prebuilt Docker image

It does not provide a normal "upload ZIP and run it" source option for a Web Service.

So:

1. Extract this ZIP.
2. Create a small GitHub repository, for example `VARITHON-RENDER`.
3. Upload the extracted files to that repository.
4. In Render choose **New -> Web Service** and connect that repository.

## Render configuration

If Render detects `render.yaml`, use the Blueprint configuration.

Manual configuration:

- Runtime: Python
- Build Command: `bash build.sh`
- Start Command: `uvicorn render_app:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/health`

## Required environment variables

In Render -> Environment add:

- `GROQ_API_KEY`
- `SARVAM_API_KEY`
- `VARIMITRA_API_KEY`

Never commit real API keys to GitHub.

Generate your own VariMitra API key locally:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Store the generated value in Render as `VARIMITRA_API_KEY`.

## Test health

After deployment:

```text
GET https://YOUR-SERVICE.onrender.com/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "varimitra-backend",
  "auth": "X-API-Key"
}
```

## Call protected endpoints

Every original backend route except `/`, `/health`, `/docs`, `/redoc`, and `/openapi.json`
requires:

```http
X-API-Key: YOUR_VARIMITRA_API_KEY
```

Example:

```bash
curl -X POST "https://YOUR-SERVICE.onrender.com/YOUR-ENDPOINT" \
  -H "X-API-Key: YOUR_VARIMITRA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

Use the exact request schema shown at:

```text
https://YOUR-SERVICE.onrender.com/docs
```

## WAHA integration

Your WAHA webhook/controller should call the Render backend server-to-server:

```text
WhatsApp -> WAHA -> VARITHON Render API -> Groq/Sarvam/RAG
```

Send the VariMitra key in:

```http
X-API-Key: ...
```

Do not expose this key in browser-side JavaScript.

## Files in this package

- `fetch_source.py` - pulls the current backend files from the `lav` branch during build
- `render_app.py` - API-key security wrapper and health endpoint
- `build.sh` - Render build command
- `render.yaml` - Render Blueprint configuration
- `.env.example` - required environment variable names
- `.gitignore` - prevents secrets and downloaded backend files from being committed
