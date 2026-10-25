"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProgrammes, modeLabel, verifyDocument } from "@/lib/api";
import type { ProgrammeInfo, VerifyResult } from "@/lib/types";
import { digitsOnly, emailError, localPhoneDigits, nameError, nationalIdError, phoneError } from "@/lib/validation";

const STEPS = ["Programme", "Your details", "Documents", "Review"] as const;
const DRAFT_KEY = "idm.draft";
const APPLICANT_KEY = "idm.applicant";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ["application/pdf", "image/jpeg", "image/png"];
type DocId = "certificates" | "national_id";
const DOCS: { id: DocId; label: string; multiple: boolean; hint: string }[] = [
  { id: "certificates", label: "Certified academic certificates", multiple: true, hint: "Your EGCSE, IGCSE, O-Level, NSC or Matric results. Add one file per page or certificate." },
  { id: "national_id", label: "Certified copy of your national ID", multiple: false, hint: "The photo page or card, clearly readable." },
];
const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-base";

type Draft = { programme: string; mode: string; intake: string; fullName: string; nationalId: string; phone: string; email: string; address: string };
const blank: Draft = { programme: "", mode: "", intake: "", fullName: "", nationalId: "", phone: "", email: "", address: "" };

type DocFile = { key: string; file: File; state: "checking" | "done" | "error"; result?: VerifyResult; error?: string };

const STATUS_LABEL: Record<string, string> = {
  verified: "Checked", review: "Admissions will check this", rejected: "Cannot use this file", unchecked: "Not checked automatically",
};

function claimedGrades(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(APPLICANT_KEY) ?? "{}").olevel ?? {}; } catch { return {}; }
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-sm text-crimson">{error}</span>
        : hint ? <span className="mt-1 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

