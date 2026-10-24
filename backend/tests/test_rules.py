import pytest

from app.rules import fees, scholarship
from app.rules.engine import ELIGIBLE, NOT_ELIGIBLE, REVIEW, default_rules

R = default_rules()


def result(pid, applicant):
    prog = R.get_programme(pid)
    return R.evaluate_programme(prog, applicant)


GOOD_IT = {"English": "B", "Maths": "C", "Physics": "C", "Physical Science": "C", "Biology": "C", "Geography": "D"}


def test_data_integrity():
    ids = [p["id"] for p in R.config["programmes"]]
    assert len(ids) == len(set(ids))
    f = fees.load_fees()
    for pid in list(f["tuition"]) + list(f["itemised"]):
        assert pid in ids, pid
    for p in R.config["programmes"]:
        assert p["routes"] and p["modes"]


def test_bsc_it_olevel_eligible():
    assert result("bsc-it", {"olevel": GOOD_IT})["status"] == ELIGIBLE


def test_bsc_it_needs_science_or_tech_subjects():
    r = result("bsc-it", {"olevel": {"English": "B", "Maths": "B", "Biology": "C", "Geography": "C", "History": "C", "Accounting": "D"}})
    assert r["status"] == NOT_ELIGIBLE
    assert any("Physical Science" in b for b in r["blockers"])


def test_bsc_it_four_credits_not_enough():
    g = dict(GOOD_IT, Biology="D", Physics="D")
    assert result("bsc-it", {"olevel": g})["status"] == NOT_ELIGIBLE


def test_bsc_it_nsc_bachelor_with_maths():
    nsc = {"admission_level": "bachelor", "subjects_passed": ["Mathematics", "English"]}
    r = result("bsc-it", {"nsc": nsc})
    assert r["status"] == ELIGIBLE and r["qualifies_via"] == "nsc"


def test_bsc_it_nsc_diploma_level_rejected():
    nsc = {"admission_level": "diploma", "subjects_passed": ["Mathematics"]}
    assert result("bsc-it", {"nsc": nsc})["status"] == NOT_ELIGIBLE


def test_relevant_diploma_goes_to_review():
    r = result("bsc-it", {"qualifications": [{"kind": "diploma", "field": "it"}]})
    assert r["status"] == REVIEW


def test_dip_ohs_english_floor():
    base = {"Mathematics": "C", "Biology": "C", "Chemistry": "C", "Geography": "D"}
    assert result("dip-ohs", {"olevel": dict(base, English="D")})["status"] == ELIGIBLE
    assert result("dip-ohs", {"olevel": dict(base, English="E")})["status"] == NOT_ELIGIBLE


def test_ba_hrm_requires_hr_diploma():
    assert result("ba-hrm", {"qualifications": [{"kind": "diploma", "field": "HR"}]})["status"] == ELIGIBLE
    assert result("ba-hrm", {"qualifications": [{"kind": "diploma", "field": "it"}]})["status"] == NOT_ELIGIBLE


def test_cisco_cyber_needs_experience():
    five = {"olevel": {s: "D" for s in ["English", "Maths", "Biology", "History", "Geography"]}}
    assert result("cisco-cyber", five)["status"] == NOT_ELIGIBLE
    assert result("cisco-cyber", dict(five, relevant_experience=True))["status"] == ELIGIBLE


def test_progression_chain():
    assert result("ccna2", {})["status"] == NOT_ELIGIBLE
    assert result("ccna2", {"qualifications": ["cisco_ccna1"]})["status"] == ELIGIBLE
    assert result("cips-l3", {"qualifications": ["cips_level_2"]})["status"] == ELIGIBLE


def test_cips_l4_via_experience():
    assert result("cips-l4", {"work_experience_years": 2})["status"] == ELIGIBLE
    assert result("cips-l4", {"work_experience_years": 1})["status"] == NOT_ELIGIBLE


def test_june_only_programme():
    assert result("cips-l4-3yr", {"intake": "january"})["available_in_intake"] is False
    assert result("cips-l4-3yr", {"intake": "june"})["available_in_intake"] is True


def test_check_all_sorted_best_first():
    out = R.check_all({"olevel": GOOD_IT})
    ranks = {"eligible": 2, "review": 1, "not_eligible": 0}
    assert [ranks[o["status"]] for o in out] == sorted([ranks[o["status"]] for o in out], reverse=True)


def test_scholarship_unconfigured_is_honest():
    assert scholarship.calculate({"English": "A"}, "degree")["status"] == "scheme_not_configured"


def test_scholarship_with_scheme():
    scheme = {"points": {"A*": 9, "A": 8, "B": 7, "C": 6, "D": 5}, "best_n": 6}
    olevel = {s: "B" for s in ["English", "Maths", "Biology", "History", "Geography", "Chemistry", "Physics"]}
    r = scholarship.calculate(olevel, "degree", scheme=scheme)
    assert r["points"] == 42 and r["status"] == "qualifies"
    low = scholarship.calculate({"English": "D"}, "diploma", scheme=scheme)
    assert low["status"] == "short" and low["gap"] == 22


def test_fees():
    q = fees.quote("bsc-it", "full_time")
    assert q["tuition"]["annual"] == 26330 and "ipm_subscription" not in q
    assert fees.quote("ba-hrm")["ipm_subscription"] == 650
    assert fees.quote("cips-l2")["listed_total"] == 13760 + 4480 + 1695 + 1638
    assert fees.quote("nope") is None
