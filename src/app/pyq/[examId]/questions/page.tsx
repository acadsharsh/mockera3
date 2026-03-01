"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type QuestionItem = {
  id: string;
  prompt?: string | null;
  subject?: string | null;
  chapter?: string | null;
  topic?: string | null;
  test?: { id: string; title?: string | null; year?: number | null; shift?: string | null; exam?: string | null };
};

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

export default function PyqChapterQuestions({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const subject = searchParams.get("subject") ?? "";
  const chapter = searchParams.get("chapter") ?? "";
  const [items, setItems] = useState<QuestionItem[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const cacheKey = useMemo(
    () => `pyq_list_v1_${examId}_${subject}_${chapter}`,
    [examId, subject, chapter]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ts: number; items: QuestionItem[] };
      if (!parsed || !Array.isArray(parsed.items)) return;
      const fresh = Date.now() - parsed.ts < 5 * 60 * 1000;
      if (fresh) setItems(parsed.items);
    } catch {
      // ignore cache errors
    }
  }, [cacheKey]);

  useEffect(() => {
    let active = true;
    const url = new URL(`/api/pyq/questions`, window.location.origin);
    url.searchParams.set("examId", examId);
    if (subject) url.searchParams.set("subject", subject);
    if (chapter) url.searchParams.set("chapter", chapter);
    url.searchParams.set("limit", "200");
    fetch(url.toString())
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: nextItems }));
        } catch {
          // ignore cache errors
        }
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [examId, subject, chapter, cacheKey]);

  useEffect(() => {
    if (!items.length) return;
    const host = listRef.current;
    if (!host) return;
    ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([host]));
  }, [items]);

  const title = useMemo(() => {
    if (subject && chapter) return `${subject} > ${chapter}`;
    if (subject) return `${subject} PYQs`;
    return "All PYQs";
  }, [subject, chapter]);

  const topicCount = useMemo(() => {
    const set = new Set(items.map((item) => item.topic).filter(Boolean));
    return set.size;
  }, [items]);

  const goToQuestion = (questionId: string) => {
    const next = new URLSearchParams();
    if (subject) next.set("subject", subject);
    if (chapter) next.set("chapter", chapter);
    const query = next.toString();
    router.push(query ? `/pyq/${examId}/questions/${questionId}?${query}` : `/pyq/${examId}/questions/${questionId}`);
  };

  const prefetchQuestion = (questionId: string) => {
    if (prefetchedRef.current.has(questionId)) return;
    prefetchedRef.current.add(questionId);
    const next = new URLSearchParams();
    if (subject) next.set("subject", subject);
    if (chapter) next.set("chapter", chapter);
    const query = next.toString();
    const path = query ? `/pyq/${examId}/questions/${questionId}?${query}` : `/pyq/${examId}/questions/${questionId}`;
    router.prefetch(path);
    fetch(`/api/pyq/questions/${questionId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.item) return;
        try {
          window.localStorage.setItem(
            `pyq_question_v1_${questionId}`,
            JSON.stringify({ ts: Date.now(), item: data.item, stats: data.stats ?? null })
          );
        } catch {
          // ignore cache errors
        }
      })
      .catch(() => null);
  };

  return (
    <div className="min-h-screen bg-[#222830] text-white font-neue">
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-12 pt-6">
        <div className="mb-6 flex items-center gap-3 text-sm text-white/60">
          <Link className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30" href={`/pyq/${examId}`}>
            {"<-"} Back
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/80">{title}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[6px] border border-white/10 bg-[#222830] p-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
              <div className="text-sm font-semibold text-white">{chapter || "All PYQs"}</div>
              <div className="mt-2 text-xs text-white/50">
                {itemCountText(items.length, topicCount)}
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href={`/pyq/${examId}`}
                className="flex items-center justify-between rounded-[6px] border border-white/10 bg-[#171c24] px-4 py-3 text-sm text-white/80 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
              >
                Overview
                <span>{">"}</span>
              </Link>
              <div className="flex items-center justify-between rounded-[6px] border border-white/30 bg-white text-[#0f1218] px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                All PYQs
                <span>{">"}</span>
              </div>
              <div className="flex items-center justify-between rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 text-sm text-white/50 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                Topic-wise PYQs
                <span>{">"}</span>
              </div>
              <div className="flex items-center justify-between rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 text-sm text-white/50 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                Bookmarked Qs
                <span>{">"}</span>
              </div>
              <div className="flex items-center justify-between rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 text-sm text-white/50 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                My Mistakes
                <span>{">"}</span>
              </div>
            </div>
          </aside>

          <section className="flex min-h-[calc(100vh-180px)] flex-col space-y-4">
            <div className="rounded-[6px] border border-white/10 bg-[#222830] px-6 py-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
              <p className="text-sm text-white/60">All PYQs</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Filter</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Years</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Difficulty</span>
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Showing all Qs ({items.length})</span>
              <button className="text-xs uppercase tracking-[0.2em] text-[#6aa8ff]">Sort</button>
            </div>

            <div
              ref={listRef}
              className="rounded-[10px] border border-white/10 bg-transparent p-3 pr-2"
            >
              <div
                className="space-y-4 overflow-y-auto pr-2"
                style={{ maxHeight: "calc(100vh - 360px)", minHeight: "360px" }}
              >
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => prefetchQuestion(item.id)}
                  onClick={() => goToQuestion(item.id)}
                  className="w-full rounded-[6px] border border-white/10 bg-[#222830] px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)] active:translate-y-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-xs text-white/70">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {cleanupLatex(item.prompt || "").slice(0, 220) || "Question"}
                      </p>
                      <p className="mt-2 text-xs text-white/50">
                        {item.test?.exam ?? ""} {item.test?.year ? `${item.test?.year}` : ""} {item.test?.shift ? `(${item.test?.shift})` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-white/50">Attempt</span>
                  </div>
                </button>
              ))}

              {items.length === 0 && (
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-5 py-6 text-sm text-white/60">
                  No questions found for this chapter yet.
                </div>
              )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function itemCountText(questionCount: number, topicCount: number) {
  const questions = `${questionCount} PYQs`;
  const topics = `${topicCount} Topics`;
  return [questions, topics].filter(Boolean).join(" | ");
}
