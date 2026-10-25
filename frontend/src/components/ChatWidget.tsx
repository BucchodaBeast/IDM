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

function BotIcon({ size = 68 }: { size?: number }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bt-body" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#3fe0a0" /><stop offset="0.45" stopColor="#008853" /><stop offset="1" stopColor="#00492b" />
        </linearGradient>
        <linearGradient id="bt-edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#00623c" /><stop offset="1" stopColor="#002e1b" /></linearGradient>
        <linearGradient id="bt-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3636" /><stop offset="1" stopColor="#0b0909" /></linearGradient>
        <radialGradient id="bt-eye" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#d4ffe9" /><stop offset="0.5" stopColor="#3dffa6" /><stop offset="1" stopColor="#00b86b" /></radialGradient>
        <radialGradient id="bt-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#9bffd0" /><stop offset="0.6" stopColor="#008853" /><stop offset="1" stopColor="#00492b" /></radialGradient>
        <linearGradient id="bt-ear" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4a4444" /><stop offset="1" stopColor="#151212" /></linearGradient>
      </defs>
      <rect x="46.5" y="14" width="3" height="11" rx="1.5" fill="#1b1818" />
      <circle cx="48" cy="11" r="5.5" fill="url(#bt-ball)" />
      <circle cx="46" cy="9" r="1.6" fill="#fff" opacity="0.8" />
      <rect x="6" y="40" width="10" height="22" rx="5" fill="url(#bt-ear)" />
      <rect x="80" y="40" width="10" height="22" rx="5" fill="url(#bt-ear)" />
      <path d="M60 76 L76 76 L74 91 Z" fill="url(#bt-edge)" />
      <rect x="14" y="26" width="68" height="56" rx="25" fill="url(#bt-edge)" />
      <rect x="14" y="21" width="68" height="56" rx="25" fill="url(#bt-body)" />
      <path d="M26 33 Q48 20 70 33 Q48 27 26 33 Z" fill="#fff" opacity="0.45" />
      <ellipse cx="29" cy="44" rx="4" ry="9" fill="#fff" opacity="0.14" transform="rotate(12 29 44)" />
      <rect x="23" y="35" width="50" height="30" rx="15" fill="url(#bt-visor)" />
      <rect x="25" y="36.5" width="46" height="9" rx="4.5" fill="#fff" opacity="0.1" />
      <rect x="33" y="43" width="9" height="15" rx="4.5" fill="url(#bt-eye)" />
      <rect x="54" y="43" width="9" height="15" rx="4.5" fill="url(#bt-eye)" />
      <circle cx="36" cy="46.5" r="1.6" fill="#fff" opacity="0.9" />
      <circle cx="57" cy="46.5" r="1.6" fill="#fff" opacity="0.9" />
    </svg>
  );
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
      <button onClick={() => setOpen(true)} aria-label="Open chat with the IDM assistant" title="Ask IDM"
        className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 h-20 w-20 rounded-full">
        <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-2.5 w-11 rounded-full bg-black blur-[3px] animate-shadow" />
        <span className="absolute inset-x-0 top-0 flex justify-center animate-float">
          <span className="block transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
            <BotIcon />
          </span>
        </span>
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
