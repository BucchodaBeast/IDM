import asyncio
import json

import httpx
import pymupdf
import pytest
from fastapi.testclient import TestClient

from app import main
from app.documents import extract as ex
from app.documents import verify as dv
from app.validation import normalise_phone, valid_email, valid_full_name, valid_national_id

# ---- validation -------------------------------------------------------------


@pytest.mark.parametrize("raw,expected", [
    ("76368607", "+26876368607"), ("+268 7636 8607", "+26876368607"), ("26876368607", "+26876368607"),
    ("0026876368607", "+26876368607"), ("22505085", "+26822505085"),
    ("6368607", None), ("763686071", None), ("56368607", None), ("+27 76368607", None), ("", None),
])
def test_phone(raw, expected):
    assert normalise_phone(raw) == expected


def test_national_id():
    assert valid_national_id("1234567890123")
    for bad in ["05029393", "12345678901234", "12345678901ab", "", " 1234567890123"]:
        assert not valid_national_id(bad)


def test_name_and_email():
    assert valid_full_name("Sipho Dlamini") and valid_full_name("Nomsa Dlamini-Shongwe") and valid_full_name("Thandi O'Neil")
    assert not valid_full_name("Buccho") and not valid_full_name("Sipho 123") and not valid_full_name("")
    assert valid_email("a@b.co") and not valid_email("a@b") and not valid_email("a b@c.com")


# ---- name matching ----------------------------------------------------------


def test_name_match():
    assert dv.name_match("Sipho Dlamini", "DLAMINI SIPHO") == "match"
    assert dv.name_match("Sipho Themba Dlamini", "Sipho Dlamini") == "match"
    assert dv.name_match("S Dlamini", "Sipho Dlamini") == "match"
    assert dv.name_match("Nomsa Dlamini", "Nomsa Shongwe") == "partial"
    assert dv.name_match("Sipho Dlamini", "Thandi Nkosi") == "mismatch"
    assert dv.name_match("Sipho Dlamini", None) == "mismatch"


# ---- verification rules -----------------------------------------------------

GOOD_CERT = {"is_academic_certificate": True, "legible": True, "candidate_name": "SIPHO DLAMINI",
             "subjects": [{"subject": "English Language", "grade": "B"}, {"subject": "Maths", "grade": "C"}]}


def test_certificate_verified():
    checks, ok = dv.verify_certificate(GOOD_CERT, "Sipho Dlamini", {"English Language": "B", "Mathematics": "C"})
    assert dv.summarise(checks)[0] == "verified" and set(ok) == {"English Language", "Mathematics"}


def test_example_paper_is_rejected():
    paper = {"is_academic_certificate": False, "legible": True, "candidate_name": None, "subjects": []}
    checks, _ = dv.verify_certificate(paper, "Sipho Dlamini", {})
    status, msg = dv.summarise(checks)
    assert status == "rejected" and "does not look like" in msg


def test_grade_mismatch_rejected_and_named():
    checks, _ = dv.verify_certificate(GOOD_CERT, "Sipho Dlamini", {"Mathematics": "A"})
    status, msg = dv.summarise(checks)
    assert status == "rejected" and "you entered A" in msg and "shows C" in msg


def test_other_peoples_certificate_rejected():
    checks, _ = dv.verify_certificate(GOOD_CERT, "Thandi Nkosi", {})
    assert dv.summarise(checks)[0] == "rejected"


def test_blurry_rejected():
    checks, _ = dv.verify_certificate(dict(GOOD_CERT, legible=False), "Sipho Dlamini", {})
    assert dv.summarise(checks)[0] == "rejected"


def test_national_id_checks():
    doc = {"is_eswatini_national_id": True, "legible": True, "full_name": "Sipho Dlamini", "id_number": "1234567890123"}
    assert dv.summarise(dv.verify_national_id(doc, "Sipho Dlamini", "1234567890123"))[0] == "verified"
    assert dv.summarise(dv.verify_national_id(doc, "Sipho Dlamini", "9999999999999"))[0] == "rejected"
    unread = dict(doc, id_number=None)
    assert dv.summarise(dv.verify_national_id(unread, "Sipho Dlamini", "1234567890123"))[0] == "review"


# ---- extraction plumbing (no real model call) -------------------------------


def make_pdf() -> bytes:
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), "Test certificate")
    return doc.tobytes()


def test_render_pages():
    pages = ex.render_pages(make_pdf(), "application/pdf")
    assert pages and pages[0].startswith(b"\x89PNG")
    with pytest.raises(ex.ExtractionError):
        ex.render_pages(b"not a file", "application/pdf")


def test_extract_without_key(monkeypatch):
    monkeypatch.delenv("VISION_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    with pytest.raises(ex.ExtractionUnavailable):
        asyncio.run(ex.extract(make_pdf(), "application/pdf", "certificates"))


def test_extract_parses_model_json(monkeypatch):
    monkeypatch.setenv("VISION_API_KEY", "k")
    seen = {}

    def handler(request: httpx.Request):
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(GOOD_CERT)}}]})

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as c:
            return await ex.extract(make_pdf(), "application/pdf", "certificates", client=c)

    assert asyncio.run(run())["candidate_name"] == "SIPHO DLAMINI"
    assert seen["body"]["messages"][1]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")


# ---- endpoint ---------------------------------------------------------------

client = TestClient(main.app)


def post(data, content=None, name="a.pdf"):
    main._hits.clear()
    return client.post("/api/documents/verify", data=data, files={"file": (name, content or make_pdf(), "application/pdf")})


def test_endpoint_rejects_bad_input():
    base = {"doc_type": "certificates", "full_name": "Sipho Dlamini"}
    assert post(base, b"hello world").status_code == 415
    assert post(dict(base, full_name="Sipho")).status_code == 422
    assert post({"doc_type": "national_id", "full_name": "Sipho Dlamini", "national_id": "0502"}).status_code == 422
    assert post(dict(base, doc_type="passport")).status_code == 422
    assert post(dict(base, claimed_grades="[1]")).status_code == 422


def test_endpoint_unchecked_without_key(monkeypatch):
    monkeypatch.delenv("VISION_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    r = post({"doc_type": "certificates", "full_name": "Sipho Dlamini"})
    assert r.status_code == 200 and r.json()["status"] == "unchecked"


def test_endpoint_end_to_end_with_stub(monkeypatch):
    async def fake(data, kind, doc_type):
        return GOOD_CERT
    monkeypatch.setattr(main, "extract", fake)
    r = post({"doc_type": "certificates", "full_name": "Sipho Dlamini",
              "claimed_grades": json.dumps({"Mathematics": "C"})})
    assert r.json()["status"] == "verified" and r.json()["subjects_matched"] == ["Mathematics"]
    r = post({"doc_type": "certificates", "full_name": "Sipho Dlamini",
              "claimed_grades": json.dumps({"Mathematics": "A"})})
    assert r.json()["status"] == "rejected"


def test_rate_limit(monkeypatch):
    async def fake(data, kind, doc_type):
        return GOOD_CERT
    monkeypatch.setattr(main, "extract", fake)
    main._hits.clear()
    codes = [client.post("/api/documents/verify", data={"doc_type": "certificates", "full_name": "Sipho Dlamini"},
                         files={"file": ("a.pdf", make_pdf(), "application/pdf")}).status_code for _ in range(32)]
    assert codes[:30] == [200] * 30 and codes[30] == 429
