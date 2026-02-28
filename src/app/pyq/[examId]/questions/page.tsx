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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

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
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [examId, subject, chapter]);

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

  const startSingle = async (questionId: string) => {
    if (loadingId) return;
    setLoadingId(questionId);
    try {
      const res = await fetch("/api/pyq/custom-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: [questionId],
          title: title,
          durationMinutes: 30,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.testId) {
        router.push(`/cbt?testId=${data.testId}`);
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1218] text-white font-neue">
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-12 pt-6">
        <div className="mb-6 flex items-center gap-3 text-sm text-white/60">
          <Link className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30" href={`/pyq/${examId}`}>
            ← Back
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/80">{title}</span>
        </div>

        <div className="rounded-[6px] border border-white/10 bg-[#171c24] px-6 py-4">
          <p className="text-sm text-white/60">All PYQs</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
          <p className="mt-2 text-xs text-white/50">Showing {items.length} questions</p>
        </div>

        <div ref={listRef} className="mt-6 space-y-4">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => startSingle(item.id)}
              className="w-full rounded-[6px] border border-white/10 bg-[#171c24] px-5 py-4 text-left transition hover:border-white/30"
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
                <span className="text-[11px] text-white/50">
                  {loadingId === item.id ? "Opening..." : "Attempt"}
                </span>
              </div>
            </button>
          ))}

          {items.length === 0 && (
            <div className="rounded-[6px] border border-white/10 bg-[#171c24] px-5 py-6 text-sm text-white/60">
              No questions found for this chapter yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
