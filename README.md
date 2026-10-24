# IDM Apply

Online application system for IDM Eswatini (2026/27 intake). Rules engine + API (FastAPI) and a mobile-first web app (Next.js).

## Run locally
```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
uvicorn app.main:app --reload     # http://localhost:8000/docs
```

## Frontend
```bash
cd frontend
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                        # http://localhost:3000
```
Pages: live eligibility checker (home), fees, scholarship check, 4-step application wizard.
The wizard saves a draft in the browser; submission and document storage are not connected yet.

## Endpoints
- `GET  /health`
- `GET  /api/programmes`
- `POST /api/eligibility`   applicant grades/qualifications -> every programme ranked eligible / review / not_eligible, with blockers
- `POST /api/scholarship`   points pre-check (needs scheme, see below)
- `GET  /api/fees/{programme_id}?mode=full_time|part_time`

## Rules are data
All admission rules, fees and scholarship thresholds live in `backend/app/rules/data/*.json`.
Next year's brochure = edit JSON + tests, not code. The chatbot will call this engine as tools.

## Open questions for IDM (must be confirmed before launch)
1. Lowest grade that counts as a "pass" (assumed E).
2. Diploma in IT: exact meaning of "3 credits in Mathematics/Physics & 2 other credits".
3. Scholarship points formula (points per grade, how many subjects count). Thresholds 27/30 are known; the scheme is not.
4. Which "relevant" diplomas/certificates count for degree and OHS entry (currently routed to manual review).
5. Whether supplementary (E500) and invigilation (E400) fees are per year, per semester, or per exam.
6. CIPS Level 3 fees, and the CIPS membership amount for Level 5 (not in the brochure).

## Deploy
`render.yaml` defines the API service (Frankfurt, paid plan). Set secrets in Render, never in the repo.
