"""ReyCam server.

Serves the built web app, a small presets API and a locale hint. All photo
and video processing happens on the user's device, so originals never leave it.
"""
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent
DIST = Path(os.environ.get("REYCAM_DIST", ROOT.parent / "web" / "dist"))
DB_PATH = Path(os.environ.get("REYCAM_DB", ROOT / "reycam.db"))
MAX_PRESETS = 500
MAX_BODY_BYTES = 2_000_000

# Languages with a full translation in the web app. Anything else falls back to English.
SUPPORTED = ("en", "pt", "es", "zh", "hi", "de")
ALIASES = {"iw": "he", "in": "id", "ji": "yi", "nb": "no", "nn": "no", "cmn": "zh", "yue": "zh"}

# Country hint (ISO 3166 alpha 2) to language, used only when Accept-Language has no match.
COUNTRY_LANG = {
    **{c: "pt" for c in ("BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL")},
    **{c: "es" for c in ("ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ")},
    **{c: "zh" for c in ("CN", "TW", "HK", "MO", "SG")},
    "IN": "hi",
    **{c: "de" for c in ("DE", "AT", "CH", "LI", "LU")},
}

# Headers set by common hosts and CDNs with the visitor country.
COUNTRY_HEADERS = ("cf-ipcountry", "x-vercel-ip-country", "cloudfront-viewer-country", "x-appengine-country", "fastly-geo-country-code", "x-country-code")

app = FastAPI(title="ReyCam API", version="1.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "PUT"], allow_headers=["*"])


def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
    return conn


def base_code(tag: str) -> str:
    base = tag.strip().lower().replace("_", "-").split("-")[0]
    return ALIASES.get(base, base)


def parse_accept_language(header: Optional[str]) -> List[Tuple[str, float]]:
    """Return (tag, quality) pairs sorted by quality, highest first."""
    out: List[Tuple[str, float]] = []
    for i, part in enumerate((header or "").split(",")):
        part = part.strip()
        if not part:
            continue
        tag, _, params = part.partition(";")
        q = 1.0
        m = re.search(r"q=([0-9.]+)", params)
        if m:
            try:
                q = float(m.group(1))
            except ValueError:
                q = 0.0
        if tag.strip() and tag.strip() != "*" and q > 0:
            out.append((tag.strip(), q - i * 1e-6))
    return sorted(out, key=lambda x: -x[1])


def country_of(request: Request) -> Optional[str]:
    for h in COUNTRY_HEADERS:
        v = (request.headers.get(h) or "").strip().upper()
        if re.fullmatch(r"[A-Z]{2}", v) and v not in ("XX", "T1"):
            return v
    return None


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "app": "ReyCam"}


@app.get("/api/locale")
def locale(request: Request) -> dict:
    """Suggest a UI language from Accept-Language and an optional CDN country header."""
    country = country_of(request)
    for tag, _ in parse_accept_language(request.headers.get("accept-language")):
        code = base_code(tag)
        if code in SUPPORTED:
            return {"lang": code, "country": country, "source": "accept-language", "supported": list(SUPPORTED)}
    if country and country in COUNTRY_LANG:
        return {"lang": COUNTRY_LANG[country], "country": country, "source": "country", "supported": list(SUPPORTED)}
    return {"lang": "en", "country": country, "source": "default", "supported": list(SUPPORTED)}


@app.get("/api/presets")
def get_presets() -> List[Any]:
    with db() as conn:
        row = conn.execute("SELECT v FROM kv WHERE k = 'presets'").fetchone()
    return json.loads(row[0]) if row else []


@app.put("/api/presets")
async def put_presets(request: Request) -> JSONResponse:
    raw = await request.body()
    if len(raw) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="Payload too large")
    try:
        body = json.loads(raw or b"null")
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Body must be JSON")
    if not isinstance(body, list) or len(body) > MAX_PRESETS:
        raise HTTPException(status_code=400, detail="Expected a list of presets")
    for item in body:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("id"), str)
            or not isinstance(item.get("name", ""), str)
            or not isinstance(item.get("edit"), dict)
        ):
            raise HTTPException(status_code=400, detail="Invalid preset")
    with db() as conn:
        conn.execute("INSERT OR REPLACE INTO kv (k, v) VALUES ('presets', ?)", (json.dumps(body),))
    return JSONResponse({"saved": len(body)})


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/api/{rest:path}")
    def api_not_found(rest: str):
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/{path:path}")
    def spa(path: str):
        target = (DIST / path).resolve()
        if path and target.is_file() and DIST.resolve() in target.parents:
            headers = {"Cache-Control": "no-cache"} if path in ("sw.js", "manifest.webmanifest") else None
            return FileResponse(target, headers=headers)
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
