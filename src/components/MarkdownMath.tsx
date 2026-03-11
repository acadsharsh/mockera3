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

const normalizeText = (value: string) => {
  const unescaped = value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\$/g, "$");
  const normalizedLatex = unescaped
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, content) => `$${content}$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, content) => `$$${content}$$`);
  // Auto-wrap bracketed dimension expressions like [L^2 T^{-2} K^{-1}] in math delimiters.
  return normalizedLatex.replace(/(^|[^$])(\[[^\]\n]*[\^_][^\]\n]*\])/g, (_match, lead, bracket) => {
    return `${lead}$${bracket}$`;
  });
};

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

  const components = {
    p: ({ children }: { children: React.ReactNode }) => <p className="text-[16px] leading-7">{children}</p>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
    table: ({ children }: { children: React.ReactNode }) => (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children: React.ReactNode }) => (
      <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
        {children}
      </thead>
    ),
    th: ({ children }: { children: React.ReactNode }) => <th className="px-3 py-2 text-left">{children}</th>,
    td: ({ children }: { children: React.ReactNode }) => <td className="px-3 py-2 align-top text-slate-700">{children}</td>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal space-y-1 pl-6">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="text-[15px] leading-6">{children}</li>,
  } as any;

  return (
    <div ref={ref} className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
