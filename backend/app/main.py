import json
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.documents import verify as dv
from app.documents.extract import ExtractionError, ExtractionUnavailable, extract
from app.chat import router as chat_router
from app.rules import fees, scholarship
from app.rules.engine import default_rules
from app.validation import valid_full_name, valid_national_id

app = FastAPI(title="IDM Application API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(chat_router)


class ApplicantIn(BaseModel):
    olevel: dict[str, str] = Field(default_factory=dict, description="subject -> grade, e.g. {'Mathematics': 'C'}")
    nsc: dict | None = Field(default=None, description="{'admission_level': 'bachelor'|'diploma'|'none', 'subjects_passed': [...]}")
    qualifications: list[str | dict] = Field(default_factory=list, description="e.g. [{'kind': 'diploma', 'field': 'hr'}, 'cips_level_2']")
    work_experience_years: float = 0
    relevant_experience: bool = False
    alevel_passes: int = 0
    intake: str | None = Field(default=None, description="'january' or 'june'")


class ScholarshipIn(BaseModel):
    olevel: dict[str, str]
    level: str = Field(pattern="^(diploma|degree)$")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/programmes")
def programmes():
    return [{k: p[k] for k in ("id", "name", "level", "modes")} for p in default_rules().config["programmes"]]


@app.post("/api/eligibility")
def eligibility(body: ApplicantIn):
    return default_rules().check_all(body.model_dump())


@app.post("/api/scholarship")
def scholarship_check(body: ScholarshipIn):
    return scholarship.calculate(body.olevel, body.level)


@app.get("/api/fees/{programme_id}")
def fee_quote(programme_id: str, mode: str | None = None):
    q = fees.quote(programme_id, mode)
    if q is None:
        raise HTTPException(404, "No fee data for that programme/mode.")
    return q


# ---- document verification -------------------------------------------------
MAX_BYTES = 5 * 1024 * 1024
_hits: dict[str, deque] = defaultdict(deque)
RATE_LIMIT, RATE_WINDOW = 30, 3600  # per client per hour; in-memory, per instance


def _sniff(data: bytes) -> str | None:
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    return None


def _rate_limit(request: Request) -> None:
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    now, q = time.time(), _hits[ip]
    while q and now - q[0] > RATE_WINDOW:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        raise HTTPException(429, "Too many uploads. Try again later.")
    q.append(now)


@app.post("/api/documents/verify")
async def verify_document(
    request: Request,
    doc_type: str = Form(pattern="^(certificates|national_id)$"),
    full_name: str = Form(...),
    national_id: str = Form(""),
    claimed_grades: str = Form("{}"),
    file: UploadFile = File(...),
):
    _rate_limit(request)
    if not valid_full_name(full_name):
        raise HTTPException(422, "Enter your full name before uploading documents.")
    if doc_type == "national_id" and not valid_national_id(national_id):
        raise HTTPException(422, "Enter a valid 13-digit national ID number before uploading your ID.")
    try:
        grades = json.loads(claimed_grades)
        if not isinstance(grades, dict) or len(grades) > 30:
            raise ValueError
        grades = {str(k): str(v) for k, v in grades.items()}
    except ValueError:
        raise HTTPException(422, "claimed_grades must be a JSON object.")

    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File is larger than 5 MB.")
    kind = _sniff(data)
    if kind is None:
        raise HTTPException(415, "Upload a PDF, JPG or PNG file.")

    try:
        extracted = await extract(data, kind, doc_type)
    except ExtractionUnavailable:
        return {"status": "unchecked", "checks": [], "subjects_matched": [],
                "message": "Automatic checking is not switched on yet. Admissions will check this document."}
    except ExtractionError:
        return {"status": "unchecked", "checks": [], "subjects_matched": [],
                "message": "We could not check this file automatically. Admissions will check it by hand."}

    confirmed: list[str] = []
    if doc_type == "national_id":
        checks = dv.verify_national_id(extracted, full_name, national_id)
    else:
        checks, confirmed = dv.verify_certificate(extracted, full_name, grades)
    status, message = dv.summarise(checks)
    return {"status": status, "message": message, "checks": checks, "subjects_matched": confirmed}

