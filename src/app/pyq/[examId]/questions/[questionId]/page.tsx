"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type QuestionDetail = {
  id: string;
  prompt?: string | null;
  solution?: string | null;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  questionType?: string | null;
  options?: unknown;
  correctOption?: string | null;
  correctNumeric?: string | null;
  test?: { id: string; title?: string | null; year?: number | null; shift?: string | null; exam?: string | null };
};

type OptionStats = {
  value: string;
  count: number;
  percent: number;
};

type QuestionStats = {
  total: number;
  distribution: OptionStats[];
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

const formatElapsed = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const normalizeOptions = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
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

const MathBlock = ({ value, className }: { value: string; className?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.textContent = cleanupLatex(value || "");
    ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([ref.current]));
  }, [value]);
  return <div ref={ref} className={className} />;
};

export default function PyqQuestionAttempt({
  params,
}: {
  params: Promise<{ examId: string; questionId: string }>;
}) {
  const { examId, questionId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const subject = searchParams.get("subject") ?? "";
  const chapter = searchParams.get("chapter") ?? "";
  const topic = searchParams.get("topic") ?? "";

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [answer, setAnswer] = useState<string>("");
  const [showAnswer, setShowAnswer] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setQuestion(null);
    fetch(`/api/pyq/questions/${questionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setQuestion(data?.item ?? null);
        setStats(data?.stats ?? null);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [questionId]);

  useEffect(() => {
    let active = true;
    const url = new URL(`/api/pyq/questions`, window.location.origin);
    url.searchParams.set("examId", examId);
    if (subject) url.searchParams.set("subject", subject);
    if (chapter) url.searchParams.set("chapter", chapter);
    if (topic) url.searchParams.set("topic", topic);
    url.searchParams.set("limit", "200");
    fetch(url.toString())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const ids = Array.isArray(data.items) ? data.items.map((item: QuestionDetail) => item.id) : [];
        setQuestionIds(ids);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [examId, subject, chapter, topic]);

  useEffect(() => {
    setElapsed(0);
    setAnswer("");
    setShowAnswer(false);
    const timer = window.setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => window.clearInterval(timer);
  }, [questionId]);

  useEffect(() => {
    if (!question || !containerRef.current) return;
    ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([containerRef.current]));
  }, [question]);

  const questionIndex = useMemo(() => questionIds.findIndex((id) => id === questionId), [questionIds, questionId]);
  const questionNumber = questionIndex >= 0 ? questionIndex + 1 : 1;
  const prevId = questionIndex > 0 ? questionIds[questionIndex - 1] : null;
  const nextId = questionIndex >= 0 && questionIndex < questionIds.length - 1 ? questionIds[questionIndex + 1] : null;

  const options = useMemo(() => normalizeOptions(question?.options), [question?.options]);
  const isNumeric = question?.questionType === "NUM";
  const isMulti = question?.questionType === "MSQ";
  const metaLine = useMemo(() => {
    if (!question?.test) return subject || "PYQ";
    const meta = `${question.test.exam ?? "PYQ"}${question.test.year ? ` ${question.test.year}` : ""}`;
    const shift = question.test.shift ? ` (${question.test.shift})` : "";
    return `${meta}${shift}`;
  }, [question?.test, subject]);

  const goToQuestion = (id: string | null) => {
    if (!id) return;
    const next = new URLSearchParams();
    if (subject) next.set("subject", subject);
    if (chapter) next.set("chapter", chapter);
    if (topic) next.set("topic", topic);
    const query = next.toString();
    router.push(query ? `/pyq/${examId}/questions/${id}?${query}` : `/pyq/${examId}/questions/${id}`);
  };

  const correctAnswer = useMemo(() => {
    if (!question) return "";
    if (question.questionType === "NUM") return question.correctNumeric ?? "";
    return question.correctOption ?? "";
  }, [question]);

  const correctSet = useMemo(() => {
    if (!correctAnswer) return new Set<string>();
    return new Set(
      correctAnswer
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }, [correctAnswer]);

  const selectedSet = useMemo(() => {
    if (!answer) return new Set<string>();
    return new Set(
      answer
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }, [answer]);

  const statsByValue = useMemo(() => {
    const map = new Map<string, OptionStats>();
    (stats?.distribution ?? []).forEach((entry) => {
      map.set(entry.value, entry);
    });
    return map;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#0f1218] text-white font-neue">
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-12 pt-6">
        <div className="mb-6 flex items-center justify-between text-sm text-white/60">
          <div className="flex items-center gap-3">
            <Link className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30" href={`/pyq/${examId}/questions?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`}>
              {"<-"} Back
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white/80">{subject || "PYQ"}</span>
            {chapter ? <span className="text-white/50">{" >> "}{chapter}</span> : null}
          </div>
          <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-white/30">
            Settings
          </button>
        </div>

        <div className="rounded-[8px] border border-white/10 bg-[#171c24] px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
            <div>
              <span className="text-white/70">Q {questionNumber}</span>
              <span className="ml-3">{metaLine}</span>
            </div>
            <div className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
              {formatElapsed(elapsed)}
            </div>
          </div>

          <div ref={containerRef} className="mt-4 space-y-6">
            <MathBlock value={question?.prompt ?? "Loading question..."} className="text-base text-white" />

            {isNumeric ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-white/50">Numeric Answer</label>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    className="w-full max-w-[240px] rounded-md border border-white/10 bg-[#10141d] px-3 py-2 text-white outline-none focus:border-white/40"
                    placeholder="Enter answer"
                  />
                </div>
                {stats?.distribution?.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {stats.distribution.slice(0, 4).map((entry) => {
                      const showMarked = showAnswer && answer.trim() === entry.value;
                      const showCorrect = showAnswer && correctAnswer && correctAnswer.trim() === entry.value;
                      return (
                        <div
                          key={entry.value}
                          className={`rounded-[12px] border px-4 py-4 text-left ${
                            showCorrect
                              ? "border-emerald-400/70 bg-emerald-400/10"
                              : showMarked
                              ? "border-rose-400/70 bg-rose-400/10"
                              : "border-white/10 bg-[#10141d]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-xs text-white/80">
                                {entry.percent ? `${entry.percent}%` : "--"}
                              </span>
                              <div className="text-sm font-semibold text-white">{entry.value}</div>
                            </div>
                            {showCorrect && (
                              <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-[#0b1118]">
                                Correct
                              </span>
                            )}
                            {showMarked && (
                              <span className="rounded-full bg-rose-400 px-3 py-1 text-[11px] font-semibold text-[#0b1118]">
                                You Marked
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {options.length ? (
                  options.map((option, index) => {
                    const label = optionLabels[index] ?? String.fromCharCode(65 + index);
                    const isSelected = isMulti ? selectedSet.has(label) : answer === label;
                    const isCorrect = correctSet.has(label);
                    const statsEntry = statsByValue.get(label);
                    const percent = statsEntry?.percent ?? 0;
                    const showMarked = showAnswer && isSelected && !isCorrect;
                    const showCorrect = showAnswer && isCorrect;
                    return (
                      <button
                        key={`${label}-${index}`}
                        type="button"
                        onClick={() => {
                          if (isMulti) {
                            const next = new Set(selectedSet);
                            if (next.has(label)) {
                              next.delete(label);
                            } else {
                              next.add(label);
                            }
                            setAnswer(Array.from(next).sort().join(","));
                            return;
                          }
                          setAnswer(label);
                        }}
                        className={`rounded-[12px] border px-4 py-4 text-left transition ${
                          showCorrect
                            ? "border-emerald-400/70 bg-emerald-400/10"
                            : showMarked
                            ? "border-rose-400/70 bg-rose-400/10"
                            : isSelected
                            ? "border-white/60 bg-white/5"
                            : "border-white/10 bg-[#10141d]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5 text-xs text-white/80">
                              {percent ? `${percent}%` : "--"}
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {label}
                              </div>
                              <MathBlock value={option} className="text-sm text-white/90" />
                            </div>
                          </div>
                          {showCorrect && (
                            <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-[#0b1118]">
                              Correct
                            </span>
                          )}
                          {showMarked && (
                            <span className="rounded-full bg-rose-400 px-3 py-1 text-[11px] font-semibold text-[#0b1118]">
                              You Marked
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[8px] border border-white/10 bg-[#10141d] px-4 py-3 text-sm text-white/60">
                    Options not available.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => goToQuestion(prevId)}
            disabled={!prevId}
            className="min-w-[160px] rounded-[10px] border border-white/10 bg-[#171c24] px-6 py-3 text-sm text-white/60 disabled:opacity-40"
          >
            Previous
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAnswer((prev) => !prev)}
              className="min-w-[180px] rounded-[10px] border border-white/10 bg-[#2a3f63] px-6 py-3 text-sm text-white"
            >
              Check Answer
            </button>
            <button
              type="button"
              onClick={() => goToQuestion(nextId)}
              disabled={!nextId}
              className="min-w-[160px] rounded-[10px] border border-white/10 bg-[#171c24] px-6 py-3 text-sm text-white/90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {showAnswer && correctAnswer ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-[8px] border border-white/10 bg-[#171c24] px-4 py-3 text-sm text-white/80">
              Correct answer: <span className="font-semibold text-white">{correctAnswer}</span>
            </div>
            {question?.solution ? (
              <div className="rounded-[8px] border border-white/10 bg-[#171c24] px-4 py-4 text-sm text-white/80">
                <div className="text-xs uppercase tracking-[0.2em] text-white/50">Solution</div>
                <MathBlock value={question.solution} className="mt-2 text-sm text-white/90" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
