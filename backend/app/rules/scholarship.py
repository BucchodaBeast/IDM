"""Government scholarship pre-check, following the Eswatini Academic Grading and Scholarship Guide:
points from the best six subjects, plus the non-negotiable requirements (five credits, English)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .engine import Rules, default_rules

_DATA = Path(__file__).parent / "data" / "scholarship.json"


@lru_cache(maxsize=1)
def load_scholarship() -> dict:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def calculate(subjects: list[dict], level: str, rules: Rules | None = None) -> dict:
    """subjects: [{"subject": "Mathematics", "grade": "B", "syllabus": "egcse"|"igcse"|"as"}]"""
    cfg = load_scholarship()
    if level not in cfg["thresholds"]:
        raise ValueError(f"level must be one of {sorted(cfg['thresholds'])}")
    rules = rules or default_rules()
    threshold, best_n, req = cfg["thresholds"][level], cfg["best_n"], cfg["requirements"]

    best: dict[str, dict] = {}  # one entry per subject: the highest-scoring sitting
    for row in subjects:
        syllabus = str(row.get("syllabus") or "egcse").lower()
        if syllabus not in cfg["points"]:
            raise ValueError(f"syllabus must be one of {sorted(cfg['points'])}")
        grade = str(row["grade"]).strip().upper()
        entry = {"subject": row["subject"], "grade": grade, "syllabus": syllabus,
                 "points": cfg["points"][syllabus].get(grade, 0)}
        key = rules.subj(row["subject"])
        if key not in best or entry["points"] > best[key]["points"]:
            best[key] = entry

    ranked = sorted(best.values(), key=lambda e: -e["points"])
    counted = ranked[:best_n]
    for e in ranked:
        e["counted"] = e in counted
    total = sum(e["points"] for e in counted)

    credits = sum(1 for e in ranked if rules.at_least(e["grade"], req["credit_min_grade"]))
    english = best.get(rules.subj("English Language"))

    checks = [
        {"id": "points", "label": "Points", "ok": total >= threshold,
         "detail": f"{total} points from your best {len(counted)} subject(s). You need {threshold}."
                   + (f" Add more subjects: the best {best_n} count." if len(ranked) < best_n else "")},
        {"id": "credits", "label": "Five credits", "ok": credits >= req["min_credits"],
         "detail": f"{credits} subject(s) at {req['credit_min_grade']} or better. You need {req['min_credits']}."},
    ]
    if english is None:
        checks.append({"id": "english", "label": "English Language", "ok": False,
                       "detail": "Add English Language. A pass in English is required."})
    elif not rules.at_least(english["grade"], req["english_min_grade"]):
        checks.append({"id": "english", "label": "English Language", "ok": False,
                       "detail": f"English Language is {english['grade']}. A pass ({req['english_min_grade']} or better) is required."})
    else:
        credit = rules.at_least(english["grade"], req["credit_min_grade"])
        checks.append({"id": "english", "label": "English Language", "ok": True,
                       "detail": "English Language is a credit." if credit
                       else "English Language is a pass, but some programmes require a credit (C or better)."})

    if total < threshold:
        status = "short"
    elif all(c["ok"] for c in checks):
        status = "qualifies"
    else:
        status = "requirements_not_met"
    return {
        "status": status, "level": level, "level_label": cfg["level_labels"][level],
        "points": total, "threshold": threshold, "gap": max(0, threshold - total),
        "subjects": ranked, "checks": checks, "reminders": cfg["reminders"], "source": cfg["source"],
    }
