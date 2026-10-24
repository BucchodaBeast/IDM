"use client";

export type Row = { subject: string; grade: string };
export const GRADES = ["A*", "A", "B", "C", "D", "E", "F", "G"];
export const SUBJECTS = [
  "English Language", "Mathematics", "Physical Science", "Physics", "Chemistry", "Biology",
  "Combined Science", "Additional Combined Science", "Information Technology",
  "Design and Technology", "Geography", "History", "Accounting", "Business Studies",
  "Commerce", "Economics", "Agriculture", "siSwati", "Religious Education",
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

export default function GradeRows({ rows, onChange }: { rows: Row[]; onChange: (rows: Row[]) => void }) {
  const set = (i: number, patch: Partial<Row>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <datalist id="subjects">{SUBJECTS.map((s) => <option key={s} value={s} />)}</datalist>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-2">
            <input
              list="subjects" value={r.subject} onChange={(e) => set(i, { subject: e.target.value })}
              placeholder="Subject" aria-label={`Subject ${i + 1}`} className={`${field} min-w-0 flex-1`}
            />
            <select value={r.grade} onChange={(e) => set(i, { grade: e.target.value })}
              aria-label={`Grade for subject ${i + 1}`} className={`${field} w-24`}>
              <option value="">Grade</option>
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={`Remove subject ${i + 1}`} className="h-11 w-11 rounded-md text-xl text-muted hover:bg-line/60">
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...rows, { subject: "", grade: "" }])}
        className="mt-3 h-11 rounded-md border border-line bg-white px-4 font-semibold text-navy hover:bg-paper">
        Add a subject
      </button>
    </div>
  );
}
