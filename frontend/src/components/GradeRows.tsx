"use client";

/**
 * IDM Eswatini Application Portal & Scholarship System
 * GradeRows Component
 *
 * Interactive Next.js/React component that renders dynamic dropdown rows for
 * selecting high school subjects, qualification levels and grades.
 *
 * Usage:
 *   <GradeRows
 *     value={rows}
 *     onChange={setRows}
 *     maxRows={8}
 *   />
 */

import React, { useCallback, useMemo } from "react";
import {
  ESWATINI_SUBJECTS,
  GRADE_POINTS_MAP,
  STREAM_LABELS,
  BEST_SUBJECTS_COUNT,
  DIPLOMA_CUTOFF_POINTS,
  DEGREE_CUTOFF_POINTS,
  MINIMUM_CREDIT_PASSES,
  type Grade,
  type QualificationLevel,
  type Subject,
  type SubjectStream,
} from "@/lib/subjects";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GradeRow {
  /** Unique key for React list rendering. */
  id: string;
  /** Selected subject ID (empty string = not yet chosen). */
  subjectId: string;
  /** Selected qualification level. */
  level: QualificationLevel;
  /** Selected grade (empty string = not yet chosen). */
  grade: string;
}

export interface GradeRowsProps {
  /** Current array of grade rows. */
  value: GradeRow[];
  /** Called whenever any row changes, a row is added, or a row is removed. */
  onChange: (rows: GradeRow[]) => void;
  /** Maximum number of rows the student may add (default 10). */
  maxRows?: number;
  /** Minimum number of rows required before the form can be submitted (default 6). */
  minRows?: number;
  /** If true, all dropdowns are disabled (e.g. after submission). */
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const QUALIFICATION_LEVELS: QualificationLevel[] = ["EGCSE", "IGCSE", "AS_LEVEL"];

const LEVEL_LABELS: Record<QualificationLevel, string> = {
  EGCSE: "EGCSE",
  IGCSE: "IGCSE",
  AS_LEVEL: "AS Level",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

let rowCounter = 0;
function nextRowId(): string {
  rowCounter += 1;
  return `row-${Date.now()}-${rowCounter}`;
}

export function createEmptyRow(): GradeRow {
  return { id: nextRowId(), subjectId: "", level: "EGCSE", grade: "" };
}

function getSubject(subjectId: string): Subject | undefined {
  return ESWATINI_SUBJECTS.find((s) => s.id === subjectId);
}

function getAvailableGrades(level: QualificationLevel): Grade[] {
  return Object.keys(GRADE_POINTS_MAP[level]) as Grade[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  row: GradeRow;
  index: number;
  allRows: GradeRow[];
  disabled: boolean;
  onUpdate: (id: string, patch: Partial<GradeRow>) => void;
  onRemove: (id: string) => void;
}

function GradeRowItem({ row, index, allRows, disabled, onUpdate, onRemove }: RowProps) {
  const selectedSubject = getSubject(row.subjectId);

  // Subjects already chosen in OTHER rows are disabled in this row's dropdown
  // to prevent duplicate selections.
  const takenSubjectIds = useMemo(
    () => new Set(allRows.filter((r) => r.id !== row.id && r.subjectId).map((r) => r.subjectId)),
    [allRows, row.id]
  );

  // Group subjects by stream for a nicely organised <optgroup> dropdown.
  const subjectOptions = useMemo(() => {
    const groups: Partial<Record<SubjectStream, Subject[]>> = {};
    for (const subject of ESWATINI_SUBJECTS) {
      if (takenSubjectIds.has(subject.id)) continue;
      if (!groups[subject.stream]) groups[subject.stream] = [];
      groups[subject.stream]!.push(subject);
    }
    return (Object.keys(STREAM_LABELS) as SubjectStream[])
      .filter((stream) => groups[stream]?.length)
      .map((stream) => ({
        stream,
        label: STREAM_LABELS[stream],
        subjects: groups[stream]!,
      }));
  }, [takenSubjectIds]);

  const gradeOptions = getAvailableGrades(row.level);

  const points =
    row.grade && selectedSubject
      ? GRADE_POINTS_MAP[row.level][row.grade as Grade]?.points ?? 0
      : 0;

  const isCredit =
    row.grade && selectedSubject
      ? GRADE_POINTS_MAP[row.level][row.grade as Grade]?.isCredit ?? false
      : false;

  return (
    <div className="grid grid-cols-12 gap-3 items-end bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Row number */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="text-sm font-semibold text-gray-400">{index + 1}</span>
      </div>

      {/* Subject dropdown */}
      <div className="col-span-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Subject <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          value={row.subjectId}
          disabled={disabled}
          onChange={(e) => {
            const newSubjectId = e.target.value;
            // Reset grade if it is not valid at the newly selected subject's
            // default level — handled by parent via onUpdate.
            onUpdate(row.id, { subjectId: newSubjectId, grade: "" });
          }}
        >
          <option value="">— Select subject —</option>
          {subjectOptions.map((group) => (
            <optgroup key={group.stream} label={group.label}>
              {group.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isCore ? " (Core)" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Qualification level dropdown */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Level <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          value={row.level}
          disabled={disabled}
          onChange={(e) => {
            const newLevel = e.target.value as QualificationLevel;
            // Reset grade when level changes — grade letters differ per level.
            onUpdate(row.id, { level: newLevel, grade: "" });
          }}
        >
          {QUALIFICATION_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {LEVEL_LABELS[lvl]}
            </option>
          ))}
        </select>
      </div>

      {/* Grade dropdown */}
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Grade <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          value={row.grade}
          disabled={disabled || !row.subjectId}
          onChange={(e) => onUpdate(row.id, { grade: e.target.value })}
        >
          <option value="">— Grade —</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>
              {g} ({GRADE_POINTS_MAP[row.level][g].points} pts)
            </option>
          ))}
        </select>
      </div>

      {/* Points badge */}
      <div className="col-span-1 flex flex-col items-center">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
            isCredit
              ? "bg-green-100 text-green-700"
              : points > 0
              ? "bg-yellow-100 text-yellow-700"
              : "bg-gray-100 text-gray-400"
          }`}
          title={isCredit ? "Credit pass (C or higher)" : "Below credit"}
        >
          {points > 0 ? points : "–"}
        </span>
      </div>

      {/* Remove button */}
      <div className="col-span-1 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          disabled={disabled}
          className="text-red-500 hover:text-red-700 text-sm font-medium disabled:opacity-40"
          aria-label={`Remove row ${index + 1}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function GradeRows({
  value,
  onChange,
  maxRows = 10,
  minRows = 6,
  disabled = false,
}: GradeRowsProps) {
  // ── Row management ─────────────────────────────────────────────────────────

  const handleUpdate = useCallback(
    (id: string, patch: Partial<GradeRow>) => {
      onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [value, onChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      if (value.length <= 1) return; // always keep at least one row
      onChange(value.filter((r) => r.id !== id));
    },
    [value, onChange]
  );

  const handleAdd = useCallback(() => {
    if (value.length >= maxRows) return;
    onChange([...value, createEmptyRow()]);
  }, [value, onChange, maxRows]);

  // ── Live scholarship preview ───────────────────────────────────────────────

  const preview = useMemo(() => {
    const completed = value.filter((r) => r.subjectId && r.grade);
    const scored = completed.map((r) => ({
      points: GRADE_POINTS_MAP[r.level][r.grade as Grade]?.points ?? 0,
      isCredit: GRADE_POINTS_MAP[r.level][r.grade as Grade]?.isCredit ?? false,
    }));
    const best = [...scored].sort((a, b) => b.points - a.points).slice(0, BEST_SUBJECTS_COUNT);
    const totalPoints = best.reduce((sum, s) => sum + s.points, 0);
    const creditPasses = scored.filter((s) => s.isCredit).length;
    const meetsCredit = creditPasses >= MINIMUM_CREDIT_PASSES;
    const qualifiesDiploma = totalPoints >= DIPLOMA_CUTOFF_POINTS && meetsCredit;
    const qualifiesDegree = totalPoints >= DEGREE_CUTOFF_POINTS && meetsCredit;

    return {
      completedCount: completed.length,
      totalPoints,
      creditPasses,
      meetsCredit,
      qualifiesDiploma,
      qualifiesDegree,
      award: qualifiesDegree ? "DEGREE" : qualifiesDiploma ? "DIPLOMA" : "NONE",
    };
  }, [value]);

  const canAddMore = value.length < maxRows;
  const meetsMinimumRows = value.filter((r) => r.subjectId && r.grade).length >= minRows;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-800">High School Results</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add at least {minRows} subjects. Your best {BEST_SUBJECTS_COUNT} subjects are used
            for the scholarship calculation.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !canAddMore}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + Add Subject
        </button>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-12 gap-3 px-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Subject</div>
        <div className="col-span-2">Level</div>
        <div className="col-span-2">Grade</div>
        <div className="col-span-1 text-center">Pts</div>
        <div className="col-span-1" />
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {value.map((row, idx) => (
          <GradeRowItem
            key={row.id}
            row={row}
            index={idx}
            allRows={value}
            disabled={disabled}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {/* Live scholarship preview panel */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-3">
          Live Scholarship Preview
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{preview.totalPoints}</p>
            <p className="text-xs text-gray-500">
              Best {BEST_SUBJECTS_COUNT} Points
            </p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                preview.meetsCredit ? "text-green-600" : "text-red-500"
              }`}
            >
              {preview.creditPasses}/{MINIMUM_CREDIT_PASSES}
            </p>
            <p className="text-xs text-gray-500">Credit Passes (min {MINIMUM_CREDIT_PASSES})</p>
          </div>
          <div>
            <p
              className={`text-lg font-bold ${
                preview.qualifiesDegree
                  ? "text-green-600"
                  : preview.qualifiesDiploma
                  ? "text-yellow-600"
                  : "text-gray-400"
              }`}
            >
              {preview.award === "NONE" ? "—" : preview.award}
            </p>
            <p className="text-xs text-gray-500">Current Award</p>
          </div>
          <div>
            <p
              className={`text-lg font-bold ${
                meetsMinimumRows ? "text-green-600" : "text-gray-400"
              }`}
            >
              {value.filter((r) => r.subjectId && r.grade).length}/{minRows}
            </p>
            <p className="text-xs text-gray-500">Subjects Filled</p>
          </div>
        </div>

        {/* Cutoff reference */}
        <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap gap-x-6 gap-y-1 text-xs text-blue-700">
          <span>Diploma cutoff: {DIPLOMA_CUTOFF_POINTS} pts</span>
          <span>Degree cutoff: {DEGREE_CUTOFF_POINTS} pts</span>
          <span>Min credit passes: {MINIMUM_CREDIT_PASSES}</span>
        </div>
      </div>
    </div>
  );
}
