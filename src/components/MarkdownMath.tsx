"use client";

import { useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownMathProps = {
  text: string;
  className?: string;
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

const normalizeText = (value: string) =>
  value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\$/g, "$");

export default function MarkdownMath({ text, className }: MarkdownMathProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const normalized = useMemo(() => normalizeText(text ?? ""), [text]);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    ensureMathJax().then(() => {
      requestAnimationFrame(() => (window as any).MathJax?.typesetPromise?.([host]));
    });
  }, [normalized]);

  return (
    <div ref={ref} className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-[16px] leading-7">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          table: ({ children }) => (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3 py-2 text-left">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 align-top text-slate-700">{children}</td>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li className="text-[15px] leading-6">{children}</li>,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
