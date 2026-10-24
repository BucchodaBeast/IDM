"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProgrammes, getQuote, modeLabel, money } from "@/lib/api";
import type { ProgrammeInfo, Quote } from "@/lib/types";

const field = "h-11 w-full rounded-md border border-line bg-white px-3 text-base sm:w-96";
const OTHER_LABEL: Record<string, string> = {
  supplementary_fee_idm_courses: "Supplementary fee for IDM courses",
  computer_based_invigilation_fee: "Computer-based invigilation fee",
};

function Fees() {
  const params = useSearchParams();
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [id, setId] = useState(params.get("programme") ?? "");
  const [mode, setMode] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { getProgrammes().then(setProgrammes).catch(() => setMessage("Could not load programmes.")); }, []);

  const prog = programmes.find((p) => p.id === id);
  useEffect(() => {
    if (prog && !prog.modes.some((m) => m.mode === mode)) setMode(prog.modes[0].mode);
  }, [prog, mode]);

  useEffect(() => {
    if (!id || !mode) return;
    setMessage("");
    getQuote(id, mode).then(setQuote).catch(() => { setQuote(null); setMessage("Fees for this programme are not listed in the 2026/27 brochure. Contact admissions."); });
  }, [id, mode]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Fees for 2026/27</h1>
      <p className="mt-2 text-muted">Fees may differ slightly for 2027. Amounts are in Emalangeni.</p>
      <div className="mt-6 grid gap-4">
        <label>
          <span className="mb-1 block font-semibold text-navy">Programme</span>
          <select value={id} onChange={(e) => { setId(e.target.value); setQuote(null); }} className={field}>
            <option value="">Choose a programme</option>
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        {prog && prog.modes.length > 1 && (
          <label>
            <span className="mb-1 block font-semibold text-navy">Study mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={field}>
              {prog.modes.map((m) => <option key={m.mode} value={m.mode}>{modeLabel(m.mode)} ({m.duration})</option>)}
            </select>
          </label>
        )}
      </div>

      {message && <p className="mt-6 rounded-md border border-line bg-white p-4">{message}</p>}
      {quote && (
        <div className="mt-6 rounded-xl border border-line bg-white p-5">
          <dl className="divide-y divide-line">
            {quote.tuition?.annual != null && <Row label="Tuition per year" value={money(quote.tuition.annual)} />}
            {quote.tuition?.semester != null && <Row label="Tuition per semester" value={money(quote.tuition.semester)} />}
            {quote.tuition?.total != null && <Row label="Tuition for the course" value={money(quote.tuition.total)} />}
            {quote.items?.map((i) => <Row key={i.label} label={i.label} value={money(i.amount)} />)}
            {quote.listed_total != null && <Row label="Total of listed items" value={money(quote.listed_total)} strong />}
            <Row label="Application fee (paid once, with your application)" value={money(quote.application_fee)} />
            {quote.ipm_subscription != null && <Row label="IPM subscription (HR students only)" value={money(quote.ipm_subscription)} />}
          </dl>
          <h2 className="mt-6 text-lg font-bold">Other fees that may apply</h2>
          <ul className="mt-2 space-y-1">
            {Object.entries(quote.other_fees_to_confirm).map(([k, v]) => (
              <li key={k}>{OTHER_LABEL[k] ?? k}: {money(v)}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">Confirm with admissions how often these are charged.</p>
          {quote.notes.slice(1).map((n) => <p key={n} className="mt-2 text-sm text-muted">{n}</p>)}
          <p className="mt-4 text-sm text-muted">A deposit is required before registration unless you have proof of financial aid or a scholarship.</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt>{label}</dt>
      <dd className={strong ? "font-bold" : "font-semibold"}>{value}</dd>
    </div>
  );
}

export default function Page() {
  return <Suspense><Fees /></Suspense>;
}
