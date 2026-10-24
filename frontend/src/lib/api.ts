import type { Applicant, ProgrammeInfo, Quote, Result, ScholarshipResult } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const checkEligibility = (a: Applicant, signal?: AbortSignal) =>
  request<Result[]>("/api/eligibility", { method: "POST", body: JSON.stringify(a), signal });

export const getProgrammes = () => request<ProgrammeInfo[]>("/api/programmes");

export const getQuote = (id: string, mode?: string) =>
  request<Quote>(`/api/fees/${id}${mode ? `?mode=${mode}` : ""}`);

export const checkScholarship = (olevel: Record<string, string>, level: "diploma" | "degree") =>
  request<ScholarshipResult>("/api/scholarship", { method: "POST", body: JSON.stringify({ olevel, level }) });

export const money = (n: number) => `E${n.toLocaleString("en-ZA")}`;
export const modeLabel = (m: string) => (m === "full_time" ? "Full time" : "Part time");
