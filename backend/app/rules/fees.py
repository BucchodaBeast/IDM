"""Fee quotes from data/fees.json."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_DATA = Path(__file__).parent / "data" / "fees.json"


@lru_cache(maxsize=1)
def load_fees() -> dict:
    return json.loads(_DATA.read_text(encoding="utf-8"))


def quote(programme_id: str, mode: str | None = None) -> dict | None:
    f = load_fees()
    out: dict = {
        "programme_id": programme_id,
        "currency": "E",
        "application_fee": f["application_fee"],
        "other_fees_to_confirm": {k: v for k, v in f["other_fees"].items() if k != "ipm_subscription_hr_students_only"},
        "notes": [f["source"]],
    }
    if programme_id in f["ipm_programmes"]:
        out["ipm_subscription"] = f["other_fees"]["ipm_subscription_hr_students_only"]
    if programme_id in f["itemised"]:
        block = f["itemised"][programme_id]
        out["items"] = block["items"]
        out["listed_total"] = sum(i["amount"] for i in block["items"])
        out["notes"] += block["notes"]
        return out
    modes = f["tuition"].get(programme_id)
    if not modes:
        return None
    if mode is None:
        if len(modes) > 1:
            out["tuition_by_mode"] = modes
            return out
        mode = next(iter(modes))
    if mode not in modes:
        return None
    out["mode"] = mode
    out["tuition"] = modes[mode]
    return out
