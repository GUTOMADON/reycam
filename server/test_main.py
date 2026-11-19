"""API tests. Run with: python -m pytest server"""
import os
import tempfile

os.environ["REYCAM_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_presets_roundtrip():
    items = [{"id": "1", "name": "Mine", "edit": {"camId": "bolt-classic"}, "created": 1}]
    assert client.put("/api/presets", json=items).json() == {"saved": 1}
    assert client.get("/api/presets").json() == items


def test_presets_reject_invalid():
    bad = [
        {"not": "a list"},
        [{"id": "1"}],
        [{"id": 5, "edit": {}}],
        [{"id": "1", "edit": "nope"}],
        ["text"],
        [{"id": str(i), "edit": {}} for i in range(501)],
    ]
    for body in bad:
        assert client.put("/api/presets", json=body).status_code == 400, body
    r = client.put("/api/presets", content=b"{broken", headers={"content-type": "application/json"})
    assert r.status_code == 400
    r = client.put("/api/presets", content=b"x" * 2_000_001, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_locale_accept_language_variants():
    cases = {
        "pt-BR,pt;q=0.9,en;q=0.8": "pt",
        "pt-PT": "pt",
        "es-MX,es;q=0.9": "es",
        "zh-CN,zh;q=0.9": "zh",
        "zh-TW": "zh",
        "de-AT": "de",
        "hi-IN": "hi",
        "fr-FR,de;q=0.5": "de",
        "en-US": "en",
        "fr-FR,it;q=0.8": "en",
    }
    for header, want in cases.items():
        assert client.get("/api/locale", headers={"accept-language": header}).json()["lang"] == want, header


def test_locale_country_header():
    r = client.get("/api/locale", headers={"accept-language": "fr-FR", "cf-ipcountry": "BR"}).json()
    assert r == {**r, "lang": "pt", "country": "BR", "source": "country"}
    r = client.get("/api/locale", headers={"accept-language": "es-ES", "cf-ipcountry": "BR"}).json()
    assert r["lang"] == "es" and r["country"] == "BR"
    r = client.get("/api/locale", headers={"cf-ipcountry": "XX"}).json()
    assert r["lang"] == "en" and r["country"] is None


def test_quality_order():
    assert main.parse_accept_language("en;q=0.2, de;q=0.9")[0][0] == "de"
