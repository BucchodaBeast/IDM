"""Server-side validation for applicant details. The browser checks the same rules,
but only these checks can be trusted."""
from __future__ import annotations

import re
import unicodedata

_ID_RE = re.compile(r"^\d{13}$")
_PHONE_RE = re.compile(r"^[27]\d{7}$")  # Eswatini: mobiles start 7, landlines start 2
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")
_NAME_RE = re.compile(r"^[^\W\d_]+(?:[ '\-][^\W\d_]+)+$", re.UNICODE)


def valid_national_id(value: str) -> bool:
    return bool(_ID_RE.match(value or ""))


def normalise_phone(raw: str) -> str | None:
    """Return +268XXXXXXXX, or None if the number is not a valid Eswatini number."""
    digits = re.sub(r"[\s\-().]", "", raw or "")
    for prefix in ("+268", "00268", "268"):
        if digits.startswith(prefix) and len(digits) == len(prefix) + 8:
            digits = digits[len(prefix):]
            break
    return f"+268{digits}" if _PHONE_RE.match(digits) else None


def valid_email(value: str) -> bool:
    return bool(_EMAIL_RE.match((value or "").strip())) and len(value) <= 254


def valid_full_name(value: str) -> bool:
    v = " ".join((value or "").split())
    return 3 <= len(v) <= 100 and bool(_NAME_RE.match(v))


def name_tokens(value: str) -> list[str]:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z\s]", " ", text).split()
