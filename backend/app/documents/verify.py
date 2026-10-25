"""Pure checks that compare what was read from a document with what the applicant entered.
No network, fully testable."""
from __future__ import annotations

import re

from app.rules.engine import Rules, default_rules
from app.validation import name_tokens

PASS, REVIEW, FAIL = "pass", "review", "fail"


def _tok_match(a: str, b: str) -> bool:
    return a == b or (len(a) == 1 and b.startswith(a)) or (len(b) == 1 and a.startswith(b))


def name_match(entered: str, found: str | None) -> str:
    """'match', 'partial' or 'mismatch'. Initials count; word order does not matter."""
    a, b = name_tokens(entered), name_tokens(found or "")
    if not a or not b:
        return "mismatch"
    small, large = (a, b) if len(a) <= len(b) else (b, a)
    pool, matched = list(large), 0
    for t in small:
        hit = next((x for x in pool if _tok_match(t, x)), None)
        if hit:
            pool.remove(hit)
            matched += 1
    if matched >= 2 and matched == len(small):
        return "match"
    return "partial" if matched >= 1 and matched / len(small) >= 0.5 else "mismatch"


def _check(cid: str, label: str, status: str, detail: str = "") -> dict:
    return {"id": cid, "label": label, "status": status, "detail": detail}


def _common(extracted: dict, recognised_key: str, what: str) -> list[dict]:
    checks = []
    if extracted.get("legible") is False:
        checks.append(_check("legible", "Readable", FAIL, "The photo or scan is too blurry or cut off to read. Upload a clearer copy."))
    else:
        checks.append(_check("legible", "Readable", PASS))
    if not extracted.get(recognised_key):
        checks.append(_check("type", "Document type", FAIL, f"This does not look like {what}."))
    else:
        checks.append(_check("type", "Document type", PASS))
    return checks


def verify_national_id(extracted: dict, full_name: str, national_id: str) -> list[dict]:
    checks = _common(extracted, "is_eswatini_national_id", "an Eswatini national ID")
    found_id = re.sub(r"\D", "", str(extracted.get("id_number") or ""))
    if not found_id:
        checks.append(_check("id_number", "ID number", REVIEW, "We could not read the ID number. Admissions will check it."))
    elif found_id != national_id:
        checks.append(_check("id_number", "ID number", FAIL, "The ID number on this document does not match the one you entered."))
    else:
        checks.append(_check("id_number", "ID number", PASS))
    checks.append(_name_check(full_name, extracted.get("full_name")))
    return checks


def _name_check(entered: str, found: str | None) -> dict:
    result = name_match(entered, found)
    if result == "match":
        return _check("name", "Name", PASS)
    if result == "partial":
        return _check("name", "Name", REVIEW, "The name on this document only partly matches the name you entered. Admissions will check it.")
    if not found:
        return _check("name", "Name", REVIEW, "We could not read a name on this document. Admissions will check it.")
    return _check("name", "Name", FAIL, "The name on this document does not match the name you entered.")


def verify_certificate(extracted: dict, full_name: str, claimed_grades: dict[str, str],
                       rules: Rules | None = None) -> tuple[list[dict], list[str]]:
    """Returns (checks, claimed subjects confirmed on this document)."""
    rules = rules or default_rules()
    checks = _common(extracted, "is_academic_certificate", "an official results certificate or slip")
    checks.append(_name_check(full_name, extracted.get("candidate_name")))

    found: dict[str, str] = {}
    for row in extracted.get("subjects") or []:
        if isinstance(row, dict) and row.get("subject") and row.get("grade"):
            found[rules.subj(str(row["subject"]))] = str(row["grade"]).strip().upper()

    confirmed, wrong = [], []
    for raw_subject, claimed in (claimed_grades or {}).items():
        actual = found.get(rules.subj(raw_subject))
        if actual is None or actual not in rules.scale:
            continue
        if actual == str(claimed).strip().upper():
            confirmed.append(raw_subject)
        else:
            wrong.append(f"{raw_subject}: you entered {str(claimed).upper()}, the certificate shows {actual}")
    if wrong:
        checks.append(_check("grades", "Grades", FAIL,
                             "These grades do not match your eligibility check. " + "; ".join(wrong) + "."))
    elif claimed_grades and found and not confirmed:
        checks.append(_check("grades", "Grades", REVIEW, "None of the subjects you entered appear on this document."))
    elif confirmed:
        checks.append(_check("grades", "Grades", PASS, f"{len(confirmed)} subject(s) match."))
    return checks, confirmed


def summarise(checks: list[dict]) -> tuple[str, str]:
    fails = [c for c in checks if c["status"] == FAIL]
    reviews = [c for c in checks if c["status"] == REVIEW]
    if fails:
        return "rejected", " ".join(c["detail"] for c in fails)
    if reviews:
        return "review", " ".join(c["detail"] for c in reviews)
    return "verified", "Checked: this document matches your details."
