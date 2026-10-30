export type Status = "eligible" | "review" | "not_eligible";

export interface Applicant {
  olevel?: Record<string, string>;
  nsc?: { admission_level: string; subjects_passed: string[] };
  qualifications?: (string | { kind: string; field?: string })[];
  work_experience_years?: number;
  relevant_experience?: boolean;
  alevel_passes?: number;
  intake?: string;
}

export interface Mode { mode: string; duration: string }

export interface Result {
  programme_id: string;
  name: string;
  level: "degree" | "diploma" | "professional";
  status: Status;
  qualifies_via: string | null;
  blockers: string[];
  notes: string[];
  available_in_intake: boolean;
  modes: Mode[];
  routes?: { route_id: string; status: Status; reasons: string[]; provided: boolean }[];
}

export interface ProgrammeInfo { id: string; name: string; level: string; modes: Mode[] }

export interface Quote {
  programme_id: string;
  mode?: string;
  application_fee: number;
  tuition?: { annual?: number; semester?: number; total?: number };
  items?: { label: string; amount: number }[];
  listed_total?: number;
  ipm_subscription?: number;
  other_fees_to_confirm: Record<string, number>;
  notes: string[];
}

export interface ScholarshipSubjectIn { subject: string; grade: string; syllabus: string }
export interface ScholarshipResult {
  status: "qualifies" | "short" | "requirements_not_met";
  level: string;
  level_label: string;
  points: number;
  threshold: number;
  gap: number;
  subjects: { subject: string; grade: string; syllabus: string; points: number; counted: boolean }[];
  checks: { id: string; label: string; ok: boolean; detail: string }[];
  reminders: string[];
  source: string;
}

export interface VerifyCheck { id: string; label: string; status: "pass" | "review" | "fail"; detail: string }
export interface VerifyResult {
  status: "verified" | "review" | "rejected" | "unchecked";
  message: string;
  checks: VerifyCheck[];
  subjects_matched: string[];
}

export type ChatEvent =
  | { type: "token"; text: string }
  | { type: "status"; text: string }
  | { type: "sources"; titles: string[] }
  | { type: "error"; text: string }
  | { type: "done" };
export interface ChatMessage { role: "user" | "assistant"; content: string }
