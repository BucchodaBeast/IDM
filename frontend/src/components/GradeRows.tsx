"use client";

import { ALL_SUBJECTS, SUBJECT_GROUPS } from "@/lib/subjects";

export type Row = { subject: string; grade: string; syllabus?: string };
export const GRADES = ["A*", "A", "B", "C", "D", "E", "F", "G"];
export const APPLY_GRADES = ["A*", "A", "B", "C", "D"];
export const SYLLABI = [
  { value: "egcse", label: "EGCSE / SGCSE" },
  { value: "igcse", label: "IGCSE / GCE O-Level" },
  { value: "as", label: "AS Level" },
];

export const emptyRows = (): Row[] => [
  { subject: "English Language", grade: "" },
  { subject: "Mathematics", grade: "" },
  { subject: "", grade: "" }, { subject: "", grade: "" }, { subject: "", grade: "" }, { subject: "", grade: "" },
];

export function rowsToOlevel(rows: Row[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) if (r.subject.trim() && r.grade) out[r.subject.trim()] = r.grade;
  return out;
}

const field = "h-11 rounded-md border border-line bg-white px-3 text-base";

type Props = { rows: Row[]; onChange: (rows: Row[]) => void; grades?: string[]; withSyllabus?: boolean };

export default function GradeRows({ rows, onChange, grades = GRADES, withSyllabus = false }: Props) {
  const set = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const taken = new Set(rows.map((r) => r.subject).filter(Boolean));
  const lastSyllabus = rows[rows.length - 1]?.syllabus ?? "egcse";
  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r, i) => {
          const known = !r.subject || ALL_SUBJECTS.some((x) => x.value === r.subject);
          return (
            <li key={i} className="flex flex-wrap gap-2">
              <select value={r.subject} onChange={(e) => set(i, { subject: e.target.value })} aria-label={`Subject ${i + 1}`}
                className={`${field} min-w-0 ${withSyllabus ? "basis-full sm:basis-0 sm:flex-1" : "flex-1"}`}>
                <option value="">Select subject</option>
                {!known && <option value={r.subject}>{r.subject}</option>}
                {SUBJECT_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.subjects.map((x) => (
                      <option key={x.value} value={x.value} disabled={taken.has(x.value) && x.value !== r.subject}>{x.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <select value={r.grade} onChange={(e) => set(i, { grade: e.target.value })}
                aria-label={`Grade for subject ${i + 1}`} className={`${field} w-24`}>
                <option value="">Grade</option>
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {withSyllabus && (
                <select value={r.syllabus ?? "egcse"} onChange={(e) => set(i, { syllabus: e.target.value })}
                  aria-label={`Syllabus for subject ${i + 1}`} className={`${field} min-w-0 flex-1 sm:w-48 sm:flex-none`}>
                  {SYLLABI.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
              )}
              <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
                aria-label={`Remove subject ${i + 1}`} className="h-11 w-11 rounded-md text-xl text-muted hover:bg-line/60">
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button"
        onClick={() => onChange([...rows, { subject: "", grade: "", ...(withSyllabus ? { syllabus: lastSyllabus } : {}) }])}
        className="mt-3 h-11 rounded-md border border-line bg-white px-4 font-semibold text-ink hover:bg-paper">
        Add a subject
      </button>
    </div>
  );
}
