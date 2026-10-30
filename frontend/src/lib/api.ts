import type { Applicant, ProgrammeInfo, Quote, Result, ScholarshipResult, ScholarshipSubjectIn, VerifyResult, ChatEvent, ChatMessage } from "./types";

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

export const checkScholarship = (subjects: ScholarshipSubjectIn[], level: "diploma" | "degree" | "external") =>
  request<ScholarshipResult>("/api/scholarship", { method: "POST", body: JSON.stringify({ subjects, level }) });

export const money = (n: number) => `E${n.toLocaleString("en-ZA")}`;
export const modeLabel = (m: string) => (m === "full_time" ? "Full time" : "Part time");

export async function verifyDocument(
  docType: "certificates" | "national_id", file: File,
  fullName: string, nationalId: string, grades: Record<string, string>,
): Promise<VerifyResult> {
  const body = new FormData();
  body.set("doc_type", docType);
  body.set("full_name", fullName);
  body.set("national_id", nationalId);
  body.set("claimed_grades", JSON.stringify(grades));
  body.set("file", file);
  const res = await fetch(BASE + "/api/documents/verify", { method: "POST", body });
  if (res.status === 429) throw new Error("Too many uploads. Try again in a while.");
  if (!res.ok) {
    const detail = (await res.json().catch(() => null))?.detail;
    throw new Error(typeof detail === "string" ? detail : "Upload failed. Try again.");
  }
  return res.json();
}

export class ChatOffline extends Error {}

export async function* chatStream(
  messages: ChatMessage[], context: { applicant: unknown; programme: string | null }, signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(BASE + "/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" }, signal,
    body: JSON.stringify({ messages, context }),
  });
  if (res.status === 503) throw new ChatOffline();
  if (res.status === 429) throw new Error("You have sent a lot of messages. Please try again later.");
  if (!res.ok || !res.body) throw new Error("The assistant is unavailable right now.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try { yield JSON.parse(line.slice(5)) as ChatEvent; } catch { /* ignore a broken event */ }
    }
  }
}
