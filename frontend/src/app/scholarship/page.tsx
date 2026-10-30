"use client";

import { useState } from "react";
import GradeRows, { SYLLABI, emptyRows, type Row } from "@/components/GradeRows";
import { checkScholarship } from "@/lib/api";
import { subjectLabel } from "@/lib/subjects";
import type { ScholarshipResult } from "@/lib/types";

const LEVELS = [
  { value: "degree", label: "Local degree", points: 30 },
  { value: "diploma", label: "Local diploma", points: 27 },
  { value: "external", label: "SADC / external award", points: 33 },
] as const;
const field = "h-11 rounded-md border border-line bg-white px-3 text-base";

export default function Scholarship() {
  const [rows, setRows] = useState<Row[]>(emptyRows().map((r) => ({ ...r, syllabus: "egcse" })));
  const [level, setLevel] = useState<(typeof LEVELS)[number]["value"]>("degree");
  const [result, setResult] = useState<ScholarshipResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    const subjects = rows.filter((r) => r.subject && r.grade).map((r) => ({ subject: r.subject, grade: r.grade, syllabus: r.syllabus ?? "egcse" }));
    if (!subjects.length) { setError("Choose at least one subject and grade."); return; }
    setError(""); setBusy(true);
    try { setResult(await checkScholarship(subjects, level)); }
    catch { setError("We could not reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  const headline = !result ? "" : result.status === "qualifies"
    ? "You meet the points and requirements for this award, based on your results."
    : result.status === "short"
      ? `You are ${result.gap} point${result.gap === 1 ? "" : "s"} short.`
      : "You have enough points, but a required condition is not met.";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl">Government scholarship points check</h1>
      <p className="mt-2 max-w-xl text-muted">
        Points come from your best six subjects. The minimum is 27 for a local diploma, 30 for a local degree and 33 for SADC or
        external awards. This is an estimate. The Ministry makes the final decision.
      </p>

      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold">I am applying for a</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <label key={l.value} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4">
              <input type="radio" name="level" checked={level === l.value} onChange={() => setLevel(l.value)} className="accent-brand" />
              {l.label} ({l.points})
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-6">
        <label className="mb-4 block">
          <span className="mb-1 block font-semibold">Exam syllabus for all subjects</span>
          <select className={`${field} w-full sm:w-72`} value={rows[0]?.syllabus ?? "egcse"}
            onChange={(e) => setRows(rows.map((r) => ({ ...r, syllabus: e.target.value })))}>
            {SYLLABI.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
          <span className="mt-1 block text-sm text-muted">IGCSE and GCE results earn one more point per grade than EGCSE. You can change a single subject below.</span>
        </label>
        <GradeRows rows={rows} onChange={setRows} withSyllabus />
        <button onClick={run} disabled={busy} className="mt-6 h-12 rounded-md bg-brand px-6 font-bold text-white hover:bg-brand-deep disabled:opacity-50">
          {busy ? "Checking..." : "Check my points"}
        </button>
        {error && <p role="alert" className="mt-3 text-crimson">{error}</p>}
      </div>

      <div aria-live="polite" className="mt-6">
        {result && (
          <section className={`rounded-xl border-l-8 bg-white p-5 shadow-sm ${result.status === "qualifies" ? "border-ok" : "border-warn"}`}>
            <p className="text-sm text-muted">{result.level_label}</p>
            <p className="mt-1 text-4xl font-bold">
              {result.points} <span className="text-lg font-semibold text-muted">of {result.threshold} points needed</span>
            </p>
            <p className="mt-2 font-semibold">{headline}</p>

            <ul className="mt-4 space-y-2">
              {result.checks.map((c) => (
                <li key={c.id} className="text-sm">
                  <strong className={c.ok ? "text-ok" : "text-crimson"}>{c.ok ? "Met" : "Not met"}</strong>{" "}
                  <span className="font-semibold">{c.label}.</span> {c.detail}
                </li>
              ))}
            </ul>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-muted"><tr><th className="py-1 pr-3 font-semibold">Subject</th><th className="pr-3 font-semibold">Grade</th><th className="pr-3 font-semibold">Points</th><th className="font-semibold">Counted</th></tr></thead>
                <tbody>
                  {result.subjects.map((s) => (
                    <tr key={s.subject} className="border-t border-line">
                      <td className="py-2 pr-3">{subjectLabel(s.subject)} <span className="text-muted">({SYLLABI.find((x) => x.value === s.syllabus)?.label})</span></td>
                      <td className="pr-3">{s.grade}</td><td className="pr-3">{s.points}</td><td>{s.counted ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mt-5 text-base">Also required</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{result.reminders.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
