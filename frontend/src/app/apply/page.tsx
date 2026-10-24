"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProgrammes, modeLabel } from "@/lib/api";
import type { ProgrammeInfo } from "@/lib/types";

const STEPS = ["Programme", "Your details", "Documents", "Review"] as const;
const DRAFT_KEY = "idm.draft";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
const DOCS = [
  { id: "certificates", label: "Certified academic certificates", multiple: true },
  { id: "national_id", label: "Certified copy of your national ID", multiple: false },
];
const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-base";

type Draft = {
  programme: string; mode: string; intake: string;
  fullName: string; nationalId: string; phone: string; email: string; address: string;
};
const blank: Draft = { programme: "", mode: "", intake: "", fullName: "", nationalId: "", phone: "", email: "", address: "" };

function Wizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(blank);
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    getProgrammes().then(setProgrammes).catch(() => {});
    let saved: Partial<Draft> = {};
    try { saved = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}"); } catch { /* ignore */ }
    setD({
      ...blank, ...saved,
      programme: params.get("programme") ?? saved.programme ?? "",
      intake: params.get("intake") ?? saved.intake ?? "",
    });
  }, [params]);

  const prog = programmes.find((p) => p.id === d.programme);
  useEffect(() => {
    if (prog && !prog.modes.some((m) => m.mode === d.mode)) setD((x) => ({ ...x, mode: prog.modes[0].mode }));
  }, [prog, d.mode]);

  const update = (patch: Partial<Draft>) => {
    const next = { ...d, ...patch };
    setD(next);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  function addFiles(id: string, multiple: boolean, list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    const bad = picked.find((f) => !ACCEPT.includes(f.type) || f.size > MAX_BYTES);
    if (bad) { setFileError(`${bad.name} must be a PDF, JPG or PNG under 5 MB.`); return; }
    setFileError("");
    setFiles((f) => ({ ...f, [id]: multiple ? [...(f[id] ?? []), ...picked] : picked.slice(0, 1) }));
  }

  const stepOk = [
    !!d.programme && !!d.mode && !!d.intake,
    !!(d.fullName && d.nationalId && d.phone && d.email),
    DOCS.every((x) => (files[x.id] ?? []).length > 0),
    true,
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Apply to IDM</h1>
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`flex-1 border-t-4 pt-2 text-sm ${i < step ? "border-ok text-ok" : i === step ? "border-gold font-bold text-navy" : "border-line text-muted"}`}>
            {s}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        {step === 0 && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block font-semibold text-navy">Programme</span>
              <select value={d.programme} onChange={(e) => update({ programme: e.target.value, mode: "" })} className={input}>
                <option value="">Choose a programme</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            {prog && (
              <label className="block">
                <span className="mb-1 block font-semibold text-navy">Study mode</span>
                <select value={d.mode} onChange={(e) => update({ mode: e.target.value })} className={input}>
                  {prog.modes.map((m) => <option key={m.mode} value={m.mode}>{modeLabel(m.mode)} ({m.duration})</option>)}
                </select>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block font-semibold text-navy">Intake</span>
              <select value={d.intake} onChange={(e) => update({ intake: e.target.value })} className={input}>
                <option value="">Choose an intake</option>
                <option value="january">January</option>
                <option value="june">June</option>
              </select>
            </label>
            <p className="text-sm text-muted">Not sure you qualify? <a className="font-semibold text-navy underline" href="/">Check your eligibility first.</a></p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {([
              ["fullName", "Full name", "name", "text"], ["nationalId", "National ID number", "off", "text"],
              ["phone", "Phone number", "tel", "tel"], ["email", "Email address", "email", "email"],
              ["address", "Postal or home address (optional)", "street-address", "text"],
            ] as const).map(([key, label, auto, type]) => (
              <label key={key} className="block">
                <span className="mb-1 block font-semibold text-navy">{label}</span>
                <input type={type} autoComplete={auto} value={d[key]} onChange={(e) => update({ [key]: e.target.value })} className={input} />
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p>Upload clear scans or photos. Each file must be a PDF, JPG or PNG under 5 MB.</p>
            {DOCS.map((doc) => (
              <div key={doc.id}>
                <label className="mb-1 block font-semibold text-navy" htmlFor={doc.id}>{doc.label}</label>
                <input id={doc.id} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple={doc.multiple}
                  onChange={(e) => addFiles(doc.id, doc.multiple, e.target.files)}
                  className="block w-full rounded-md border border-line p-2 file:mr-3 file:h-9 file:rounded file:border-0 file:bg-navy file:px-4 file:font-semibold file:text-white" />
                <ul className="mt-2 space-y-1 text-sm">
                  {(files[doc.id] ?? []).map((f, i) => (
                    <li key={f.name + i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{f.name}</span>
                      <button type="button" className="font-semibold text-crimson"
                        onClick={() => setFiles((x) => ({ ...x, [doc.id]: x[doc.id].filter((_, j) => j !== i) }))}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {fileError && <p role="alert" className="text-crimson">{fileError}</p>}
            <p className="text-sm text-muted">Files stay on your device until you submit. Your answers are saved as a draft in this browser.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="divide-y divide-line">
              {[
                ["Programme", prog?.name ?? ""], ["Study mode", d.mode ? modeLabel(d.mode) : ""],
                ["Intake", d.intake === "january" ? "January" : d.intake === "june" ? "June" : ""],
                ["Name", d.fullName], ["National ID", d.nationalId], ["Phone", d.phone], ["Email", d.email],
                ["Certificates", `${(files.certificates ?? []).length} file(s)`], ["National ID copy", `${(files.national_id ?? []).length} file(s)`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded-md bg-paper p-4 text-sm">
              <p className="font-semibold text-navy">Application fee: E200</p>
              <p className="mt-1">Pay by MTN Mobile Money to 7809 0080, or by bank deposit to IDM&apos;s Standard Bank or FNB account. Send proof of payment to payments@idmbls.ac.sz or 7682 6651.</p>
            </div>
            <button disabled className="h-12 w-full cursor-not-allowed rounded-md bg-line font-bold text-muted">
              Submit application
            </button>
            <p className="text-sm text-muted">Online submission opens once the admissions system is connected.</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        <button onClick={() => setStep(step - 1)} disabled={step === 0}
          className="h-12 rounded-md border border-line bg-white px-6 font-semibold text-navy disabled:opacity-40">Back</button>
        {step < 3 && (
          <button onClick={() => setStep(step + 1)} disabled={!stepOk[step]}
            className="h-12 rounded-md bg-gold px-8 font-bold text-navy-deep disabled:cursor-not-allowed disabled:opacity-40">
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense><Wizard /></Suspense>;
}
