"use client";

import { useEffect, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatEvent = { type: "token" | "status" | "error"; text: string } | { type: "done" };
class ChatOffline extends Error {}

async function* chatStream(messages: ChatMessage[], context: unknown, signal: AbortSignal): AsyncGenerator<ChatEvent> {
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

const SUGGESTIONS = [
  "Which programmes can I apply for?",
  "What are the entry requirements for BSc IT?",
  "How much are the fees?",
  "How do I pay the application fee?",
];

function readContext() {
  try {
    const applicant = JSON.parse(localStorage.getItem("idm.applicant") ?? "null");
    const draft = JSON.parse(localStorage.getItem("idm.draft") ?? "null");
    return { applicant, programme: (draft?.programme as string) || null };
  } catch {
    return { applicant: null, programme: null };
  }
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, status]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(raw: string) {
    const q = raw.trim();
    if (!q || busy) return;
    const history: ChatMessage[] = [...msgs, { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setText(""); setError(""); setBusy(true); setStatus("Thinking...");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const append = (t: string) => setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x)));
    try {
      for await (const ev of chatStream(history.filter((m) => m.content), readContext(), ctrl.signal)) {
        if (ev.type === "token") { setStatus(""); append(ev.text); }
        else if (ev.type === "status") setStatus(ev.text);
        else if (ev.type === "error") setError(ev.text);
      }
    } catch (e) {
      if (e instanceof ChatOffline) setOffline(true);
      else if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false); setStatus("");
      setMsgs((m) => (m.length && m[m.length - 1].role === "assistant" && !m[m.length - 1].content ? m.slice(0, -1) : m));
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="Open chat with the IDM assistant"
        className="fixed bottom-4 right-4 z-40 h-12 rounded-full bg-brand px-5 font-bold text-white shadow-lg hover:bg-brand-deep">
        Ask IDM
      </button>
    );
  }

  return (
    <div role="dialog" aria-label="IDM assistant"
      className="fixed inset-0 z-50 flex flex-col bg-white sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[34rem] sm:w-96 sm:rounded-xl sm:border sm:border-line sm:shadow-2xl">
      <div className="flex items-center justify-between bg-brand-deep px-4 py-3 text-white sm:rounded-t-xl">
        <div>
          <p className="font-bold">IDM assistant</p>
          <p className="text-xs text-white/80">AI answers from the 2026/27 brochure. Admissions decides.</p>
        </div>
        <button onClick={() => { abortRef.current?.abort(); setOpen(false); }} aria-label="Close chat" className="h-11 w-11 rounded text-2xl hover:bg-white/10">×</button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-busy={busy}>
        {offline ? (
          <p className="rounded-md bg-paper p-3 text-sm">
            The assistant is offline right now. Please contact admissions: admissions@idmbls.ac.sz or +268 2550 4085.
          </p>
        ) : msgs.length === 0 ? (
          <div>
            <p className="mb-3 text-sm">Hi! Ask me about programmes, entry requirements, fees, the scholarship, or how to apply.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="min-h-11 rounded-md border border-line px-3 py-2 text-left text-sm font-medium hover:bg-paper">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-brand text-white" : "border border-line bg-paper"}`}>
                {m.content || "\u00a0"}
              </p>
            </div>
          ))
        )}
        {status && <p className="text-sm text-muted" aria-live="polite">{status}</p>}
        {error && <p role="alert" className="text-sm text-crimson">{error}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-line p-3">
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} disabled={offline}
          placeholder="Type your question" aria-label="Your question" className="h-11 min-w-0 flex-1 rounded-md border border-line px-3 text-base" />
        <button type="submit" disabled={busy || !text.trim() || offline}
          className="h-11 rounded-md bg-brand px-4 font-bold text-white hover:bg-brand-deep disabled:opacity-40">Send</button>
      </form>
    </div>
  );
}
