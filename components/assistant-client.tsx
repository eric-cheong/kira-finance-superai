"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, Icon, Notice } from "@/components/ui";
import { cn } from "@/components/ui/cn";

type KnowledgeEntry = {
  id: string;
  title: string;
  route: string;
  category: "workflow" | "policy" | "data" | "ai" | "settings";
  summary: string;
};

type AssistantOutput = {
  understoodRequest: string;
  intent: string;
  answer: string;
  routeSuggestion: { label: string; href: string; reason: string } | null;
  actionClass: string;
  approvalTier: 1 | 2 | 3 | 4;
  confidence: number;
  sources: Array<{ title: string; route: string }>;
  trace: string[];
};

type AssistantResponse = {
  provider: "openai-agents" | "local-fallback";
  model: string | null;
  output: AssistantOutput;
  knowledgeBase: KnowledgeEntry[];
};

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
  readonly resultIndex: number;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type RealtimeSessionHandle = {
  connect: (options: { apiKey: string }) => Promise<void>;
  close: () => void;
  interrupt: () => void;
  sendMessage: (message: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const PROMPTS = [
  "What should I do about open approvals?",
  "Find where transaction matching lives",
  "Can Kira book my Singapore trip?",
  "Explain the e-invoice approval boundary",
];

function getSpeechConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as WindowWithSpeech;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.96;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function AssistantClient() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("What should I look at next?");
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const realtimeSessionRef = useRef<RealtimeSessionHandle | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const speechSupported = useMemo(() => typeof window !== "undefined" && Boolean(getSpeechConstructor()), []);
  const answer = result?.output.answer ?? "Ask Kira about a workflow, policy boundary, route, or what to do next. The bot grounds answers in the local knowledge base.";

  useEffect(() => {
    if (!open || knowledge.length > 0) return;
    fetch("/api/assistant")
      .then((response) => response.json())
      .then((payload) => {
        if (payload.ok) setKnowledge(payload.data.knowledgeBase);
      })
      .catch(() => setKnowledge([]));
  }, [open, knowledge.length]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      realtimeSessionRef.current?.close();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [open]);

  async function submit(nextMessage = message, mode: "text" | "voice" = "text") {
    const clean = nextMessage.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    setVoiceStatus("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, mode, transcript: mode === "voice" ? clean : undefined, route: pathname }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "Assistant request failed.");
      setResult(payload.data);
      setKnowledge(payload.data.knowledgeBase ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant request failed.");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function startListening() {
    const SpeechRecognition = getSpeechConstructor();
    if (!SpeechRecognition) {
      setVoiceStatus("Voice input is not available in this browser. Type the request instead.");
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      if (transcript.trim()) setMessage(transcript.trim());
      const finalResult = Array.from({ length: event.results.length }, (_, index) => event.results[index]).some((item) => item.isFinal);
      if (finalResult && transcript.trim()) void submit(transcript.trim(), "voice");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setVoiceStatus("Voice capture stopped. Check microphone permission and try again.");
    };
    recognitionRef.current = recognition;
    setListening(true);
    setVoiceStatus("Listening for your request...");
    try {
      recognition.start();
    } catch {
      setListening(false);
      setVoiceStatus("Voice capture could not start. Check microphone permission and try again.");
    }
  }

  async function toggleRealtimeVoice() {
    if (realtimeSessionRef.current) {
      realtimeSessionRef.current.close();
      realtimeSessionRef.current = null;
      setRealtimeConnected(false);
      setVoiceStatus("Live voice ended.");
      return;
    }

    setVoiceStatus("Starting live voice...");
    try {
      const response = await fetch("/api/assistant/voice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route: pathname }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? "Realtime voice unavailable.");
      const [{ RealtimeAgent, RealtimeSession, tool }, { z }] = await Promise.all([
        import("@openai/agents/realtime"),
        import("zod"),
      ]);
      const queryKiraKnowledge = tool({
        name: "query_kira_knowledge",
        description: "Read Kira's visible product knowledge base before answering route, workflow, or policy questions.",
        parameters: z.object({ query: z.string().min(1).max(300) }),
        async execute({ query }: { query: string }) {
          const knowledgeResponse = await fetch("/api/assistant", { cache: "no-store" });
          const knowledgePayload = await knowledgeResponse.json();
          if (!knowledgePayload.ok) return JSON.stringify({ query, entries: [] });
          return JSON.stringify({
            query,
            entries: knowledgePayload.data.knowledgeBase,
            workspace: knowledgePayload.data.workspace,
          });
        },
      });
      const agent = new RealtimeAgent({
        name: "Kira live voice",
        voice: "marin",
        instructions: [
          "You are Kira's live voice assistant for a finance workspace.",
          "Use query_kira_knowledge before answering workflow, route, or policy questions.",
          "Keep answers short and spoken. Ask a clarifying question when needed.",
          "Never claim you can move money, book suppliers, submit live regulator data, issue cards, execute FX, or place trades.",
        ].join(" "),
        tools: [queryKiraKnowledge],
      });
      const session = new RealtimeSession(agent, {
        model: payload.data.realtime.model,
        workflowName: "Kira live voice assistant",
        groupId: "kira-assistant",
      }) as RealtimeSessionHandle;
      session.on("error", () => {
        setRealtimeConnected(false);
        setVoiceStatus("Live voice disconnected. Check provider access and microphone permission.");
      });
      session.on("agent_end", (_context, _agent, transcript) => {
        if (typeof transcript === "string" && transcript.trim()) {
          setVoiceStatus(transcript.trim().slice(0, 180));
        }
      });
      await session.connect({ apiKey: payload.data.realtime.clientSecret });
      realtimeSessionRef.current = session;
      setRealtimeConnected(true);
      setVoiceStatus("Live voice is connected. Speak naturally; Kira will answer with audio.");
    } catch (err) {
      realtimeSessionRef.current?.close();
      realtimeSessionRef.current = null;
      setRealtimeConnected(false);
      setVoiceStatus(err instanceof Error ? err.message : "Realtime voice unavailable.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close Kira assistant" : "Open Kira assistant"}
        className="btn-lift fixed bottom-4 right-4 z-30 inline-flex h-12 min-h-12 w-12 items-center justify-center rounded-full border border-transparent bg-brand-strong text-on-brand shadow-btn transition hover:bg-brand-strong-hover hover:shadow-btn-hover sm:bottom-5 sm:right-5"
      >
        <Icon name="bot" size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-20 sm:right-5 sm:w-[430px] sm:px-0 sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kira-assistant-title"
        >
          <Card className="max-h-[calc(100dvh-5.75rem)] overflow-hidden rounded-b-none p-0 shadow-pop sm:max-h-[min(760px,calc(100dvh-96px))] sm:rounded-lg">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon name="bot" size={16} className="text-brand" />
                  <h2 id="kira-assistant-title" className="text-[15px] font-semibold text-ink">Kira AI bot</h2>
                  <Badge variant={result?.provider === "openai-agents" ? "pos" : "neutral"} dot>
                    {result?.provider === "openai-agents" ? "Agent SDK" : "local"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  Understands requests, routes users, and explains policy boundaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Kira assistant"
                className="btn-lift inline-flex h-11 min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-muted transition hover:bg-surface-2/70 hover:text-ink sm:h-10 sm:min-h-10 sm:w-10"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="max-h-[calc(100dvh-11.5rem)] overflow-y-auto px-4 py-4 sm:max-h-[calc(100dvh-190px)]">
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-surface-2/45 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="info">intent: {result?.output.intent ?? "ready"}</Badge>
                    <Badge variant={result?.output.actionClass === "prohibited" ? "crit" : result?.output.actionClass === "human-approved" ? "warn" : "neutral"}>
                      {result?.output.actionClass ?? "read-only"}
                    </Badge>
                    <Badge variant="neutral">T{result?.output.approvalTier ?? 1}</Badge>
                    {result && <Badge variant="brand">{result.output.confidence}% confidence</Badge>}
                  </div>
                  {result?.output.understoodRequest && (
                    <p className="mb-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-[12px] leading-relaxed text-muted">
                      Understood: <span className="text-ink">{result.output.understoodRequest}</span>
                    </p>
                  )}
                  <p className="text-[13px] leading-relaxed text-ink-2">{answer}</p>
                  {result?.output.routeSuggestion && (
                    <Link
                      href={result.output.routeSuggestion.href}
                      className="btn-lift mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-ink shadow-card transition hover:border-border-strong hover:bg-surface-2/60 sm:min-h-10"
                      onClick={() => setOpen(false)}
                    >
                      <Icon name="arrowRight" size={14} />
                      {result.output.routeSuggestion.label}
                    </Link>
                  )}
                </div>

                <form onSubmit={onSubmit} className="space-y-2">
                  <label className="sr-only" htmlFor="kira-assistant-request">Ask Kira</label>
                  <textarea
                    id="kira-assistant-request"
                    ref={inputRef}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-brand/45 focus:ring-4 focus:ring-brand/10"
                    placeholder="Ask what to do next, where a workflow lives, or whether an action is allowed..."
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="submit" variant="primary" size="sm" icon="send" disabled={busy}>
                      {busy ? "Asking" : "Ask"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" icon="mic" disabled={busy || listening} onClick={startListening}>
                      {listening ? "Live" : "Voice"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" icon="volume" onClick={() => {
                      if (!speak(answer)) setVoiceStatus("Read-aloud is not available in this browser.");
                    }}>
                      Speak
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={realtimeConnected ? "danger" : "outline"} size="sm" icon="mic" disabled={busy} onClick={toggleRealtimeVoice}>
                      {realtimeConnected ? "End live" : "Live voice"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" icon="close" disabled={!realtimeConnected} onClick={() => realtimeSessionRef.current?.interrupt()}>
                      Stop audio
                    </Button>
                  </div>
                </form>

                <div className="flex flex-wrap gap-1.5">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => {
                        setMessage(prompt);
                        void submit(prompt);
                      }}
                      className="btn-lift inline-flex min-h-11 sm:min-h-9 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-[12px] text-muted transition hover:border-border-strong hover:bg-surface-2/60 hover:text-ink"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {(error || voiceStatus) && (
                  <Notice icon={error ? "alert" : "mic"} variant={error ? "crit" : "info"}>
                    {error || voiceStatus}
                  </Notice>
                )}

                <div className="rounded-lg border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                      <Icon name="bookOpen" size={14} />
                      Knowledge base
                    </div>
                    <button
                      type="button"
                      onClick={toggleRealtimeVoice}
                      className={cn(
                        "btn-lift inline-flex min-h-11 sm:min-h-9 items-center rounded-full border border-border px-3 py-1 text-[12px] font-medium text-muted transition hover:border-border-strong hover:bg-surface-2/60 hover:text-ink",
                        realtimeConnected && "border-pos-fg/20 bg-pos-bg text-ink",
                        !speechSupported && !realtimeConnected && "border-warn-fg/20 bg-warn-bg text-ink",
                      )}
                    >
                      {realtimeConnected ? "Live voice on" : "Live voice"}
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {knowledge.slice(0, 5).map((entry) => (
                      <Link
                        key={entry.id}
                        href={entry.route}
                        onClick={() => setOpen(false)}
                        className="block min-h-11 rounded-lg border border-border bg-surface-2/35 px-3 py-2.5 transition hover:border-border-strong hover:bg-surface-2/70 sm:min-h-10"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-ink">{entry.title}</span>
                          <span className="shrink-0 text-[12px] text-faint">{entry.route}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{entry.summary}</p>
                      </Link>
                    ))}
                    {knowledge.length === 0 && (
                      <p className="rounded-lg border border-border bg-surface-2/35 px-3 py-3 text-[12px] text-muted">
                        Open the assistant or ask a question to load the local knowledge base.
                      </p>
                    )}
                  </div>
                </div>

                {result && (
                  <div className="rounded-lg border border-border bg-surface-2/35 p-3">
                    {result.output.sources.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[12px] font-semibold text-ink">Sources</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.output.sources.map((source) => (
                            <Link
                              key={`${source.title}-${source.route}`}
                              href={source.route}
                              onClick={() => setOpen(false)}
                              className="btn-lift inline-flex min-h-11 sm:min-h-9 items-center rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-muted transition hover:border-border-strong hover:bg-surface-2/60 hover:text-ink"
                            >
                              {source.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="mb-2 text-[12px] font-semibold text-ink">Agent trace</p>
                    <ol className="space-y-1.5">
                      {result.output.trace.map((step) => (
                        <li key={step} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted">
                          <Icon name="dot" size={10} className="mt-1.5 shrink-0 text-faint" />
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
