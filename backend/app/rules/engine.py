"""Deterministic admission-rules engine. No LLM is involved in any decision."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"

ELIGIBLE, REVIEW, NOT_ELIGIBLE = "eligible", "review", "not_eligible"
_RANK = {NOT_ELIGIBLE: 0, REVIEW: 1, ELIGIBLE: 2}
_ADMISSION = {"none": 0, "diploma": 1, "bachelor": 2}
_LEVEL_ORDER = {"degree": 0, "diploma": 1, "professional": 2}


def _worst(a: str, b: str) -> str:
    return a if _RANK[a] <= _RANK[b] else b


@lru_cache(maxsize=1)
def load_config() -> dict[str, Any]:
    return json.loads((DATA_DIR / "programmes.json").read_text(encoding="utf-8"))


class Rules:
    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or load_config()
        g = self.config["grading"]
        self.scale: list[str] = g["scale"]
        self.pass_min: str = g["pass_min"]
        self.credit_min: str = g["credit_min"]
        self.aliases: dict[str, str] = self.config["subject_aliases"]

    # ---- normalisation -------------------------------------------------
    def subj(self, name: str) -> str:
        key = " ".join(str(name).lower().split())
        if key in self.aliases:
            return self.aliases[key]
        key = key.replace("&", "and")
        return self.aliases.get(key, key)

    def _rank(self, grade: str) -> int:
        g = str(grade).strip().upper()
        return self.scale.index(g) if g in self.scale else len(self.scale)

    def at_least(self, grade: str, floor: str) -> bool:
        return self._rank(grade) <= self._rank(floor)

    def normalise_olevel(self, olevel: dict[str, str] | None) -> dict[str, str]:
        out: dict[str, str] = {}
        for subject, grade in (olevel or {}).items():
            s = self.subj(subject)
            if s not in out or self._rank(grade) < self._rank(out[s]):
                out[s] = str(grade).strip().upper()
        return out

    # ---- route checks: each returns (status, reasons, provided) --------
    def check_olevel(self, req: dict, olevel: dict[str, str] | None):
        grades = self.normalise_olevel(olevel)
        if not grades:
            return NOT_ELIGIBLE, ["No O-Level/IGCSE/EGCSE results provided."], False
        passes = {s for s, g in grades.items() if self.at_least(g, self.pass_min)}
        credits = {s for s, g in grades.items() if self.at_least(g, self.credit_min)}
        reasons: list[str] = []
        if len(passes) < req.get("min_passes", 0):
            reasons.append(f"Need at least {req['min_passes']} passes; you have {len(passes)}.")
        if len(credits) < req.get("min_credits", 0):
            reasons.append(
                f"Need at least {req['min_credits']} subjects at {self.credit_min} or better; you have {len(credits)}."
            )
        for s in req.get("must_credit", []):
            if self.subj(s) not in credits:
                reasons.append(f"Need {self.credit_min} or better in {s}.")
        for s in req.get("must_pass", []):
            if self.subj(s) not in passes:
                reasons.append(f"Need a pass in {s}.")
        for s, floor in req.get("grade_floors", {}).items():
            g = grades.get(self.subj(s))
            if g is None or not self.at_least(g, floor):
                reasons.append(f"Need at least grade {floor} in {s}.")
        for grp in req.get("any_of", []):
            floor = grp.get("min_grade", self.pass_min)
            have = [x for x in grp["subjects"] if self.subj(x) in grades and self.at_least(grades[self.subj(x)], floor)]
            if len(have) < grp["count"]:
                reasons.append(
                    f"Need {grp['count']} of these at {floor} or better: {', '.join(grp['subjects'])} (you have {len(have)})."
                )
        return (ELIGIBLE if not reasons else NOT_ELIGIBLE), reasons, True

    def _subject_set_reasons(self, req: dict, passed: set[str]) -> list[str]:
        reasons = []
        for s in req.get("must_pass", []):
            if self.subj(s) not in passed:
                reasons.append(f"Need a pass in {s}.")
        for grp in req.get("any_of", []):
            subs = {self.subj(x) for x in grp["subjects"]}
            have = len(subs & passed)
            if have < grp["count"]:
                reasons.append(f"Need passes in {grp['count']} of: {', '.join(grp['subjects'])} (you have {have}).")
        return reasons

    def check_nsc(self, req: dict, nsc: dict | None):
        if not nsc:
            return NOT_ELIGIBLE, ["No NSC/ISC/Matriculation results provided."], False
        level = str(nsc.get("admission_level") or "none").lower()
        need = req.get("admission_level", "none")
        reasons: list[str] = []
        if _ADMISSION.get(level, 0) < _ADMISSION[need]:
            reasons.append(f"Need a {need}-level admission recommendation.")
        passed = {self.subj(s) for s in nsc.get("subjects_passed", [])}
        if len(passed) < req.get("min_passes", 0):
            reasons.append(f"Need at least {req['min_passes']} passes; you have {len(passed)}.")
        reasons += self._subject_set_reasons(req, passed)
        if "one_of" in req:
            alts = [self._subject_set_reasons(a, passed) for a in req["one_of"]]
            if all(alts):
                reasons.append("Need either: " + " OR ".join(" ".join(a) for a in alts))
        return (ELIGIBLE if not reasons else NOT_ELIGIBLE), reasons, True

    @staticmethod
    def _describe(accept: dict) -> str:
        label = accept["kind"].replace("_", " ")
        field = accept.get("field")
        if field == "relevant":
            return f"{label} (relevant to the programme)"
        return f"{label} ({field})" if field else label

    def check_qualification(self, req: dict, quals: list | None):
        items = [q if isinstance(q, dict) else {"kind": q} for q in (quals or [])]
        if not items:
            return NOT_ELIGIBLE, ["No prior qualifications provided."], False
        needs_review = False
        for acc in req["accepts"]:
            have = [q for q in items if q.get("kind") == acc["kind"]]
            if not have:
                continue
            field = acc.get("field")
            if field is None:
                return ELIGIBLE, [], True
            if field == "relevant":
                needs_review = True
            elif any(self.subj(q.get("field", "")) == self.subj(field) for q in have):
                return ELIGIBLE, [], True
        if needs_review:
            return REVIEW, ["Admissions will confirm that your qualification is relevant."], True
        wanted = " or ".join(self._describe(a) for a in req["accepts"])
        return NOT_ELIGIBLE, [f"Need: {wanted}."], True

    @staticmethod
    def check_experience(req: dict, applicant: dict):
        years = float(applicant.get("work_experience_years") or 0)
        relevant = bool(applicant.get("relevant_experience"))
        provided = years > 0 or relevant
        reasons = []
        if years < req.get("min_years", 0):
            reasons.append(f"Need at least {req['min_years']} years of work experience.")
        if req.get("relevant") and not relevant:
            reasons.append("Need relevant working experience.")
        return (ELIGIBLE if not reasons else NOT_ELIGIBLE), reasons, provided

    @staticmethod
    def check_alevel(req: dict, applicant: dict):
        n = int(applicant.get("alevel_passes") or 0)
        if n < req["min_passes"]:
            return NOT_ELIGIBLE, [f"Need {req['min_passes']} Advanced Level passes (or equivalent)."], n > 0
        return ELIGIBLE, [], True

    # ---- orchestration -------------------------------------------------
    def evaluate_route(self, route: dict, applicant: dict) -> dict[str, Any]:
        t = route["type"]
        if t == "olevel":
            status, reasons, provided = self.check_olevel(route, applicant.get("olevel"))
        elif t == "nsc":
            status, reasons, provided = self.check_nsc(route, applicant.get("nsc"))
        elif t == "qualification":
            status, reasons, provided = self.check_qualification(route, applicant.get("qualifications"))
        elif t == "experience":
            status, reasons, provided = self.check_experience(route, applicant)
        elif t == "alevel":
            status, reasons, provided = self.check_alevel(route, applicant)
        elif t == "open":
            status, reasons, provided = ELIGIBLE, [], True
        else:
            raise ValueError(f"Unknown route type: {t}")
        if "also_requires_experience" in route:
            s2, r2, _ = self.check_experience(route["also_requires_experience"], applicant)
            status, reasons = _worst(status, s2), reasons + r2
        return {"route_id": route["id"], "status": status, "reasons": reasons, "provided": provided}

    def evaluate_programme(self, prog: dict, applicant: dict) -> dict[str, Any]:
        routes = [self.evaluate_route(r, applicant) for r in prog["routes"]]
        best = max(routes, key=lambda r: _RANK[r["status"]])
        status = best["status"]
        blockers: list[str] = []
        if status != ELIGIBLE:
            relevant = [r for r in routes if r["provided"]] or routes
            for r in relevant:
                blockers += [f"[{r['route_id']}] {x}" for x in r["reasons"]]
        notes = [r["note"] for r in prog["routes"] if r.get("note")]
        intake = (applicant.get("intake") or "").lower()
        intakes = prog.get("intakes") or self.config["meta"].get("intakes") or ["january", "june"]
        return {
            "programme_id": prog["id"],
            "name": prog["name"],
            "level": prog["level"],
            "status": status,
            "qualifies_via": best["route_id"] if status != NOT_ELIGIBLE else None,
            "blockers": blockers,
            "notes": notes,
            "available_in_intake": (intake in intakes) if intake else True,
            "modes": prog["modes"],
            "routes": routes,
        }

    def check_all(self, applicant: dict) -> list[dict[str, Any]]:
        results = [self.evaluate_programme(p, applicant) for p in self.config["programmes"]]
        results.sort(key=lambda r: (-_RANK[r["status"]], _LEVEL_ORDER[r["level"]], r["name"]))
        return results

    def get_programme(self, programme_id: str) -> dict | None:
        return next((p for p in self.config["programmes"] if p["id"] == programme_id), None)


@lru_cache(maxsize=1)
def default_rules() -> Rules:
    return Rules()
