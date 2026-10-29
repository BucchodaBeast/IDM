"use client";

/**
 * IDM Eswatini Application Portal & Scholarship System
 * Student Application Page
 *
 * Full application form that collects personal details, school information,
 * and high school subject results (via the GradeRows component), then
 * submits everything to the backend for scholarship evaluation.
 */

import React, { useState, useCallback } from "react";
import GradeRows, {
  createEmptyRow,
  type GradeRow,
} from "@/components/GradeRows";
import {
  ESWATINI_SUBJECTS,
  BEST_SUBJECTS_COUNT,
  DIPLOMA_CUTOFF_POINTS,
  DEGREE_CUTOFF_POINTS,
  MINIMUM_CREDIT_PASSES,
  type Grade,
} from "@/lib/subjects";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface PersonalDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "" | "Male" | "Female";
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
}

interface SchoolDetails {
  schoolName: string;
  schoolRegion: string;
  yearCompleted: string;
  candidateNumber: string;
}

interface ApiSubjectScore {
  subject_id: string;
  subject_name: string;
  level: string;
  grade: string;
  points: number;
  is_credit: boolean;
  counted_in_best_six: boolean;
}

interface ScholarshipResult {
  total_points: number;
  best_subjects_count: number;
  credit_passes: number;
  meets_credit_requirement: boolean;
  qualifies_diploma: boolean;
  qualifies_degree: boolean;
  award: "NONE" | "DIPLOMA" | "DEGREE";
  subject_scores: ApiSubjectScore[];
}

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; result: ScholarshipResult; applicationId: string }
  | { status: "error"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ESWATINI_REGIONS = [
  "Hhohho",
  "Lubombo",
  "Manzini",
  "Shiselweni",
];

const MIN_ROWS = 6;
const MAX_ROWS = 10;

const INITIAL_PERSONAL: PersonalDetails = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  nationalId: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  region: "",
};

