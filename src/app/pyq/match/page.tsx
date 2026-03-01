"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusher/client";

type ExamItem = {
  id: string;
  name: string;
};

type Participant = {
  userId: string;
  name: string;
  image: string | null;
  score: number;
  accuracy: number;
  correct: number;
  wrong: number;
  skipped: number;
};

type MatchQuestion = {
  id: string;
  prompt?: string | null;
  options?: unknown;
  questionType?: string | null;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  imageUrl?: string | null;
  cropX?: number | null;
  cropY?: number | null;
  cropW?: number | null;
  cropH?: number | null;
};

type MatchState = {
  room: {
    id: string;
    code: string;
    hostId: string;
    mode: string;
    visibility: string;
    examId: string | null;
    year: number | null;
    subject: string | null;
    questionCount: number;
    timeLimitMinutes: number;
    status: string;
    startAt: string | null;
    endAt: string | null;
  };
  participants: Participant[];
  questions: MatchQuestion[];
};

const optionLabels = ["A", "B", "C", "D", "E"] as const;

const ensureMathJax = (() => {
  let loading: Promise<void> | null = null;
  return () => {
    if (typeof window === "undefined") return Promise.resolve();
    if ((window as any).MathJax?.typesetPromise) return Promise.resolve();
    if (loading) return loading;
    (window as any).MathJax = {
      tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        processEscapes: true,
      },
      options: { skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"] },
    };
    loading = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
    return loading;
  };
})();

const cleanupLatex = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => ch.normalize("NFKC"))
    .replace(/\u0008/g, "\\b")
    .replace(/\u0009/g, "\\t")
    .replace(/\u000c/g, "\\f")
    .replace(/[\u0000-\u0007\u000b\u000e-\u001f]/g, "")
    .replace(/\p{Mn}/gu, "")
    .replace(/\p{Cf}/gu, "")
    .replace(/[\u2061-\u2064]/g, "")
    .replace(/\\\\/g, "\\")
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\u2212/g, "-")
    .replace(/[\u2010\u2011\u2012\u2013\u2014]/g, "-")
    .trim();

const MathBlock = ({ value, className }: { value: string; className?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = cleanupLatex(value || "");
    ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([ref.current]));
  }, [value]);
  return <div ref={ref} className={className} />;
};

const normalizeOptions = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const ordered = optionLabels
      .map((label) => record[label])
      .filter((item) => item !== undefined && item !== null)
      .map((item) => String(item));
    if (ordered.length) return ordered;
  }
  return [] as string[];
};

