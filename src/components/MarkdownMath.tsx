"use client";

import { useEffect, useMemo, useRef } from "react";

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
    // Normalize dollar-delimited math to MathJax's \\( \\) / \\[ \\] so markdown doesn't interfere.
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, content) => `\\[${content}\\]`)
    .replace(/(^|[^\\])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_match, lead, content) => `${lead}\\(${content}\\)`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, content) => `\\(${content}\\)`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, content) => `\\[${content}\\]`);
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

  const paragraphs = useMemo(() => normalized.split(/\n{2,}/g).filter(Boolean), [normalized]);

  return (
    <div ref={ref} className={className}>
      {paragraphs.length ? (
        paragraphs.map((para, idx) => {
          const lines = para.split(/\n/);
          return (
            <p key={`${para}-${idx}`} className="text-[16px] leading-7">
              {lines.map((line, lineIdx) => (
                <span key={`${line}-${lineIdx}`}>
                  {line}
                  {lineIdx < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          );
        })
      ) : (
        <p className="text-[16px] leading-7">{normalized}</p>
      )}
    </div>
  );
}
