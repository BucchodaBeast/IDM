"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { checkEligibility, modeLabel } from "@/lib/api";
import type { Applicant, Result } from "@/lib/types";
import GradeRows, { SUBJECTS, emptyRows, rowsToOlevel, type Row } from "./GradeRows";

type Tab = "olevel" | "nsc" | "other";
const TABS: { id: Tab; label: string }[] = [
  { id: "olevel", label: "EGCSE / IGCSE / O-Level" },
  { id: "nsc", label: "NSC / Matric" },
  { id: "other", label: "Qualifications and experience" },
];
const NSC_SUBJECTS = [...SUBJECTS.slice(0, 9), "Computer Applications Technology", "Computer Studies", "Life Sciences", "Geography"];
const COMPLETED = [
  { kind: "it_related_course", label: "An IT-related course" },
  { kind: "cisco_ccna1", label: "CISCO CCNA 1" },
  { kind: "cisco_ccna2", label: "CISCO CCNA 2" },
  { kind: "cips_level_2", label: "CIPS Level 2" },
  { kind: "cips_level_3", label: "CIPS Level 3" },
  { kind: "cips_level_4", label: "CIPS Level 4" },
  { kind: "cips_level_5", label: "CIPS Level 5" },
];
const VIA: Record<string, string> = {
  olevel: "your EGCSE/IGCSE/O-Level results", nsc: "your NSC/Matric results",
  "diploma-hr": "your HR diploma", "diploma-relevant": "your diploma", "certificate-related": "your certificate",
  experience: "your work experience", "a-levels": "your A-Level passes", open: "no entry requirements",
};
const field = "h-11 rounded-md border border-line bg-white px-3 text-base";
const STORAGE_KEY = "idm.applicant";

