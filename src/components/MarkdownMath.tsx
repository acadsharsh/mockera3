"use client";

import { useMemo } from "react";
import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

type MarkdownMathProps = {
  text: string;
  className?: string;
};

type TextBlock =
  | { type: "text"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

const normalizeText = (value: string) => {
  const convertMathMLToTex = (input: string) => {
    if (typeof window === "undefined" || typeof DOMParser === "undefined") return input;
    const assistiveRegex = /<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/gi;
    return input.replace(assistiveRegex, (match) => {
      const mathMatch = match.match(/<math[\s\S]*?<\/math>/i);
      if (!mathMatch) return "";
      try {
        const doc = new DOMParser().parseFromString(mathMatch[0], "application/xml");
        const math = doc.querySelector("math");
        if (!math) return "";

        const nodeToTex = (node: Element): string => {
          const name = node.tagName.toLowerCase();
          const children = Array.from(node.children) as Element[];
          const text = node.textContent ?? "";
          const clean = text.replace(/\u2212/g, "-");
          switch (name) {
            case "mi":
            case "mn":
            case "mo":
            case "mtext":
              return clean;
            case "mrow":
              return children.map(nodeToTex).join("");
            case "msub":
              return `${nodeToTex(children[0])}_{${nodeToTex(children[1])}}`;
            case "msup":
              return `${nodeToTex(children[0])}^{${nodeToTex(children[1])}}`;
            case "msubsup":
              return `${nodeToTex(children[0])}_{${nodeToTex(children[1])}}^{${nodeToTex(children[2])}}`;
            case "mfrac":
              return `\\frac{${nodeToTex(children[0])}}{${nodeToTex(children[1])}}`;
            case "msqrt":
              return `\\sqrt{${children.map(nodeToTex).join("")}}`;
            case "mroot":
              return `\\sqrt[${nodeToTex(children[1])}]{${nodeToTex(children[0])}}`;
            case "mspace":
              return " ";
            default:
              return children.length ? children.map(nodeToTex).join("") : clean;
          }
        };

        const tex = nodeToTex(math);
        return tex ? `$${tex}$` : "";
      } catch {
        return "";
      }
    });
  };

  const withMathML = value.includes("<mjx-container") ? convertMathMLToTex(value) : value;
  const unescaped = withMathML
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\$/g, "$");

  // Fix backslash commands that appear outside math delimiters.
  const fixedBareCmds = unescaped.replace(
    /(\$[^$]*\$|\$\$[^$]*\$\$)|\\(rightleftharpoons|leftharpoons|rightarrow|leftarrow|times|cdot|infty|pm|leq|geq|neq|approx)\b/g,
    (match, mathBlock) => {
      if (mathBlock) return mathBlock;
      return `$${match}$`;
    }
  );

  // Auto-wrap bracketed dimension expressions like [L^2 T^{-2} K^{-1}] in math delimiters.
  return fixedBareCmds.replace(/(^|[^$])(\[[^\]\n]*[\^_][^\]\n]*\])/g, (_match, lead, bracket) => {
    return `${lead}$${bracket}$`;
  });
};

const fixLatexMath = (text: string) => {
  if (!text) return "";
  return text
    .replace(/(^|[^\\])rightleftharpoons\b/g, "$1\\rightleftharpoons")
    .replace(/(^|[^\\])leftharpoons\b/g, "$1\\leftharpoons")
    .replace(/(^|[^\\])rightarrow\b/g, "$1\\rightarrow")
    .replace(/(^|[^\\])leftarrow\b/g, "$1\\leftarrow")
    .replace(/(^|[^\\])times\b/g, "$1\\times")
    .replace(/(^|[^\\])text\{/g, "$1\\text{")
    .replace(/(^|[^\\])cdot\b/g, "$1\\cdot")
    .replace(/(^|[^\\])infty\b/g, "$1\\infty")
    .replace(/(^|[^\\])pm\b/g, "$1\\pm")
    .replace(/(^|[^\\])leq\b/g, "$1\\leq")
    .replace(/(^|[^\\])geq\b/g, "$1\\geq")
    .replace(/(^|[^\\])neq\b/g, "$1\\neq")
    .replace(/(^|[^\\])approx\b/g, "$1\\approx");
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
    segments.push({ type: "text", value: (display ? "$$" : "$") + buffer });
  } else if (buffer) {
    segments.push({ type: "text", value: buffer });
  }

  return segments;
};

const renderMathText = (text: string) => {
  const parts = splitMathSegments(text);
  return parts.map((part, idx) => {
    if (part.type === "math") {
      const math = fixLatexMath(part.value);
      return part.display ? (
        <BlockMath key={`block-${idx}`} math={math} errorColor="#cc0000" />
      ) : (
        <InlineMath key={`inline-${idx}`} math={math} errorColor="#cc0000" />
      );
    }
    return <span key={`text-${idx}`}>{renderBold(part.value)}</span>;
  });
};

export default function MarkdownMath({ text, className }: MarkdownMathProps) {
  const normalized = useMemo(() => normalizeText(text ?? ""), [text]);
  const blocks = useMemo(() => parseBlocks(normalized), [normalized]);

  if (process.env.NODE_ENV !== "production") {
    // Debug raw vs normalized text to find where backslashes are lost.
    // eslint-disable-next-line no-console
    console.log("RAW TEXT:", text);
    // eslint-disable-next-line no-console
    console.log("BEFORE KATEX:", normalized);
  }

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
