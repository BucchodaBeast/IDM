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

export interface ScholarshipResult {
  status: "qualifies" | "short" | "scheme_not_configured";
  level: string;
  threshold: number;
  points?: number;
  gap?: number;
  message?: string;
}