function Wizard() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(blank);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [programmes, setProgrammes] = useState<ProgrammeInfo[]>([]);
  const [files, setFiles] = useState<Record<DocId, DocFile[]>>({ certificates: [], national_id: [] });
  const [fileError, setFileError] = useState("");
  const seq = useRef(0);

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
    if (("fullName" in patch || "nationalId" in patch) && (files.certificates.length || files.national_id.length)) {
      setFiles({ certificates: [], national_id: [] }); // documents were checked against the old details
    }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const errors = {
    fullName: nameError(d.fullName), nationalId: nationalIdError(d.nationalId),
    phone: phoneError(d.phone), email: emailError(d.email),
  };
  const detailsOk = Object.values(errors).every((e) => !e);
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : "");
  const blur = (k: string) => setTouched((t) => ({ ...t, [k]: true }));

  function patchFile(doc: DocId, key: string, patch: Partial<DocFile>) {
    setFiles((f) => ({ ...f, [doc]: f[doc].map((x) => (x.key === key ? { ...x, ...patch } : x)) }));
  }

  function addFiles(doc: (typeof DOCS)[number], list: FileList | null, el: HTMLInputElement) {
    if (!list) return;
    const picked = Array.from(list);
    el.value = "";
    const bad = picked.find((f) => !ACCEPT.includes(f.type) || f.size > MAX_BYTES);
    if (bad) { setFileError(`${bad.name} must be a PDF, JPG or PNG under 5 MB.`); return; }
    setFileError("");
    const entries: DocFile[] = (doc.multiple ? picked : picked.slice(0, 1)).map((file) => ({ key: `f${++seq.current}`, file, state: "checking" }));
    setFiles((f) => ({ ...f, [doc.id]: doc.multiple ? [...f[doc.id], ...entries] : entries }));
    const grades = claimedGrades();
    for (const e of entries) {
      verifyDocument(doc.id, e.file, d.fullName.trim(), d.nationalId, grades)
        .then((result) => patchFile(doc.id, e.key, { state: "done", result }))
        .catch((err: Error) => patchFile(doc.id, e.key, { state: "error", error: err.message }));
    }
  }

  const docState = (id: DocId) => {
    const list = files[id];
    return {
      count: list.length,
      busy: list.some((x) => x.state === "checking"),
      blocked: list.some((x) => x.state === "error" || x.result?.status === "rejected"),
    };
  };
  const docsOk = DOCS.every((x) => { const s = docState(x.id); return s.count > 0 && !s.busy && !s.blocked; });

  const claimed = Object.keys(claimedGrades());
  const confirmed = new Set(files.certificates.flatMap((x) => x.result?.subjects_matched ?? []));
  const notFound = files.certificates.some((x) => x.result && x.result.status !== "unchecked")
    ? claimed.filter((s) => !confirmed.has(s)) : [];

  const stepOk = [!!d.programme && !!d.mode && !!d.intake, detailsOk, docsOk, true];
  const phoneShown = d.phone ? `+268 ${d.phone.slice(0, 4)} ${d.phone.slice(4)}` : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl">Apply to IDM</h1>
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined}
            className={`flex-1 border-t-4 pt-2 text-sm ${i < step ? "border-brand text-brand" : i === step ? "border-brand font-bold text-ink" : "border-line text-muted"}`}>
            {s}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Programme">
              <select value={d.programme} onChange={(e) => update({ programme: e.target.value, mode: "" })} className={input}>
                <option value="">Choose a programme</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            {prog && (
              <Field label="Study mode">
                <select value={d.mode} onChange={(e) => update({ mode: e.target.value })} className={input}>
                  {prog.modes.map((m) => <option key={m.mode} value={m.mode}>{modeLabel(m.mode)} ({m.duration})</option>)}
                </select>
              </Field>
            )}
            <Field label="Intake">
              <select value={d.intake} onChange={(e) => update({ intake: e.target.value })} className={input}>
                <option value="">Choose an intake</option>
                <option value="january">January</option>
                <option value="june">June</option>
              </select>
            </Field>
            <p className="text-sm text-muted">Not sure you qualify? <a className="font-semibold text-brand underline" href="/">Check your eligibility first.</a></p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Full name" error={show("fullName")} hint="First name and surname, as on your ID.">
              <input value={d.fullName} autoComplete="name" onBlur={() => blur("fullName")}
                onChange={(e) => update({ fullName: e.target.value })} className={input} />
            </Field>
            <Field label="National ID number" error={show("nationalId")} hint={`${d.nationalId.length} of 13 digits`}>
              <input value={d.nationalId} inputMode="numeric" autoComplete="off" maxLength={13} onBlur={() => blur("nationalId")}
                onChange={(e) => update({ nationalId: digitsOnly(e.target.value).slice(0, 13) })} className={input} />
            </Field>
            <Field label="Phone number" error={show("phone")} hint="8 digits, for example 7612 3456.">
              <div className="flex">
                <span className="flex h-11 items-center rounded-l-md border border-r-0 border-line bg-paper px-3 font-semibold">+268</span>
                <input value={d.phone} inputMode="numeric" autoComplete="tel-national" onBlur={() => blur("phone")}
                  onChange={(e) => update({ phone: localPhoneDigits(e.target.value) })} className={`${input} rounded-l-none`} />
              </div>
            </Field>
            <Field label="Email address" error={show("email")}>
              <input type="email" value={d.email} autoComplete="email" onBlur={() => blur("email")}
                onChange={(e) => update({ email: e.target.value })} className={input} />
            </Field>
            <Field label="Postal or home address (optional)">
              <input value={d.address} autoComplete="street-address" onChange={(e) => update({ address: e.target.value })} className={input} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p>Each file is read and checked against your name, ID number and the grades you entered. Use a PDF, JPG or PNG under 5 MB.</p>
            {DOCS.map((doc) => (
              <div key={doc.id}>
                <label className="mb-1 block font-semibold" htmlFor={doc.id}>{doc.label}</label>
                <p className="mb-2 text-sm text-muted">{doc.hint}</p>
                <input id={doc.id} type="file" accept=".pdf,.jpg,.jpeg,.png" multiple={doc.multiple}
                  onChange={(e) => addFiles(doc, e.target.files, e.target)}
                  className="block w-full rounded-md border border-line p-2 file:mr-3 file:h-9 file:rounded file:border-0 file:bg-brand file:px-4 file:font-semibold file:text-white" />
                <ul className="mt-3 space-y-2">
                  {files[doc.id].map((f) => {
                    const r = f.result;
                    const tone = f.state === "error" || r?.status === "rejected" ? "border-crimson"
                      : r?.status === "verified" ? "border-brand" : r ? "border-warn" : "border-line";
                    return (
                      <li key={f.key} className={`rounded-md border-l-8 bg-paper p-3 text-sm ${tone}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="min-w-0 break-words font-semibold">{f.file.name}</span>
                          <button type="button" className="shrink-0 font-semibold text-crimson"
                            onClick={() => setFiles((x) => ({ ...x, [doc.id]: x[doc.id].filter((y) => y.key !== f.key) }))}>
                            Remove
                          </button>
                        </div>
                        <p className="mt-1" aria-live="polite">
                          {f.state === "checking" && "Checking this document..."}
                          {f.state === "error" && <span className="text-crimson">{f.error}</span>}
                          {r && <><strong>{STATUS_LABEL[r.status]}.</strong> {r.status === "verified" ? "" : r.message}</>}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {notFound.length > 0 && (
              <p className="rounded-md border-l-8 border-warn bg-paper p-3 text-sm">
                We could not find these subjects on your certificates: {notFound.join(", ")}. Add the missing page, or admissions will ask you for it.
              </p>
            )}
            {fileError && <p role="alert" className="text-crimson">{fileError}</p>}
            {!docsOk && <p className="text-sm text-muted">Continue unlocks when both documents are uploaded and none are rejected.</p>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <dl className="divide-y divide-line">
              {[
                ["Programme", prog?.name ?? ""], ["Study mode", d.mode ? modeLabel(d.mode) : ""],
                ["Intake", d.intake === "january" ? "January" : d.intake === "june" ? "June" : ""],
                ["Name", d.fullName], ["National ID", d.nationalId], ["Phone", phoneShown], ["Email", d.email],
                ["Certificates", `${files.certificates.length} file(s)`], ["National ID copy", `${files.national_id.length} file(s)`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded-md bg-paper p-4 text-sm">
              <p className="font-semibold">Application fee: E200</p>
              <p className="mt-1">Pay by MTN Mobile Money to 7809 0080, or by bank deposit to IDM&apos;s Standard Bank or FNB account. Send proof of payment to payments@idmbls.ac.sz or 7682 6651.</p>
            </div>
            <button disabled className="h-12 w-full cursor-not-allowed rounded-md bg-line font-bold text-muted">Submit application</button>
            <p className="text-sm text-muted">Online submission opens once the admissions system is connected.</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-between gap-3">
        <button onClick={() => setStep(step - 1)} disabled={step === 0}
          className="h-12 rounded-md border border-line bg-white px-6 font-semibold disabled:opacity-40">Back</button>
        {step < 3 && (
          <button onClick={() => { if (step === 1) setTouched({ fullName: true, nationalId: true, phone: true, email: true }); if (stepOk[step]) setStep(step + 1); }}
            disabled={step !== 1 && !stepOk[step]}
            className="h-12 rounded-md bg-brand px-8 font-bold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40">
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
