"""
IDM Eswatini Application Portal & Scholarship System
Government Scholarship Rules Engine

This module implements the official Government of Eswatini scholarship
scoring rules:

  1. Total points are calculated from the BEST 6 subjects.
  2. Diploma-level scholarship requires a minimum of 27 points.
  3. Degree-level scholarship requires a minimum of 30 points.
  4. A mandatory minimum of 5 credit passes (Grade C or higher) is required
     for any government scholarship award.

The engine is exposed as FastAPI route handlers so it can be consumed by
the Next.js frontend via HTTP.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, validator

from fastapi import APIRouter, HTTPException


# ─────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────────────────────

BEST_SUBJECTS_COUNT: int = 6
"""Number of best subjects used in the scholarship points calculation."""

DIPLOMA_CUTOFF_POINTS: int = 27
"""Minimum total points required for a Diploma-level government scholarship."""

DEGREE_CUTOFF_POINTS: int = 30
"""Minimum total points required for a Degree-level government scholarship."""

MINIMUM_CREDIT_PASSES: int = 5
"""Minimum number of credit passes (Grade C or higher) required."""

# Grade-to-points mapping per qualification level.
# EGCSE / IGCSE share the standard 8-point scale.
# AS Level uses an extended 10-point scale (A* = 10 … E = 5).
GRADE_POINTS_MAP: dict[str, dict[str, int]] = {
    "EGCSE": {
        "A*": 8,
        "A": 7,
        "B": 6,
        "C": 5,
        "D": 4,
        "E": 3,
        "F": 2,
        "G": 1,
        "U": 0,
    },
    "IGCSE": {
        "A*": 8,
        "A": 7,
        "B": 6,
        "C": 5,
        "D": 4,
        "E": 3,
        "F": 2,
        "G": 1,
        "U": 0,
    },
    "AS_LEVEL": {
        "A*": 10,
        "A": 9,
        "B": 8,
        "C": 7,
        "D": 6,
        "E": 5,
        "F": 0,
        "G": 0,
        "U": 0,
    },
}

# Grades that count as a credit pass (Grade C or higher).
CREDIT_GRADES: set[str] = {"A*", "A", "B", "C"}


# ─────────────────────────────────────────────────────────────────────────────
# ENUMS & PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────

class QualificationLevel(str, Enum):
    EGCSE = "EGCSE"
    IGCSE = "IGCSE"
    AS_LEVEL = "AS_LEVEL"


class ScholarshipAward(str, Enum):
    NONE = "NONE"
    DIPLOMA = "DIPLOMA"
    DEGREE = "DEGREE"


class SubjectResult(BaseModel):
    """A single subject result submitted by the student."""

    subject_id: str = Field(..., description="Unique subject identifier")
    subject_name: str = Field(..., description="Human-readable subject name")
    level: QualificationLevel = Field(..., description="Qualification level")
    grade: str = Field(..., description="Grade achieved (A* – U)")

    @validator("grade")
    def grade_must_be_valid(cls, v: str, values) -> str:
        level = values.get("level", QualificationLevel.EGCSE)
        valid_grades = GRADE_POINTS_MAP.get(level.value, {})
        if v not in valid_grades:
            raise ValueError(
                f"Grade '{v}' is not valid for level '{level.value}'. "
                f"Valid grades: {sorted(valid_grades.keys())}"
            )
        return v


class ScholarshipRequest(BaseModel):
    """Payload for the scholarship evaluation endpoint."""

    student_id: Optional[str] = Field(None, description="Internal student identifier")
    results: List[SubjectResult] = Field(
        ...,
        min_items=1,
        description="List of subject results (at least 1 required)",
    )


class SubjectScore(BaseModel):
    """Scoring detail for a single subject."""

    subject_id: str
    subject_name: str
    level: QualificationLevel
    grade: str
    points: int
    is_credit: bool
    counted_in_best_six: bool


class ScholarshipResponse(BaseModel):
    """Full scholarship evaluation result."""

    total_points: int = Field(..., description="Sum of points from best 6 subjects")
    best_subjects_count: int = Field(..., description="Number of subjects counted (max 6)")
    credit_passes: int = Field(..., description="Number of credit passes (Grade C or higher)")
    meets_credit_requirement: bool = Field(
        ..., description="True if credit_passes >= MINIMUM_CREDIT_PASSES"
    )
    qualifies_diploma: bool = Field(..., description="True if total >= DIPLOMA_CUTOFF_POINTS")
    qualifies_degree: bool = Field(..., description="True if total >= DEGREE_CUTOFF_POINTS")
    award: ScholarshipAward = Field(..., description="Highest scholarship award earned")
    subject_scores: List[SubjectScore] = Field(..., description="Per-subject scoring breakdown")


# ─────────────────────────────────────────────────────────────────────────────
# CORE RULES ENGINE
# ─────────────────────────────────────────────────────────────────────────────

def _grade_points(level: QualificationLevel, grade: str) -> int:
    """Return the point value for a grade at a given qualification level."""
    return GRADE_POINTS_MAP.get(level.value, {}).get(grade, 0)


def _is_credit_pass(grade: str) -> bool:
    """Return True if the grade counts as a credit pass (Grade C or higher)."""
    return grade in CREDIT_GRADES


def evaluate_scholarship(results: List[SubjectResult]) -> ScholarshipResponse:
    """
    Evaluate a list of subject results against the Government of Eswatini
    scholarship rules.

    Rules applied (in order):
      1. Each subject is assigned points based on its grade and level.
      2. The BEST 6 subjects (highest points first) are selected.
      3. Total points = sum of points from the best 6 subjects.
      4. Credit passes = number of subjects with Grade C or higher
         (across ALL submitted subjects, not just the best 6).
      5. Award determination:
           - Degree  : total >= 30 AND credit_passes >= 5
           - Diploma : total >= 27 AND credit_passes >= 5
           - None    : otherwise
    """

    if not results:
        raise ValueError("At least one subject result is required.")

    # ── Step 1: Score every subject ──────────────────────────────────────────
    scored: List[SubjectScore] = []
    for r in results:
        pts = _grade_points(r.level, r.grade)
        scored.append(
            SubjectScore(
                subject_id=r.subject_id,
                subject_name=r.subject_name,
                level=r.level,
                grade=r.grade,
                points=pts,
                is_credit=_is_credit_pass(r.grade),
                counted_in_best_six=False,  # updated below
            )
        )

    # ── Step 2: Identify the best 6 subjects by points ───────────────────────
    # Sort a copy by points descending (stable sort preserves original order
    # for ties).
    sorted_by_points = sorted(scored, key=lambda s: s.points, reverse=True)
    best = sorted_by_points[:BEST_SUBJECTS_COUNT]
    best_ids = {id(s) for s in best}

    # Mark which subjects made the cut.
    for s in scored:
        if id(s) in best_ids:
            s.counted_in_best_six = True

    # ── Step 3: Totals ───────────────────────────────────────────────────────
    total_points = sum(s.points for s in best)
    credit_passes = sum(1 for s in scored if s.is_credit)
    meets_credit_requirement = credit_passes >= MINIMUM_CREDIT_PASSES

    # ── Step 4: Award determination ──────────────────────────────────────────
    qualifies_degree = (
        total_points >= DEGREE_CUTOFF_POINTS and meets_credit_requirement
    )
    qualifies_diploma = (
        total_points >= DIPLOMA_CUTOFF_POINTS and meets_credit_requirement
    )

    if qualifies_degree:
        award = ScholarshipAward.DEGREE
    elif qualifies_diploma:
        award = ScholarshipAward.DIPLOMA
    else:
        award = ScholarshipAward.NONE

    return ScholarshipResponse(
        total_points=total_points,
        best_subjects_count=len(best),
        credit_passes=credit_passes,
        meets_credit_requirement=meets_credit_requirement,
        qualifies_diploma=qualifies_diploma,
        qualifies_degree=qualifies_degree,
        award=award,
        subject_scores=scored,
    )


# ─────────────────────────────────────────────────────────────────────────────
# FASTAPI ROUTER
# ─────────────────────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/api/v1/scholarship",
    tags=["scholarship"],
    responses={404: {"description": "Not found"}},
)


@router.post("/evaluate", response_model=ScholarshipResponse)
async def evaluate_scholarship_endpoint(payload: ScholarshipRequest) -> ScholarshipResponse:
    """
    Evaluate a student's subject results and return the scholarship outcome.

    Request body example::

        {
          "student_id": "STU-2026-0001",
          "results": [
            {"subject_id": "english-language", "subject_name": "English Language",
             "level": "EGCSE", "grade": "A"},
            {"subject_id": "mathematics", "subject_name": "Mathematics",
             "level": "EGCSE", "grade": "B"},
            ...
          ]
        }
    """
    try:
        return evaluate_scholarship(payload.results)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.get("/rules")
async def get_scholarship_rules() -> dict:
    """
    Return the current scholarship rules and constants so the frontend
    can display them to students.
    """
    return {
        "best_subjects_count": BEST_SUBJECTS_COUNT,
        "diploma_cutoff_points": DIPLOMA_CUTOFF_POINTS,
        "degree_cutoff_points": DEGREE_CUTOFF_POINTS,
        "minimum_credit_passes": MINIMUM_CREDIT_PASSES,
        "credit_grades": sorted(CREDIT_GRADES),
        "grade_points_map": GRADE_POINTS_MAP,
    }