export default function PyqMatchPage() {
  const router = useRouter();
  const [examItems, setExamItems] = useState<ExamItem[]>([]);
  const [view, setView] = useState<"create" | "join" | "lobby" | "play" | "result">("create");
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [state, setState] = useState<MatchState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");

  const [form, setForm] = useState({
    examId: "",
    year: "",
    subject: "",
    questionCount: "20",
    timeLimitMinutes: "20",
    mode: "DUEL",
    visibility: "PRIVATE",
  });

  useEffect(() => {
    fetch("/api/pyq/exams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setExamItems(data);
          if (!form.examId && data.length) {
            setForm((prev) => ({ ...prev, examId: data[0].id }));
          }
        }
      })
      .catch(() => null);
  }, []);

  const loadState = async (code: string) => {
    const response = await fetch(`/api/matches/state?code=${encodeURIComponent(code)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as MatchState;
    setState(data);
    return data;
  };

  useEffect(() => {
    if (!roomCode) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(`match-${roomCode}`);
    const refresh = async () => {
      await loadState(roomCode);
    };
    channel.bind("room:update", refresh);
    channel.bind("match:started", async () => {
      const data = await loadState(roomCode);
      if (data?.room.status === "LIVE") setView("play");
    });
    channel.bind("score:update", (payload: { participants: Participant[] }) => {
      setState((prev) => (prev ? { ...prev, participants: payload.participants } : prev));
    });
    channel.bind("match:ended", async () => {
      await loadState(roomCode);
      setView("result");
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`match-${roomCode}`);
    };
  }, [roomCode]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/matches/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) return;
      const data = await response.json();
      setRoomCode(data.room.code);
      const nextState = await loadState(data.room.code);
      setState(nextState);
      setView("lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const response = await fetch("/api/matches/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode }),
      });
      if (!response.ok) return;
      const nextState = await loadState(roomCode);
      setState(nextState);
      setView(nextState?.room.status === "LIVE" ? "play" : "lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const response = await fetch("/api/matches/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode }),
      });
      if (response.ok) {
        const nextState = await loadState(roomCode);
        setState(nextState);
        setView("play");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      await fetch("/api/matches/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode }),
      });
      const nextState = await loadState(roomCode);
      setState(nextState);
      setView("result");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!roomCode || !state) return;
    const question = state.questions[currentIndex];
    if (!question) return;
    await fetch("/api/matches/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: roomCode,
        questionId: question.id,
        answer,
      }),
    });
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(() => {
    if (!state?.room.endAt) return null;
    const end = new Date(state.room.endAt).getTime();
    return Math.max(0, Math.floor((end - Date.now()) / 1000));
  }, [state?.room.endAt, tick]);

  const currentQuestion = state?.questions[currentIndex];
  const options = useMemo(() => normalizeOptions(currentQuestion?.options), [currentQuestion?.options]);

  return (
    <div className="min-h-screen bg-[#222830] text-white font-neue">
      <div className="mx-auto w-full max-w-[1100px] px-6 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">PYQ Bank</p>
            <h1 className="mt-2 text-3xl font-semibold">Custom Friend Match</h1>
            <p className="mt-1 text-sm text-white/60">Create a room, invite friends, and race live.</p>
          </div>
          <button
            className="text-xs uppercase tracking-[0.2em] text-white/50"
            onClick={() => router.push("/pyq")}
          >
            Back to PYQ
          </button>
        </div>

        <div className="mt-6 rounded-[10px] border border-white/10 bg-[#171c24] p-6">
          {view === "create" || view === "join" ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Create Match</h2>
                <div className="grid gap-3 text-sm">
                  <label className="space-y-1">
                    <span className="text-white/60">Exam</span>
                    <select
                      className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                      value={form.examId}
                      onChange={(event) => setForm((prev) => ({ ...prev, examId: event.target.value }))}
                    >
                      {examItems.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-white/60">Year (optional)</span>
                    <input
                      className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                      value={form.year}
                      onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
                      placeholder="2026"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-white/60">Subject (optional)</span>
                    <input
                      className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                      value={form.subject}
                      onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                      placeholder="Physics"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-white/60">Questions</span>
                      <input
                        className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                        value={form.questionCount}
                        onChange={(event) => setForm((prev) => ({ ...prev, questionCount: event.target.value }))}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-white/60">Time (mins)</span>
                      <input
                        className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                        value={form.timeLimitMinutes}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, timeLimitMinutes: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-white/60">Mode</span>
                      <select
                        className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                        value={form.mode}
                        onChange={(event) => setForm((prev) => ({ ...prev, mode: event.target.value }))}
                      >
                        <option value="DUEL">1v1 Duel</option>
                        <option value="GROUP">Group Battle</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-white/60">Visibility</span>
                      <select
                        className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                        value={form.visibility}
                        onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </label>
                  </div>
                </div>
                <button
                  className="rounded-md border border-white/10 bg-[#2a3f63] px-4 py-2 text-sm text-white"
                  disabled={loading}
                  onClick={handleCreate}
                >
                  {loading ? "Creating..." : "Create Match"}
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Join Match</h2>
                <input
                  className="w-full rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-white"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                />
                <button
                  className="rounded-md border border-white/10 bg-[#171c24] px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  disabled={loading}
                  onClick={handleJoin}
                >
                  {loading ? "Joining..." : "Join Match"}
                </button>
              </div>
            </div>
          ) : null}

          {view === "lobby" && state ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">Room Code</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{state.room.code}</h2>
                  <p className="mt-1 text-sm text-white/60">Share this code with friends.</p>
                </div>
                <div className="text-sm text-white/70">
                  {state.room.questionCount} Qs • {state.room.timeLimitMinutes} mins • {state.room.mode}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {state.participants.map((p) => (
                  <div key={p.userId} className="rounded-[8px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-white/50">Score {p.score}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-md border border-white/10 bg-[#2a3f63] px-4 py-2 text-sm text-white"
                  disabled={loading}
                  onClick={handleStart}
                >
                  {loading ? "Starting..." : "Start Match"}
                </button>
                <button
                  className="rounded-md border border-white/10 bg-[#171c24] px-4 py-2 text-sm text-white/70 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  onClick={() => setView("join")}
                >
                  Invite More
                </button>
              </div>
            </div>
          ) : null}

          {view === "play" && state && currentQuestion ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between text-sm text-white/70">
                <span>
                  Q {currentIndex + 1} / {state.questions.length}
                </span>
                <span>
                  Time left: {remaining !== null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "--"}
                </span>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#10141d] px-5 py-4">
                <MathBlock value={currentQuestion.prompt || "Question"} className="text-white text-base" />
                {options.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {options.map((opt, idx) => {
                      const label = optionLabels[idx] ?? String.fromCharCode(65 + idx);
                      return (
                        <button
                          key={label}
                          className={`rounded-[8px] border px-4 py-3 text-left text-sm ${
                            answer === label ? "border-white/60 bg-white/5" : "border-white/10 bg-[#0f141d]"
                          }`}
                          onClick={() => setAnswer(label)}
                        >
                          <span className="mr-2 text-xs text-white/60">{label}.</span>
                          <MathBlock value={opt} className="text-sm text-white/90" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-white/60">Options not available.</div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-md border border-white/10 bg-[#2a3f63] px-4 py-2 text-sm text-white"
                  onClick={handleSubmit}
                >
                  Submit Answer
                </button>
                <button
                  className="rounded-md border border-white/10 bg-[#171c24] px-4 py-2 text-sm text-white/70 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  onClick={() => {
                    setAnswer("");
                    setCurrentIndex((prev) => Math.min(prev + 1, state.questions.length - 1));
                  }}
                >
                  Next
                </button>
                <button
                  className="rounded-md border border-white/10 bg-[#171c24] px-4 py-2 text-sm text-white/70 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  onClick={handleEnd}
                >
                  End Match
                </button>
              </div>
              <div className="rounded-[8px] border border-white/10 bg-[#10141d] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Live Leaderboard</p>
                <div className="mt-3 space-y-2">
                  {state.participants.map((p) => (
                    <div key={p.userId} className="flex items-center justify-between text-sm text-white/80">
                      <span>{p.name}</span>
                      <span>{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {view === "result" && state ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Match Results</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {state.participants.map((p) => (
                  <div key={p.userId} className="rounded-[8px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <div className="text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-white/60">
                      Score {p.score} • Accuracy {p.accuracy}% • Correct {p.correct}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="rounded-md border border-white/10 bg-[#171c24] px-4 py-2 text-sm text-white/70 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                onClick={() => {
                  setView("create");
                  setState(null);
                  setRoomCode("");
                  setCurrentIndex(0);
                }}
              >
                Start New Match
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
