import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.rules import fees, scholarship
from app.rules.engine import default_rules

app = FastAPI(title="IDM Application API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


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
