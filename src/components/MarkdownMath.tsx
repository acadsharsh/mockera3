"use client";

import { useEffect, useMemo, useRef } from "react";

type MarkdownMathProps = {
  text: string;
  className?: string;
};

type TextBlock =
  | { type: "text"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

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

const isTableSeparator = (line: string) => /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);

const parseTableRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const parseBlocks = (value: string): TextBlock[] => {
  const blocks = value.split(/\n{2,}/g).map((block) => block.trim()).filter(Boolean);
  const parsed: TextBlock[] = [];

  blocks.forEach((block) => {
    const lines = block.split(/\n/).filter((line) => line.trim().length > 0);
    if (lines.length >= 2 && lines[0].includes("|") && isTableSeparator(lines[1])) {
      const headers = parseTableRow(lines[0]);
      const rows = lines.slice(2).map(parseTableRow);
      parsed.push({ type: "table", headers, rows });
      return;
    }
    parsed.push({ type: "text", lines });
  });

  return parsed.length ? parsed : [{ type: "text", lines: [value] }];
};

const renderBold = (text: string) => {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={`${part}-${idx}`} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
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

  const blocks = useMemo(() => parseBlocks(normalized), [normalized]);

  return (
    <div ref={ref} className={className}>
      {blocks.map((block, idx) => {
        if (block.type === "table") {
          return (
            <div
              key={`table-${idx}`}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
            >
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <tr>
                    {block.headers.map((header, headerIdx) => (
                      <th key={`${header}-${headerIdx}`} className="px-3 py-2 text-left">
                        {renderBold(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`} className="border-t border-slate-100">
                      {row.map((cell, cellIdx) => (
                        <td key={`${rowIdx}-${cellIdx}`} className="px-3 py-2 align-top text-slate-700">
                          {renderBold(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={`para-${idx}`} className="text-[16px] leading-7">
            {block.lines.map((line, lineIdx) => (
              <span key={`${line}-${lineIdx}`}>
                {renderBold(line)}
                {lineIdx < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