export default function Checker() {
  const [tab, setTab] = useState<Tab>("olevel");
  const [rows, setRows] = useState<Row[]>(emptyRows());
  const [level, setLevel] = useState("");
  const [passed, setPassed] = useState<string[]>([]);
  const [diploma, setDiploma] = useState("");
  const [certificate, setCertificate] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [years, setYears] = useState(0);
  const [relevant, setRelevant] = useState(false);
  const [alevels, setAlevels] = useState(0);
  const [intake, setIntake] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const applicant = useMemo<Applicant>(() => {
    const a: Applicant = {};
    const ol = rowsToOlevel(rows);
    if (Object.keys(ol).length) a.olevel = ol;
    if (level) a.nsc = { admission_level: level, subjects_passed: passed };
    const q: Applicant["qualifications"] = completed.map((kind) => ({ kind }));
    if (diploma) q.push({ kind: "diploma", field: diploma });
    if (certificate) q.push({ kind: "certificate", field: "relevant" });
    if (q.length) a.qualifications = q;
    a.work_experience_years = years;
    a.relevant_experience = relevant;
    a.alevel_passes = alevels;
    if (intake) a.intake = intake;
    return a;
  }, [rows, level, passed, diploma, certificate, completed, years, relevant, alevels, intake]);

  const hasInput = !!(applicant.olevel || applicant.nsc || applicant.qualifications || years > 0 || relevant || alevels > 0);

  useEffect(() => {
    if (!hasInput) { setResults(null); return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(applicant)); } catch { /* storage unavailable */ }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await checkEligibility(applicant, ctrl.signal));
        setError("");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("We could not reach the server. Check your connection and try again.");
      } finally { setLoading(false); }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [applicant, hasInput]);

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const groups = [
    { status: "eligible", title: "You qualify", tone: "border-ok" },
    { status: "review", title: "Admissions will review your application", tone: "border-gold" },
    { status: "not_eligible", title: "Not yet", tone: "border-line" },
  ] as const;

  return (
    <div>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 pb-24 pt-10">
          <h1 className="max-w-xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            Enter your results and see which IDM programmes you qualify for
          </h1>
          <p className="mt-3 max-w-xl text-white/80">
            Results update as you type. Nothing is submitted until you start an application.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-4xl px-4">
        <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6">
          <div role="tablist" aria-label="Type of results" className="flex gap-1 overflow-x-auto border-b border-line">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                className={`whitespace-nowrap px-3 py-3 font-semibold ${tab === t.id ? "border-b-4 border-gold text-navy" : "text-muted"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="pt-5">
            {tab === "olevel" && <GradeRows rows={rows} onChange={setRows} />}

            {tab === "nsc" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block font-semibold text-navy">Admission recommendation on your certificate</span>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${field} w-full sm:w-72`}>
                    <option value="">I did not write NSC/Matric</option>
                    <option value="bachelor">Bachelor's</option>
                    <option value="diploma">Diploma</option>
                    <option value="none">No recommendation</option>
                  </select>
                </label>
                {level && (
                  <fieldset>
                    <legend className="mb-2 font-semibold text-navy">Subjects you passed</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {NSC_SUBJECTS.map((s) => (
                        <label key={s} className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3">
                          <input type="checkbox" checked={passed.includes(s)} onChange={() => setPassed(toggle(passed, s))} className="size-5 accent-navy" />
                          {s}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            )}

            {tab === "other" && (
              <div className="space-y-5">
                <label className="block">
                  <span className="mb-1 block font-semibold text-navy">Diploma you hold</span>
                  <select value={diploma} onChange={(e) => setDiploma(e.target.value)} className={`${field} w-full sm:w-72`}>
                    <option value="">None</option>
                    <option value="hr">Human Resource Management</option>
                    <option value="relevant">Another field</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={certificate} onChange={(e) => setCertificate(e.target.checked)} className="size-5 accent-navy" />
                  I hold a certificate in a related field
                </label>
                <fieldset>
                  <legend className="mb-2 font-semibold text-navy">Courses you have completed</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {COMPLETED.map((c) => (
                      <label key={c.kind} className="flex min-h-11 items-center gap-3 rounded-md border border-line px-3">
                        <input type="checkbox" checked={completed.includes(c.kind)} onChange={() => setCompleted(toggle(completed, c.kind))} className="size-5 accent-navy" />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-4">
                  <label className="block">
                    <span className="mb-1 block font-semibold text-navy">Years of work experience</span>
                    <input type="number" min={0} max={50} value={years} onChange={(e) => setYears(Math.max(0, Number(e.target.value)))} className={`${field} w-28`} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-semibold text-navy">Advanced Level passes</span>
                    <input type="number" min={0} max={6} value={alevels} onChange={(e) => setAlevels(Math.max(0, Number(e.target.value)))} className={`${field} w-28`} />
                  </label>
                </div>
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={relevant} onChange={(e) => setRelevant(e.target.checked)} className="size-5 accent-navy" />
                  My work experience is relevant to the course I want
                </label>
              </div>
            )}

            <label className="mt-6 block">
              <span className="mb-1 block font-semibold text-navy">Intake you want</span>
              <select value={intake} onChange={(e) => setIntake(e.target.value)} className={`${field} w-full sm:w-72`}>
                <option value="">Either intake</option>
                <option value="january">January</option>
                <option value="june">June</option>
              </select>
            </label>
          </div>
        </div>

        <section aria-live="polite" className="mt-8">
          {error && <p role="alert" className="rounded-md border border-crimson bg-white p-4 text-crimson">{error}</p>}
          {!hasInput && !error && (
            <p className="rounded-md border border-dashed border-line p-6 text-muted">
              Add at least one subject and grade to see matching programmes.
            </p>
          )}
          {results && groups.map((g) => {
            const items = results.filter((r) => r.status === g.status);
            if (!items.length) return null;
            return (
              <div key={g.status} className="mb-8">
                <h2 className="mb-3 text-xl font-bold">{g.title} ({items.length})</h2>
                <ul className="space-y-3">
                  {items.map((r) => (
                    <li key={r.programme_id} className={`rounded-lg border-l-8 bg-white p-4 shadow-sm ${g.tone}`}>
                      <h3 className="text-lg font-semibold">{r.name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {r.level === "professional" ? "Professional programme" : r.level === "degree" ? "Degree" : "Diploma"}.{" "}
                        {r.modes.map((m) => `${modeLabel(m.mode)}: ${m.duration}`).join(". ")}.
                      </p>
                      {!r.available_in_intake && <p className="mt-2 font-semibold text-crimson">Not offered in the intake you chose.</p>}
                      {r.status !== "not_eligible" && r.qualifies_via && (
                        <p className="mt-2">You qualify through {VIA[r.qualifies_via] ?? r.qualifies_via}.</p>
                      )}
                      {r.status === "review" && r.blockers.length === 0 && <p className="mt-2">Admissions will confirm that your qualification is relevant.</p>}
                      {r.notes.map((n) => <p key={n} className="mt-2 text-sm text-muted">{n}</p>)}
                      {r.status === "not_eligible" && r.blockers.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer font-semibold text-navy">What is missing</summary>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {r.blockers.map((b) => <li key={b}>{b.replace(/^\[[^\]]+\]\s*/, "")}</li>)}
                          </ul>
                        </details>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.status !== "not_eligible" && (
                          <Link href={`/apply?programme=${r.programme_id}${intake ? `&intake=${intake}` : ""}`}
                            className="inline-flex h-11 items-center rounded-md bg-gold px-5 font-bold text-navy-deep hover:brightness-95">
                            Apply for this programme
                          </Link>
                        )}
                        <Link href={`/fees?programme=${r.programme_id}`}
                          className="inline-flex h-11 items-center rounded-md border border-line px-4 font-semibold text-navy hover:bg-paper">
                          See fees
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {loading && <p className="text-muted">Checking...</p>}
        </section>
      </div>
    </div>
  );
}