const INITIAL_SCHOOL: SchoolDetails = {
  schoolName: "",
  schoolRegion: "",
  yearCompleted: new Date().getFullYear().toString(),
  candidateNumber: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ApplyPage() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState<PersonalDetails>(INITIAL_PERSONAL);
  const [school, setSchool] = useState<SchoolDetails>(INITIAL_SCHOOL);
  const [gradeRows, setGradeRows] = useState<GradeRow[]>(() => {
    // Pre-populate with the minimum number of empty rows.
    return Array.from({ length: MIN_ROWS }, () => createEmptyRow());
  });
  const [declaration, setDeclaration] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });

  // ── Personal details handlers ──────────────────────────────────────────────

  const handlePersonalChange = useCallback(
    (field: keyof PersonalDetails) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setPersonal((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const handleSchoolChange = useCallback(
    (field: keyof SchoolDetails) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setSchool((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  // ── Validation ─────────────────────────────────────────────────────────────

  const completedRows = gradeRows.filter((r) => r.subjectId && r.grade);

  const personalValid =
    personal.firstName.trim() !== "" &&
    personal.lastName.trim() !== "" &&
    personal.dateOfBirth !== "" &&
    personal.gender !== "" &&
    personal.nationalId.trim() !== "" &&
    personal.phone.trim() !== "" &&
    personal.email.trim() !== "" &&
    personal.region !== "";

  const schoolValid =
    school.schoolName.trim() !== "" &&
    school.schoolRegion !== "" &&
    school.yearCompleted !== "" &&
    school.candidateNumber.trim() !== "";

  const resultsValid = completedRows.length >= MIN_ROWS;

  const formValid = personalValid && schoolValid && resultsValid && declaration;

  // ── Submission ─────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formValid) return;

      setSubmission({ status: "submitting" });

      // Build the results payload for the backend.
      const resultsPayload = completedRows.map((row) => {
        const subject = ESWATINI_SUBJECTS.find((s) => s.id === row.subjectId);
        return {
          subject_id: row.subjectId,
          subject_name: subject?.name ?? row.subjectId,
          level: row.level,
          grade: row.grade as Grade,
        };
      });

      const payload = {
        personal,
        school,
        results: resultsPayload,
      };

      try {
        const res = await fetch("/api/v1/scholarship/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: resultsPayload }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.detail ?? `Server error (${res.status})`);
        }

        const result: ScholarshipResult = await res.json();
        const applicationId = `IDM-${new Date().getFullYear()}-${Math.floor(
          100000 + Math.random() * 900000
        )}`;

        setSubmission({ status: "success", result, applicationId });
      } catch (err) {
        setSubmission({
          status: "error",
          message: err instanceof Error ? err.message : "An unexpected error occurred.",
        });
      }
    },
    [formValid, completedRows, personal, school]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";
  const sectionCls = "bg-white border border-gray-200 rounded-lg p-6 shadow-sm";

  // ── Success screen ─────────────────────────────────────────────────────────

  if (submission.status === "success") {
    const { result, applicationId } = submission;
    return (
      <main className="min-h-screen bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <div className={`rounded-lg p-8 text-center shadow ${
            result.award === "DEGREE"
              ? "bg-green-50 border border-green-300"
              : result.award === "DIPLOMA"
              ? "bg-yellow-50 border border-yellow-300"
              : "bg-red-50 border border-red-300"
          }`}>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Application Submitted
            </h1>
            <p className="text-sm text-gray-600 mb-1">
              Application ID: <span className="font-mono font-semibold">{applicationId}</span>
            </p>

            <div className="my-6">
              <p className="text-5xl font-extrabold text-gray-800">{result.total_points}</p>
              <p className="text-sm text-gray-500 mt-1">
                Total points (best {BEST_SUBJECTS_COUNT} subjects)
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div>
                <p className={`text-xl font-bold ${result.meets_credit_requirement ? "text-green-600" : "text-red-500"}`}>
                  {result.credit_passes}/{MINIMUM_CREDIT_PASSES}
                </p>
                <p className="text-xs text-gray-500">Credit Passes</p>
              </div>
              <div>
                <p className={`text-xl font-bold ${result.qualifies_diploma ? "text-green-600" : "text-gray-400"}`}>
                  {result.qualifies_diploma ? "✓" : "✗"}
                </p>
                <p className="text-xs text-gray-500">Diploma ({DIPLOMA_CUTOFF_POINTS}+ pts)</p>
              </div>
              <div>
                <p className={`text-xl font-bold ${result.qualifies_degree ? "text-green-600" : "text-gray-400"}`}>
                  {result.qualifies_degree ? "✓" : "✗"}
                </p>
                <p className="text-xs text-gray-500">Degree ({DEGREE_CUTOFF_POINTS}+ pts)</p>
              </div>
            </div>

            <div className={`inline-block px-6 py-3 rounded-full text-lg font-bold ${
              result.award === "DEGREE"
                ? "bg-green-600 text-white"
                : result.award === "DIPLOMA"
                ? "bg-yellow-500 text-white"
                : "bg-gray-400 text-white"
            }`}>
              {result.award === "NONE" ? "Not Eligible" : `${result.award} Scholarship`}
            </div>

            <button
              onClick={() => {
                setSubmission({ status: "idle" });
                setPersonal(INITIAL_PERSONAL);
                setSchool(INITIAL_SCHOOL);
                setGradeRows(Array.from({ length: MIN_ROWS }, () => createEmptyRow()));
                setDeclaration(false);
              }}
              className="block mx-auto mt-8 text-sm text-blue-600 hover:underline"
            >
              Submit another application
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            IDM Eswatini Scholarship Application
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Government of Eswatini — Ministry of Education & Training
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* ── Section 1: Personal Details ─────────────────────────────────── */}
          <section className={sectionCls}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              1. Personal Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name *</label>
                <input className={inputCls} value={personal.firstName} onChange={handlePersonalChange("firstName")} />
              </div>
              <div>
                <label className={labelCls}>Last Name *</label>
                <input className={inputCls} value={personal.lastName} onChange={handlePersonalChange("lastName")} />
              </div>
              <div>
                <label className={labelCls}>Date of Birth *</label>
                <input type="date" className={inputCls} value={personal.dateOfBirth} onChange={handlePersonalChange("dateOfBirth")} />
              </div>
              <div>
                <label className={labelCls}>Gender *</label>
                <select className={inputCls} value={personal.gender} onChange={handlePersonalChange("gender")}>
                  <option value="">— Select —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>National ID Number *</label>
                <input className={inputCls} value={personal.nationalId} onChange={handlePersonalChange("nationalId")} placeholder="e.g. 1234567890123" />
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input className={inputCls} value={personal.phone} onChange={handlePersonalChange("phone")} placeholder="+268 ..." />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Email Address *</label>
                <input type="email" className={inputCls} value={personal.email} onChange={handlePersonalChange("email")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Residential Address</label>
                <input className={inputCls} value={personal.address} onChange={handlePersonalChange("address")} />
              </div>
              <div>
                <label className={labelCls}>City / Town</label>
                <input className={inputCls} value={personal.city} onChange={handlePersonalChange("city")} />
              </div>
              <div>
                <label className={labelCls}>Region *</label>
                <select className={inputCls} value={personal.region} onChange={handlePersonalChange("region")}>
                  <option value="">— Select region —</option>
                  {ESWATINI_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Section 2: School Details ───────────────────────────────────── */}
          <section className={sectionCls}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              2. School Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>High School Name *</label>
                <input className={inputCls} value={school.schoolName} onChange={handleSchoolChange("schoolName")} />
              </div>
              <div>
                <label className={labelCls}>School Region *</label>
                <select className={inputCls} value={school.schoolRegion} onChange={handleSchoolChange("schoolRegion")}>
                  <option value="">— Select region —</option>
                  {ESWATINI_REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Year Completed *</label>
                <input type="number" min="2015" max={new Date().getFullYear()} className={inputCls} value={school.yearCompleted} onChange={handleSchoolChange("yearCompleted")} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Candidate / Exam Number *</label>
                <input className={inputCls} value={school.candidateNumber} onChange={handleSchoolChange("candidateNumber")} placeholder="e.g. EGCSE-2025-012345" />
              </div>
            </div>
          </section>

          {/* ── Section 3: Subject Results ──────────────────────────────────── */}
          <section className={sectionCls}>
            <GradeRows
              value={gradeRows}
              onChange={setGradeRows}
              maxRows={MAX_ROWS}
              minRows={MIN_ROWS}
              disabled={submission.status === "submitting"}
            />
          </section>

          {/* ── Section 4: Declaration ──────────────────────────────────────── */}
          <section className={sectionCls}>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              4. Declaration
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                disabled={submission.status === "submitting"}
              />
              <span className="text-sm text-gray-600">
                I declare that the information provided is true and correct to the
                best of my knowledge. I understand that any false statement may
                result in the cancellation of my scholarship application.
              </span>
            </label>
          </section>

          {/* ── Error message ───────────────────────────────────────────────── */}
          {submission.status === "error" && (
            <div className="rounded-md bg-red-50 border border-red-300 p-4 text-sm text-red-700">
              <strong>Error:</strong> {submission.message}
            </div>
          )}

          {/* ── Submit button ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {!formValid && "Please complete all required fields and select at least " + MIN_ROWS + " subjects."}
            </p>
            <button
              type="submit"
              disabled={!formValid || submission.status === "submitting"}
              className="px-8 py-3 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submission.status === "submitting" ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
