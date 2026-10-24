from fastapi.testclient import TestClient

from app.main import app

c = TestClient(app)


def test_health():
    assert c.get("/health").json() == {"status": "ok"}


def test_eligibility_endpoint():
    body = {"olevel": {"English": "B", "Maths": "C", "Physics": "C", "Physical Science": "C", "Biology": "C", "Geography": "D"}}
    r = c.post("/api/eligibility", json=body)
    assert r.status_code == 200
    top = {x["programme_id"] for x in r.json() if x["status"] == "eligible"}
    assert {"bsc-it", "bcd", "dip-hrm"} <= top


def test_scholarship_endpoint():
    r = c.post("/api/scholarship", json={"olevel": {"English": "A"}, "level": "degree"})
    assert r.json()["status"] == "scheme_not_configured"
    assert c.post("/api/scholarship", json={"olevel": {}, "level": "phd"}).status_code == 422


def test_fees_endpoint():
    assert c.get("/api/fees/bohs?mode=part_time").json()["tuition"]["annual"] == 19912
    assert c.get("/api/fees/unknown").status_code == 404
