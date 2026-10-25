"use client";

import { useState } from "react";
import GradeRows, { emptyRows, rowsToOlevel, type Row } from "@/components/GradeRows";
import { checkScholarship } from "@/lib/api";
import type { ScholarshipResult } from "@/lib/types";

export default function Scholarship() {
  const [rows, setRows] = useState<Row[]>(emptyRows());
  const [level, setLevel] = useState<"diploma" | "degree">("degree");
  const [result, setResult] = useState<ScholarshipResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    try { setResult(await checkScholarship(rowsToOlevel(rows), level)); }
    catch { setError("We could not reach the server. Check your connection and try again."); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Government scholarship points check</h1>
      <p className="mt-2 max-w-xl text-muted">
        The Eswatini Government Scholarship needs 27 points for a diploma and 30 points for a degree.
        This is an estimate. The scholarship board makes the final decision.
      </p>
      <fieldset className="mt-6">
        <legend className="mb-2 font-semibold text-ink">I am applying for a</legend>
        <div className="flex gap-3">
          {(["degree", "diploma"] as const).map((l) => (
            <label key={l} className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-white px-4">
              <input type="radio" name="level" checked={level === l} onChange={() => setLevel(l)} className="accent-brand" />
              {l === "degree" ? "Degree" : "Diploma"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-6">
        <GradeRows rows={rows} onChange={setRows} />
        <button onClick={run} className="mt-6 h-12 rounded-md bg-brand px-6 font-bold text-white hover:bg-brand-deep">
          Check my points
        </button>
      </div>
      <div aria-live="polite" className="mt-6">
        {error && <p role="alert" className="text-crimson">{error}</p>}
        {result?.status === "scheme_not_configured" && (
          <p className="rounded-md border border-line bg-white p-4">
            Point calculation is not available yet. You need at least {result.threshold} points for a {result.level}.
            Ask admissions how your grades convert to points.
          </p>
        )}
        {result?.status === "qualifies" && (
          <p className="rounded-md border-l-8 border-ok bg-white p-4">
            You have an estimated {result.points} points. That meets the {result.threshold} needed for a {result.level}.
          </p>
        )}
        {result?.status === "short" && (
          <p className="rounded-md border-l-8 border-crimson bg-white p-4">
            You have an estimated {result.points} points. You need {result.threshold} for a {result.level}, which is {result.gap} more.
          </p>
        )}
      </div>
    </div>
  );
}
