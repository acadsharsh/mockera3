"use client";

import { useMemo } from "react";
import { MathJax } from "better-react-mathjax";
import { fixLatexMath, fixMathOnlyGlitches, normalizeText } from "@/utils/mathTextNormalize";

type MarkdownMathProps = {
  text: string;
  className?: string;
};

type TextBlock =
  | { type: "text"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

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
      const rows = lines.slice(2).map((line) => {
        const cells = parseTableRow(line);
        const trimmed = cells.slice(0, headers.length);
        while (trimmed.length < headers.length) trimmed.push("");
        return trimmed;
      });
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

const splitMathSegments = (input: string) => {
  const segments: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  let buffer = "";
  let inMath = false;
  let display = false;

  const flushText = () => {
    if (buffer) segments.push({ type: "text", value: buffer });
    buffer = "";
  };

  const flushMath = () => {
    if (buffer) segments.push({ type: "math", value: buffer, display });
    buffer = "";
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === "\\" && (next === "(" || next === "[")) {
      flushText();
      inMath = true;
      display = next === "[";
      i += 1;
      continue;
    }

    if (char === "\\" && (next === ")" || next === "]") && inMath) {
      const isDisplayClose = next === "]";
      if (display === isDisplayClose) {
        flushMath();
        inMath = false;
        display = false;
        i += 1;
        continue;
      }
    }

    if (char === "\\" && next === "$") {
      buffer += "$";
      i += 1;
      continue;
    }

    if (char === "$") {
      const isDouble = next === "$";
      if (!inMath) {
        flushText();
        inMath = true;
        display = isDouble;
        if (isDouble) i += 1;
        continue;
      }
      if (inMath && display === isDouble) {
        flushMath();
        inMath = false;
        display = false;
        if (isDouble) i += 1;
        continue;
      }
    }

    buffer += char;
  }

  if (inMath) {
    segments.push({ type: "text", value: buffer });
  } else if (buffer) {
    segments.push({ type: "text", value: buffer });
  }

  return segments;
};

const expandTextCommands = (
  parts: Array<{ type: "text" | "math"; value: string; display?: boolean }>
) => {
  const expanded: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  const pattern = /\\(?:text\{[^}]+\}|Omega|mu|implies|t[A-Za-z]+)/g;

  parts.forEach((part) => {
    if (part.type !== "text") {
      expanded.push(part);
      return;
    }
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(part.value))) {
      if (match.index > last) {
        expanded.push({ type: "text", value: part.value.slice(last, match.index) });
      }
      expanded.push({ type: "math", value: match[0], display: false });
      last = match.index + match[0].length;
    }
    if (last < part.value.length) {
      expanded.push({ type: "text", value: part.value.slice(last) });
    }
  });

  return expanded;
};

const renderMathText = (text: string) => {
  const parts = expandTextCommands(splitMathSegments(text));
  return parts.map((part, idx) => {
    if (part.type === "math") {
      const math = fixLatexMath(fixMathOnlyGlitches(part.value));
      const wrapped = part.display ? `\\[${math}\\]` : `\\(${math}\\)`;
      return (
        <MathJax key={`math-${idx}`} inline={!part.display} dynamic>
          {wrapped}
        </MathJax>
      );
    }
    return <span key={`text-${idx}`}>{renderBold(part.value)}</span>;
  });
};

export default function MarkdownMath({ text, className }: MarkdownMathProps) {
  const normalized = useMemo(() => normalizeText(text ?? ""), [text]);
  const blocks = useMemo(() => parseBlocks(normalized), [normalized]);

  return (
    <div className={className}>
      {blocks.map((block, idx) => {
        if (block.type === "table") {
          return (
            <div
              key={`table-${idx}`}
              className="overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900"
            >
              <table className="w-full border-collapse text-[15px]">
                <thead className="bg-[#2f6be6] text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  <tr>
                    {block.headers.map((header, headerIdx) => (
                      <th
                        key={`${header}-${headerIdx}`}
                        className="border-r border-white/10 px-4 py-2 text-center last:border-r-0"
                      >
                        {renderMathText(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIdx) => (
                    <tr key={`row-${rowIdx}`} className="border-t border-slate-700/60">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={`${rowIdx}-${cellIdx}`}
                          className="border-r border-slate-700/60 px-4 py-3 align-top text-slate-100 last:border-r-0"
                        >
                          {renderMathText(cell)}
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
          <p key={`para-${idx}`} className="text-[18px] leading-7">
            {block.lines.map((line, lineIdx) => (
              <span key={`${line}-${lineIdx}`}>
                {renderMathText(line)}
                {lineIdx < block.lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
