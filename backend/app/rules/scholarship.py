"""Scholarship points pre-check. Needs the points scheme in data/scholarship.json."""
from __future__ import annotations

import json
from pathlib import Path

from .engine import Rules, default_rules

_DATA = Path(__file__).parent / "data" / "scholarship.json"


def load_scholarship() -> dict:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def calculate(olevel: dict[str, str], level: str, scheme: dict | None = None,
              thresholds: dict | None = None, rules: Rules | None = None) -> dict:
    cfg = load_scholarship()
    thresholds = thresholds or cfg["thresholds"]
    scheme = scheme if scheme is not None else cfg["scheme"]
    if level not in thresholds:
        raise ValueError(f"level must be one of {sorted(thresholds)}")
    threshold = thresholds[level]
    if not scheme:
        return {"status": "scheme_not_configured", "level": level, "threshold": threshold,
                "message": "The points formula has not been configured yet."}
    rules = rules or default_rules()
    grades = rules.normalise_olevel(olevel)
    points = sorted((scheme["points"].get(g, 0) for g in grades.values()), reverse=True)
    total = sum(points[: scheme["best_n"]])
    return {
        "status": "qualifies" if total >= threshold else "short",
        "level": level,
        "points": total,
        "threshold": threshold,
        "gap": max(0, threshold - total),
    }
