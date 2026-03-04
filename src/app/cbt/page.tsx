"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LottieLoader from "@/components/LottieLoader";
import ChemStructure from "@/components/ChemStructure";
import { safeJson } from "@/lib/safe-json";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption: string;
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  solution?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
  questionText?: string;
  options?: string[];
};

type Test = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  visibility: "Public" | "Private";
  accessCode?: string;
  durationMinutes: number;
  markingCorrect: number;
  markingIncorrect: number;
  crops: Crop[];
  lockNavigation?: boolean;
};

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  answers: Record<string, string>;
  timeSpent: Record<string, number>;
};

const optionLetters = ["A", "B", "C", "D"] as const;

const extractChemNames = (value: string) => {
  const names: string[] = [];
  const regex = /\[\[chem:([^\]]+)\]\]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value)) !== null) {
    const name = match[1]?.trim();
    if (name) names.push(name);
  }
  return names;
};

const stripChemTags = (value: string) =>
  value.replace(/\[\[chem:([^\]]+)\]\]/gi, (_match, name) => String(name).trim());

const isCorrectAnswer = (crop: Crop, selected?: string) => {
  if (!selected) return false;
  if (crop.questionType === "NUM") {
    const normalized = selected.trim();
    return normalized !== "" && normalized === (crop.correctNumeric ?? "").trim();
  }
  if (crop.questionType === "MSQ") {
    const expected = (crop.correctOptions ?? []).slice().sort().join(",");
    const got = selected
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return got !== "" && got === expected;
  }
  return selected === crop.correctOption;
};

const missingAnswerKeyCount = (crops: Crop[]) => {
  if (!Array.isArray(crops)) return 0;
  return crops.filter((crop) => {
    if (crop.questionType === "NUM") {
      return !crop.correctNumeric || String(crop.correctNumeric).trim() === "";
    }
    if (crop.questionType === "MSQ") {
      const list = Array.isArray(crop.correctOptions) ? crop.correctOptions : [];
      return list.length === 0;
    }
    return !crop.correctOption || String(crop.correctOption).trim() === "";
  }).length;
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
    // Normalize math alphanumeric symbols (e.g. \u001d45b, \u001d453) to ASCII.
    .replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => ch.normalize("NFKC"))
    // Recover common JSON escape fallout from pasted LaTeX (\frac, \times, \beta).
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
        .replace(/[\u2502\u2503\uFF5C\u00A6]/g, "|")
    // Fix common OCR for fraction like \fracpi6 or fracpi6
    .replace(/\\?frac\s*\\?pi\s*([0-9]+)/gi, "\\frac{\\pi}{$1}")
    .replace(/\\?frac\s*\\?pi\s*\/\s*([0-9]+)/gi, "\\frac{\\pi}{$1}")
    .replace(/\\?fracpi([0-9]+)/gi, "\\frac{\\pi}{$1}")
    .replace(/double\s+subscripts:\s*use\s+braces\s+to\s+clarify\.?/gi, "")
    .trim();

const normalizeMathToken = (value: string) => {
  const collapseSpacedToken = (source: string, token: string) => {
    const pattern = token.split("").join("[\\s\\u00b7\\u22c5\\u2219\\u2022]*");
    return source.replace(new RegExp(`\\b${pattern}\\b`, "gi"), token);
  };

  let withOps = value
    .replace(/\s+/g, " ")
    .replace(/\\vec\s*([A-Za-z])/g, "\\vec{$1}")
    .replace(/\\hat\s*([A-Za-z])/g, "\\hat{$1}")
    .replace(/\u00b7/g, "\\cdot")
    .replace(/\u22c5/g, "\\cdot")
    .replace(/[\u2219\u22c5\u2022]/g, "\\cdot")
    .replace(/\u00d7/g, "\\times")
    .replace(/\u00f7/g, "/")
    .replace(/\*/g, "\\cdot ")
    .replace(/\\times(?=[A-Za-z0-9])/g, "\\times ")
    .replace(/\\cdot(?=[A-Za-z0-9])/g, "\\cdot ")
    .replace(/(^|[^\\])\b(cdot|times)\b/gi, "$1\\\\$2");

  [
    "frac",
    "sqrt",
    "sin",
    "cos",
    "tan",
    "log",
    "ln",
    "arg",
    "pi",
    "alpha",
    "beta",
    "gamma",
    "theta",
    "lambda",
    "mu",
    "eta",
    "phi",
    "psi",
    "omega",
  ].forEach((token) => {
    withOps = collapseSpacedToken(withOps, token);
  });

  withOps = withOps
    .replace(/(^|[^\\])\b(sin|cos|tan|log|ln|arg)\s*\(/gi, "$1\\\\$2(")
    .replace(
      /(^|[^\\])\b(alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega|pi)\b/gi,
      "$1\\\\$2"
    );

  withOps = withOps
    // Normalize malformed fraction tokens like fracpi11 / \fracpi11.
    .replace(/(^|[^A-Za-z\\])\\?frac\s*\\?pi\s*([0-9]+)\b/gi, "$1\\frac{\\pi}{$2}")
    .replace(/(^|[^A-Za-z\\])\\?fracpi([0-9]+)\b/gi, "$1\\frac{\\pi}{$2}")
    .replace(/(^|[^A-Za-z\\])\\?frac\s*\{\s*([^{}]+)\s*\}\s*\{\s*([^{}]+)\s*\}/gi, "$1\\frac{$2}{$3}")
    .replace(/(^|[^A-Za-z\\])\\?frac\s*([A-Za-z]+)\s*([0-9]+)\b/g, "$1\\frac{$2}{$3}")
    .replace(/(^|[^A-Za-z\\])\\?frac\s*([0-9]+)\s*([A-Za-z]+)\b/g, "$1\\frac{$2}{$3}")
    .replace(/(^|[^A-Za-z\\])\\?frac([A-Za-z]+)([0-9]+)\b/g, "$1\\frac{$2}{$3}");

  withOps = withOps
    .replace(/([A-Za-z0-9])\\cdot\\frac\{\\pi\}\{([0-9]+)\}/g, "\\frac{$1\\pi}{$2}")
    .replace(/\b([0-9]+)\(([^)]+)\)\s*(\\sin|\\cos|\\tan|\\log|\\ln|\\arg)\b/g, "$1^{($2)}$3")
    .replace(/\b([0-9]+)([A-Za-z])\s*(\\sin|\\cos|\\tan|\\log|\\ln|\\arg)\b/g, "$1^{$2}$3");

  withOps = withOps
    .replace(/(^|[^\\])\bpi\b/gi, "$1\\pi")
    .replace(/\\{2,}(?=[A-Za-z])/g, "\\");

  const sqrtPattern = /\bsqrt\s*\(([^()]+)\)/g;
  while (sqrtPattern.test(withOps)) {
    withOps = withOps.replace(sqrtPattern, "\\sqrt{$1}");
  }


  return withOps.replace(
    /(\([^)]+\)|\[[^\]]+\]|\{[^}]+\}|[A-Za-z0-9^]+)\s*\/\s*(\([^)]+\)|\[[^\]]+\]|\{[^}]+\}|[A-Za-z0-9^]+)/g,
    "\\frac{$1}{$2}"
  );
};

const balanceBraces = (value: string) => {
  let open = 0;
  let close = 0;
  for (const ch of value) {
    if (ch === "{") open += 1;
    if (ch === "}") close += 1;
  }
  if (open > close) return value + "}".repeat(open - close);
  if (close > open) return value.replace(/}+$/, (m) => m.slice(0, m.length - (close - open)));
  return value;
};

const looksLikeLatex = (value: string) =>
  /\\[A-Za-z]+|[_^]/.test(value) ||
  /\\frac|\\sqrt|\\vec|\\hat|\\pi|\\sin|\\cos|\\tan|\\log/.test(value) ||
  /\b(sqrt|sin|cos|tan|log|ln|arg|pi|frac)\b/.test(value);

const hasPlainWords = (value: string) => {
  const stripped = value
    .replace(/\\[A-Za-z]+/g, "")
    .replace(/\b(sqrt|sin|cos|tan|log|ln|arg|pi|frac)\b/gi, "");
  return /[A-Za-z]{3,}/.test(stripped);
};

const isMathTokenWord = (word: string) => {
  const lowered = word.toLowerCase();
  if (
    /^(sin|cos|tan|log|ln|arg|sqrt|frac|pi|alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega|vec|hat|times|cdot)$/.test(
      lowered
    )
  ) {
    return true;
  }
  return /^(?:frac|sqrt|sin|cos|tan|log|ln|arg|pi|alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega)+$/.test(
    lowered
  );
};

const isMathDominant = (value: string) => {
  const words = value.match(/[A-Za-z]{3,}/g) ?? [];
  const plainWords = words.filter((word) => !isMathTokenWord(word));
  const hasOps = /[\^_=+\-*/]|[0-9]/.test(value);
  const hasMathNames =
    /\\[A-Za-z]+|\b(sin|cos|tan|log|ln|arg|sqrt|frac|pi|alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega)\b/i.test(
      value
    );
  return (hasOps || hasMathNames) && plainWords.length <= 2;
};

const splitMathSegments = (value: string) => {
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  const parts: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value))) {
    if (match.index > last) {
      parts.push({ type: "text", value: value.slice(last, match.index) });
    }
    const raw = match[0];
    const display = raw.startsWith("$$") || raw.startsWith("\\[");
    const inner = raw
      .replace(/^\$\$|\$\$$/g, "")
      .replace(/^\$|\$$/g, "")
      .replace(/^\\\[/g, "")
      .replace(/\\\]$/g, "")
      .replace(/^\\\(/g, "")
      .replace(/\\\)$/g, "");
    parts.push({ type: "math", value: inner, display });
    last = regex.lastIndex;
  }
  if (last < value.length) {
    parts.push({ type: "text", value: value.slice(last) });
  }
  return parts;
};

const splitLooseMathSegments = (
  value: string
): Array<{ type: "text" | "math"; value: string; display?: boolean }> => {
  const parts: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  let cursor = 0;
  let i = 0;

  while (i < value.length) {
    if (value[i] !== "(") {
      i += 1;
      continue;
    }

    let depth = 0;
    let j = i;
    while (j < value.length) {
      const ch = value[j];
      if (ch === "(") depth += 1;
      if (ch === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
      j += 1;
    }

    if (depth !== 0) break;

    const candidate = value.slice(i, j + 1);
    const isMathGroup =
      /(sin|cos|tan|log|ln|arg|pi|alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega|frac|sqrt|[0-9]|[\^*/=])/i.test(
        candidate
      );

    if (isMathGroup) {
      if (i > cursor) {
        parts.push({ type: "text", value: value.slice(cursor, i) });
      }
      parts.push({ type: "math", value: candidate, display: false });
      cursor = j + 1;
    }

    i = j + 1;
  }

  if (cursor < value.length) {
    parts.push({ type: "text", value: value.slice(cursor) });
  }

  return parts.some((part) => part.type === "math") ? parts : [{ type: "text" as const, value }];
};

const splitInlineMathSegments = (
  value: string
): Array<{ type: "text" | "math"; value: string; display?: boolean }> => {
  const regex =
    /((?:[A-Za-z0-9\\]+(?:\s*[\^_=+\-*/]\s*[A-Za-z0-9\\(){}\[\]]+)+)|(?:\b(?:sin|cos|tan|log|ln|arg)\s*\([^)]*\))|(?:\b\\?frac(?:pi[0-9]+|\s*\\?pi\s*[0-9]+)\b))/g;
  const parts: Array<{ type: "text" | "math"; value: string; display?: boolean }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(value))) {
    const candidate = match[0];
    if (!candidate || !looksLikeLatex(candidate)) {
      continue;
    }
    if (match.index > last) {
      parts.push({ type: "text", value: value.slice(last, match.index) });
    }
    parts.push({ type: "math", value: candidate.trim(), display: false });
    last = regex.lastIndex;
  }
  if (last < value.length) {
    parts.push({ type: "text", value: value.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value }];
};


const MathText = ({ text }: { text: string }) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const raw = cleanupLatex(text ?? "");
    const host = ref.current;

    host.innerHTML = "";

    const explicitParts = splitMathSegments(raw);
    const hasExplicitMath = !(
      !explicitParts.length ||
      (explicitParts.length === 1 && explicitParts[0].type === "text")
    );

    // Formula-dominant strings should be rendered as a single math expression.
    if (!hasExplicitMath && looksLikeLatex(raw) && (isMathDominant(raw) || !hasPlainWords(raw))) {
      const normalized = balanceBraces(normalizeMathToken(raw));
      const span = document.createElement("span");
      span.textContent = `\\(${normalized}\\)`;
      host.appendChild(span);
      ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([host]));
      return;
    }

    const baseParts = hasExplicitMath ? explicitParts : splitLooseMathSegments(raw);
    const parts = hasExplicitMath
      ? baseParts
      : baseParts.flatMap((part) => (part.type === "text" ? splitInlineMathSegments(part.value) : [part]));

    if (!parts.length || (parts.length === 1 && parts[0].type === "text")) {
      if (!raw) return;
      host.textContent = raw;
      return;
    }

    parts.forEach((part) => {
      const span = document.createElement("span");
      if (part.type === "math") {
        const normalized = balanceBraces(normalizeMathToken(part.value));
        span.textContent = part.display ? `\\[${normalized}\\]` : `\\(${normalized}\\)`;
      } else {
        span.textContent = part.value;
      }
      host.appendChild(span);
    });

    ensureMathJax().then(() => (window as any).MathJax?.typesetPromise?.([host]));
  }, [text]);
  return <span ref={ref} className="whitespace-normal break-words" />;
};

const parseMatchList = (input: string) => {
  const cleaned = cleanupLatex(input ?? "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parseFromLines = () => {
    const listIIndex = lines.findIndex((line) => /list-?\s*i\b/i.test(line));
    const listIIIndex = lines.findIndex((line) => /list-?\s*ii\b/i.test(line));
    if (listIIndex === -1 || listIIIndex === -1 || listIIIndex <= listIIndex) {
      return null;
    }
    const before = lines.slice(0, listIIndex).join(" ");
    const listI = lines.slice(listIIndex + 1, listIIIndex);
    const afterLines = lines.slice(listIIIndex + 1);
    const cutoff = afterLines.findIndex((line) =>
      /^(choose|options|select|in the light|answer)/i.test(line)
    );
    const listII = cutoff === -1 ? afterLines : afterLines.slice(0, cutoff);
    const after = cutoff === -1 ? "" : afterLines.slice(cutoff).join(" ");
    return { before, listI, listII, after };
  };

  const parseInline = () => {
    if (!/list-?\s*i\b/i.test(cleaned) || !/list-?\s*ii\b/i.test(cleaned)) {
      return null;
    }
    const normalized = cleaned.replace(/\s*\|\s*\|\s*/g, "||");
    const tokens = normalized
      .split(/\s*\|{2,}\s*/g)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    const normalizeAlphaLabel = (value: string) => {
      const match = value.toUpperCase().replace(/[^A-Z]/g, "").match(/[A-H]/);
      return match ? `${match[0]}.` : null;
    };
    const normalizeRomanLabel = (value: string) => {
      const roman = value.toUpperCase().replace(/[^IVX]/g, "");
      if (!/^(?:I|II|III|IV|V|VI|VII|VIII|IX|X)$/.test(roman)) {
        return null;
      }
      return `${roman}.`;
    };
    const parseRow = (row: string) => {
      const cells = row
        .split(/\s*\|\s*/)
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (!cells.length) return null;
      const leftIndex = cells.findIndex((cell) => normalizeAlphaLabel(cell));
      if (leftIndex === -1) return null;
      const rightIndex = cells.findIndex(
        (cell, index) => index > leftIndex && normalizeRomanLabel(cell)
      );
      if (rightIndex === -1) return null;
      const leftLabel = normalizeAlphaLabel(cells[leftIndex]);
      const rightLabel = normalizeRomanLabel(cells[rightIndex]);
      const leftText = cells.slice(leftIndex + 1, rightIndex).join(" | ").trim();
      const rightText = cells.slice(rightIndex + 1).join(" | ").trim();
      if (!leftLabel || !rightLabel || !leftText || !rightText) return null;
      return {
        listIItem: `${leftLabel} ${leftText}`,
        listIIItem: `${rightLabel} ${rightText}`,
      };
    };
    const combinedHeaderIndex = tokens.findIndex((chunk) =>
      /list-?\s*i\b[\s\S]*list-?\s*ii\b/i.test(chunk)
    );
    if (combinedHeaderIndex !== -1) {
      const before = tokens
        .slice(0, combinedHeaderIndex + 1)
        .join(" ")
        .replace(/list-?\s*i\b[\s\S]*?list-?\s*ii\b/i, "")
        .trim();
      const rows = tokens.slice(combinedHeaderIndex + 1);
      const listI: string[] = [];
      const listII: string[] = [];
      const afterParts: string[] = [];
      let startedRows = false;

      rows.forEach((row) => {
        if (/^(choose|options|select|in the light|answer)/i.test(row)) {
          afterParts.push(row);
          return;
        }
        if (/^[-|:\s]+$/.test(row)) {
          return;
        }
        const parsedRow = parseRow(row);
        if (parsedRow) {
          startedRows = true;
          listI.push(parsedRow.listIItem);
          listII.push(parsedRow.listIIItem);
          return;
        }
        if (startedRows) {
          afterParts.push(row);
        }
      });

      if (listI.length && listII.length) {
        return { before, listI, listII, after: afterParts.join(" ") };
      }
    }

    const listIIndex = tokens.findIndex((chunk) => /list-?\s*i\b/i.test(chunk));
    const listIIIndex = tokens.findIndex(
      (chunk, index) => index > listIIndex && /list-?\s*ii\b/i.test(chunk)
    );
    if (listIIndex === -1 || listIIIndex === -1) {
      return null;
    }

    const before = tokens.slice(0, listIIndex).join(" ");
    const listIText = tokens.slice(listIIndex + 1, listIIIndex).join(" | ");
    const afterText = tokens.slice(listIIIndex + 1).join(" | ");
    const listI = listIText.split("|").map((item) => item.trim()).filter(Boolean);
    const listII = afterText.split("|").map((item) => item.trim()).filter(Boolean);
    const after =
      listII.find((item) => /^(choose|options|select|in the light|answer)/i.test(item)) ?? "";

    return { before, listI, listII: listII.filter((item) => item !== after), after };
  };

  return parseFromLines() ?? parseInline();
};

const QuestionText = ({ text }: { text: string }) => {
  const parsed = parseMatchList(text);
  if (!parsed) {
    return <MathText text={text} />;
  }
  return (
    <div className="space-y-3">
      {parsed.before && (
        <p className="text-[16px] leading-7">
          <MathText text={parsed.before} />
        </p>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-2 bg-slate-100 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
          <div className="px-3 py-2">List-I</div>
          <div className="px-3 py-2">List-II</div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-200">
          <div className="space-y-2 p-3">
            {parsed.listI.map((item, idx) => (
              <div key={`list-i-${idx}`} className="text-[15px] leading-6 text-slate-700">
                <MathText text={item} />
              </div>
            ))}
          </div>
          <div className="space-y-2 p-3">
            {parsed.listII.map((item, idx) => (
              <div key={`list-ii-${idx}`} className="text-[15px] leading-6 text-slate-700">
                <MathText text={item} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {parsed.after && (
        <p className="text-[16px] leading-7">
          <MathText text={parsed.after} />
        </p>
      )}
    </div>
  );
};

const SolutionBlock = ({ text }: { text: string }) => {
  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return <MathText text={text} />;
  }
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => (
        <p key={`${line}-${idx}`} className="text-[15px] leading-7">
          <MathText text={line} />
        </p>
      ))}
    </div>
  );
};

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
};

const calculatorButtons = [
  "7",
  "8",
  "9",
  "/",
  "4",
  "5",
  "6",
  "*",
  "1",
  "2",
  "3",
  "-",
  "0",
  ".",
  "(",
  ")",
  "+",
];

export default function CBT() {
  const router = useRouter();
  const [testIdParam, setTestIdParam] = useState<string | null>(null);
  const [jumpParam, setJumpParam] = useState<string | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewSet, setReviewSet] = useState<Set<string>>(new Set());
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(3 * 60 * 60);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [answerChanges, setAnswerChanges] = useState<Record<string, number>>({});
  const [rapidChanges, setRapidChanges] = useState<Record<string, number>>({});
  const [firstAnsweredAt, setFirstAnsweredAt] = useState<Record<string, number>>({});
  const [tabSwitches, setTabSwitches] = useState(0);
  const [idleGaps, setIdleGaps] = useState(0);
  const [idleSeconds, setIdleSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [candidateName, setCandidateName] = useState("Candidate");
  const [solutionMode, setSolutionMode] = useState(false);
  const [solutionsEnabled, setSolutionsEnabled] = useState(true);
  const [practiceMode, setPracticeMode] = useState<"standard" | "adaptive">("standard");
  const [adaptiveOrder, setAdaptiveOrder] = useState<string[] | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcValue, setCalcValue] = useState("0");
  const [sectionOrder, setSectionOrder] = useState<Array<"Physics" | "Chemistry" | "Maths">>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [focusLocked, setFocusLocked] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [imageZoom, setImageZoom] = useState(1);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const startRef = useRef<number>(Date.now());
  const prevIdRef = useRef<string | null>(null);
  const examStartRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());
  const questionOrderRef = useRef<string[]>([]);
  const questionFirstSeenRef = useRef<Record<string, number>>({});
  const questionTimelineRef = useRef<Array<{ id: string; enteredAt: number; exitedAt: number }>>([]);
  const idleActiveRef = useRef<boolean>(false);
  const lastChangeRef = useRef<Record<string, number>>({});
  const subjectFirstRef = useRef<Record<"Physics" | "Chemistry" | "Maths", number | null>>({
    Physics: null,
    Chemistry: null,
    Maths: null,
  });

  const toggleBookmark = async (questionId: string) => {
    if (!questionId || bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const res = await fetch("/api/pyq/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      const data = await safeJson<{ saved?: boolean } | null>(res, null);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (data?.saved) {
          next.add(questionId);
        } else {
          next.delete(questionId);
        }
        return next;
      });
    } finally {
      setBookmarkBusy(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPaused) return;
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      if (idleActiveRef.current) {
        idleActiveRef.current = false;
      }
    };
    window.addEventListener("mousemove", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("mousedown", markActivity);
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor > 20000) {
        if (!idleActiveRef.current) {
          idleActiveRef.current = true;
          setIdleGaps((prev) => prev + 1);
        }
        setIdleSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => {
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("mousedown", markActivity);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setTestIdParam(params.get("testId"));
    setJumpParam(params.get("q"));
    setSolutionMode(params.get("solution") === "1");
    setPracticeMode(params.get("mode") === "adaptive" ? "adaptive" : "standard");
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/solutions")
      .then((res) => (res.ok ? res.json() : { enabled: true }))
      .then((data) => {
        if (!active) return;
        setSolutionsEnabled(Boolean(data?.enabled ?? true));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/tests");
      const data = await safeJson<Test[]>(response, []);
      const selected = testIdParam ? data.find((item: Test) => item.id === testIdParam) : data[0];
      if (selected) {
        setTest(selected);
        examStartRef.current = Date.now();
        lastActivityRef.current = Date.now();
        idleActiveRef.current = false;
        setSecondsLeft(Math.max(1, Number(selected.durationMinutes || 180)) * 60);
      }
    };
    load();
  }, [testIdParam]);

  useEffect(() => {
    const loadSession = async () => {
      const response = await fetch("/api/auth/get-session");
      const data = await safeJson<{ user?: { name?: string } } | null>(response, null);
      if (data?.user?.name && candidateName === "Candidate") {
        setCandidateName(data.user.name);
      }
    };
    loadSession();
  }, [candidateName]);

  useEffect(() => {
    let active = true;
    fetch("/api/pyq/bookmarks")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : [];
        const ids = new Set(items.map((row: any) => row?.questionId ?? row?.question?.id).filter(Boolean));
        setBookmarkedIds(ids);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!testIdParam) return;
    const loadAttempts = async () => {
      const response = await fetch(`/api/attempts?testId=${testIdParam}&scope=global`);
      const data = await safeJson<Attempt[]>(response, []);
      setAttempts(Array.isArray(data) ? data : []);
    };
    loadAttempts();
  }, [testIdParam]);

  useEffect(() => {
    if (practiceMode !== "adaptive") return;
    if (!testIdParam || !test) return;
    const loadAdaptive = async () => {
      const response = await fetch(`/api/attempts?testId=${testIdParam}`);
      const data = await safeJson<Attempt[]>(response, []);
      const latest = Array.isArray(data) ? data[0] : null;
      if (!latest) {
        setAdaptiveOrder(null);
        return;
      }
      const answered = Object.values(latest.answers || {}).filter(Boolean).length;
      const avgTime = answered
        ? Object.values(latest.timeSpent || {}).reduce((a, b) => a + b, 0) / answered
        : 0;
      const scored = test.crops.map((crop) => {
        const selected = latest.answers?.[crop.id];
        const spent = latest.timeSpent?.[crop.id] ?? 0;
        let score = 0;
        if (!selected) {
          score = 2;
        } else if (!isCorrectAnswer(crop, selected)) {
          score = 3;
        } else if (avgTime > 0 && spent > avgTime * 1.4) {
          score = 1.5;
        }
        return { id: crop.id, score, spent };
      });
      scored.sort((a, b) => b.score - a.score || b.spent - a.spent);
      setAdaptiveOrder(scored.map((item) => item.id));
    };
    loadAdaptive();
  }, [practiceMode, testIdParam, test]);

  useEffect(() => {
    if (practiceMode !== "adaptive") return;
    if (!adaptiveOrder) return;
    setActiveIndex(0);
  }, [practiceMode, adaptiveOrder]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setIsPaused(true);
        setFocusLocked(true);
      }
    };
    const onBlur = () => {
      setIsPaused(true);
      setFocusLocked(true);
    };
    const onFocus = () => {
      setIsPaused(false);
      setFocusLocked(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const baseQuestions = useMemo(() => {
    if (!test) {
      return [];
    }
    return test.crops.map((crop, index) => ({
      id: crop.id,
      subject: crop.subject,
      difficulty: crop.difficulty,
      imageDataUrl: crop.imageDataUrl,
      correctOption: crop.correctOption,
      questionType: crop.questionType ?? "MCQ",
      correctOptions: crop.correctOptions ?? [],
      correctNumeric: crop.correctNumeric ?? "",
      questionText: crop.questionText ?? "",
      solution: crop.solution ?? "",
      options: crop.options ?? [],
      index: index + 1,
    }));
  }, [test]);

  const questions = useMemo(() => {
    if (!adaptiveOrder || adaptiveOrder.length === 0) {
      return baseQuestions;
    }
    const order = new Map(adaptiveOrder.map((id, idx) => [id, idx]));
    return [...baseQuestions].sort((a, b) => {
      const aIndex = order.get(a.id) ?? 99999;
      const bIndex = order.get(b.id) ?? 99999;
      return aIndex - bIndex;
    });
  }, [baseQuestions, adaptiveOrder]);

  const activeQuestion = questions[activeIndex];
  const sectionList = useMemo(() => {
    const order = ["Physics", "Chemistry", "Maths"] as const;
    return order.filter((subject) => questions.some((q) => q.subject === subject));
  }, [questions]);

  const currentSection = sectionList[currentSectionIndex];
  const sectionQuestions = test?.lockNavigation
    ? questions.filter((q) => q.subject === currentSection)
    : questions;

  useEffect(() => {
    if (!test?.lockNavigation) return;
    if (sectionList.length === 0) return;
    setCurrentSectionIndex(0);
    const firstIndex = questions.findIndex((q) => q.subject === sectionList[0]);
    if (firstIndex >= 0) {
      setActiveIndex(firstIndex);
    }
  }, [questions, sectionList, test?.lockNavigation]);

  const findNextInSection = (direction: "next" | "prev") => {
    if (!test?.lockNavigation || !currentSection) {
      return direction === "next"
        ? Math.min(questions.length - 1, activeIndex + 1)
        : Math.max(0, activeIndex - 1);
    }
    const step = direction === "next" ? 1 : -1;
    let i = activeIndex + step;
    while (i >= 0 && i < questions.length) {
      if (questions[i].subject === currentSection) return i;
      i += step;
    }
    return activeIndex;
  };

  useEffect(() => {
    if (!jumpParam || questions.length === 0 || test?.lockNavigation) {
      return;
    }
    const index = Number(jumpParam) - 1;
    if (!Number.isNaN(index) && index >= 0 && index < questions.length) {
      setActiveIndex(index);
    }
  }, [jumpParam, questions.length, test?.lockNavigation]);

  useEffect(() => {
    if (!activeQuestion) {
      return;
    }
    const now = Date.now();
    const previousId = prevIdRef.current;
    if (previousId) {
      const elapsed = Math.round((now - startRef.current) / 1000);
      setTimeSpent((prev) => ({
        ...prev,
        [previousId]: (prev[previousId] || 0) + elapsed,
      }));
      questionTimelineRef.current.push({
        id: previousId,
        enteredAt: startRef.current,
        exitedAt: now,
      });
    }
    if (!questionOrderRef.current.includes(activeQuestion.id)) {
      questionOrderRef.current.push(activeQuestion.id);
      if (!questionFirstSeenRef.current[activeQuestion.id]) {
        questionFirstSeenRef.current[activeQuestion.id] = Math.max(0, Math.floor((now - examStartRef.current) / 1000));
      }
    }
    prevIdRef.current = activeQuestion.id;
    startRef.current = now;
    setVisitedSet((prev) => {
      const next = new Set(prev);
      next.add(activeQuestion.id);
      return next;
    });
    setImageZoom(1);
  }, [activeQuestion?.id]);

  const toggleReview = (questionId: string) => {
    setReviewSet((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const navStatus = (questionId: string) => {
    if (reviewSet.has(questionId) && answers[questionId]) {
      return "answered-review";
    }
    if (reviewSet.has(questionId)) {
      return "review";
    }
    if (answers[questionId]) {
      return "answered";
    }
    if (visitedSet.has(questionId)) {
      return "not-answered";
    }
    return "not-visited";
  };

  const submitAttempt = async () => {
    if (!test || !activeQuestion) {
      return;
    }
    const now = Date.now();
    let finalTimeSpent = { ...timeSpent };
    const previousId = prevIdRef.current;
    if (previousId) {
      const elapsed = Math.round((now - startRef.current) / 1000);
      finalTimeSpent = {
        ...finalTimeSpent,
        [previousId]: (finalTimeSpent[previousId] || 0) + elapsed,
      };
      setTimeSpent(finalTimeSpent);
    }

    setShowConfirm(false);
    setSubmitting(true);
    const order = Object.entries(subjectFirstRef.current)
      .filter((entry) => entry[1] !== null)
      .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
      .map((entry) => entry[0]) as Array<"Physics" | "Chemistry" | "Maths">;
    setSectionOrder(order);

    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          candidateName: candidateName.trim() || "Candidate",
          batchCode: test.accessCode,
          answers,
          timeSpent: finalTimeSpent,
          answerChanges,
          rapidChanges,
          firstAnsweredAt,
          tabSwitches,
          idleGaps,
          idleSeconds,
          sectionOrder: order,
          questionOrder: questionOrderRef.current,
          questionFirstSeen: questionFirstSeenRef.current,
          questionTimeline: questionTimelineRef.current,
        }),
      });
      const saved = await response.json().catch(() => null);
      const attemptId = saved?.id ? `&attemptId=${saved.id}` : "";
      const missingCount = missingAnswerKeyCount(test.crops || []);
      if (missingCount > 0) {
        router.push(`/answer-key?testId=${test.id}${attemptId}`);
      } else {
        router.push(`/test-analysis?testId=${test.id}${attemptId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const answeredMarkedCount = questions.filter((q) => answers[q.id] && reviewSet.has(q.id)).length;
  const answeredOnlyCount = Math.max(0, answeredCount - answeredMarkedCount);
  const reviewOnlyCount = Math.max(0, reviewSet.size - answeredMarkedCount);
  const notVisitedCount = Math.max(0, questions.length - visitedSet.size);
  const notAnsweredCount = Math.max(
    0,
    visitedSet.size - answeredOnlyCount - reviewOnlyCount - answeredMarkedCount
  );

  const durationSeconds = Math.max(1, Number(test?.durationMinutes || 180)) * 60;
  const elapsedSeconds = Math.max(0, durationSeconds - secondsLeft);
  const timeProgress = Math.min(1, elapsedSeconds / durationSeconds);
  const avgCompletion = attempts.length
    ? attempts.reduce((acc, attempt) => {
        const attempted = Object.values(attempt.answers).filter(Boolean).length;
        return acc + attempted / Math.max(1, questions.length);
      }, 0) / attempts.length
    : 0.6;
  const ghostProgress = Math.min(1, timeProgress * avgCompletion);

  const submitSection = () => {
    if (!test?.lockNavigation) return;
    const nextIndex = Math.min(sectionList.length - 1, currentSectionIndex + 1);
    if (nextIndex === currentSectionIndex) return;
    setCurrentSectionIndex(nextIndex);
    const firstIndex = questions.findIndex((q) => q.subject === sectionList[nextIndex]);
    if (firstIndex >= 0) {
      setActiveIndex(firstIndex);
    }
  };

  const updateCalc = (value: string) => {
    setCalcValue((prev) => (prev === "0" ? value : prev + value));
  };

  const clearCalc = () => setCalcValue("0");

  const evaluateCalc = () => {
    try {
      const result = Function(`"use strict"; return (${calcValue})`)();
      setCalcValue(String(result));
    } catch {
      setCalcValue("Error");
    }
  };

  if (!test) {
    return (
      <div className="min-h-screen bg-[#f2f2f2] p-6 text-[#1f2937]">
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">No test found</h1>
          <p className="mt-2 text-sm text-slate-500">Create one in the Creator Studio.</p>
          <a className="mt-4 inline-flex rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white" href="/studio">
            Go to Studio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f3f3] text-[#1f2937]">
      <header className="border-b border-slate-400 bg-white">
        <div className="flex w-full items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-[#7d00b3] px-3 py-1 text-sm font-semibold text-white">
              {test.title || "Mock Test"}
            </span>
            {practiceMode === "adaptive" && (
              <span className="rounded-sm bg-[#0f172a] px-2 py-1 text-[11px] font-semibold text-white/80">
                Adaptive Practice
              </span>
            )}
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-full bg-[#34a2ff] text-[11px] font-semibold text-white"
              title="Test info"
            >
              i
            </button>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-700">
            <button className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">PDF</span>
              Question Paper
            </button>
            <div>
              Time Left: <span className="font-semibold">{formatTime(secondsLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4">
        <div className="mt-3 flex items-center justify-between border border-slate-400 bg-white px-4 py-2">
          <span className="rounded-sm bg-[#7d00b3] px-3 py-1 text-sm font-semibold text-white">
            {activeQuestion?.subject ?? "Section"} Section {currentSectionIndex + 1}
          </span>
          <span className="text-sm text-slate-700">Time Left: {formatTime(secondsLeft)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border border-slate-300 bg-white px-4 py-2 text-sm">
          <span>Question Type: {activeQuestion?.questionType ?? "MCQ"}</span>
          <span>
            <span className="text-emerald-600">Correct: +{test.markingCorrect}</span>
            <span className="ml-3 text-rose-600">Incorrect: {test.markingIncorrect}</span>
          </span>
        </div>
      </div>

      <main className="grid w-full flex-1 gap-4 px-4 py-4 lg:grid-cols-[1.85fr_1fr]">
        <section className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-300 bg-[#7a1fa2] px-5 py-2 text-sm font-semibold text-white">
            <span>Question No. {activeQuestion?.index}</span>
            <button
              type="button"
              onClick={() => activeQuestion && toggleBookmark(activeQuestion.id)}
              className={`rounded border border-white/40 px-2 py-1 text-[11px] font-semibold ${bookmarkedIds.has(activeQuestion?.id ?? "") ? "bg-white text-[#7a1fa2]" : "bg-transparent text-white"}`}
              disabled={bookmarkBusy || !activeQuestion}
            >
              {bookmarkedIds.has(activeQuestion?.id ?? "") ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
          <div className="grid min-h-0 flex-1 gap-4 p-5">
                {activeQuestion?.questionText && (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-[16px] leading-7">
                    <QuestionText text={activeQuestion.questionText} />
                  </div>
                )}
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>Question Image</span>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => setImageZoom((prev) => Math.max(0.6, Number((prev - 0.1).toFixed(2))))}
                    type="button"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{Math.round(imageZoom * 100)}%</span>
                  <button
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => setImageZoom((prev) => Math.min(2.4, Number((prev + 0.1).toFixed(2))))}
                    type="button"
                  >
                    +
                  </button>
                  <button
                    className="rounded border border-slate-200 px-2 py-1 text-[11px]"
                    onClick={() => setImageZoom(1)}
                    type="button"
                  >
                    Reset
                  </button>
                </div>
              </div>
              {activeQuestion?.imageDataUrl ? (
                <div className="max-h-[62vh] overflow-auto rounded border border-slate-200 bg-white p-2">
                  <img
                    src={activeQuestion.imageDataUrl}
                    alt="Question"
                    className="block max-w-none"
                    style={{
                      transform: `scale(${imageZoom})`,
                      transformOrigin: "top left",
                      imageRendering: "auto",
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              {activeQuestion.questionType === "NUM" ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-xs text-slate-500">Answer</span>
                  <input
                    value={answers[activeQuestion.id] ?? ""}
                    onChange={(event) => {
                      if (solutionMode) return;
                      const now = Date.now();
                      setAnswers((prev) => ({ ...prev, [activeQuestion.id]: event.target.value }));
                      setAnswerChanges((prev) => ({
                        ...prev,
                        [activeQuestion.id]: (prev[activeQuestion.id] || 0) + 1,
                      }));
                      const last = lastChangeRef.current[activeQuestion.id];
                      if (last && now - last < 3000) {
                        setRapidChanges((prev) => ({
                          ...prev,
                          [activeQuestion.id]: (prev[activeQuestion.id] || 0) + 1,
                        }));
                      }
                      lastChangeRef.current[activeQuestion.id] = now;
                      setFirstAnsweredAt((prev) => {
                        if (prev[activeQuestion.id]) return prev;
                        const elapsed = Math.max(0, Math.floor((now - examStartRef.current) / 1000));
                        return { ...prev, [activeQuestion.id]: elapsed };
                      });
                      if (subjectFirstRef.current[activeQuestion.subject] === null) {
                        subjectFirstRef.current[activeQuestion.subject] = Math.max(
                          0,
                          Math.floor((now - examStartRef.current) / 1000)
                        );
                      }
                    }}
                    className="w-48 rounded border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Enter numeric answer"
                    disabled={solutionMode}
                  />
                  {solutionMode && (
                    <span className="text-[11px] text-emerald-600">
                      Correct: {activeQuestion.correctNumeric || "-"}
                    </span>
                  )}
                </label>
              ) : (
                (activeQuestion.options.length
                  ? activeQuestion.options
                  : optionLetters.map((l) => `Option ${l}`)
                ).map((option, idx) => {
                  const letter = optionLetters[idx] ?? "A";
                  const current = answers[activeQuestion.id] ?? "";
                  const selected =
                    activeQuestion.questionType === "MSQ"
                      ? current.split(",").includes(letter)
                      : current === letter;
                  const isCorrect =
                    activeQuestion.questionType === "MSQ"
                      ? activeQuestion.correctOptions?.includes(letter)
                      : activeQuestion.correctOption === letter;
                  return (
                    <label
                      key={letter}
                      className={`flex items-center gap-3 text-base ${
                        solutionMode && isCorrect ? "font-semibold text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      <input
                        type={activeQuestion.questionType === "MSQ" ? "checkbox" : "radio"}
                        name={`q-${activeQuestion.id}`}
                        checked={selected}
                        onChange={() => {
                          if (solutionMode) return;
                          const now = Date.now();
                          setAnswers((prev) => {
                            if (activeQuestion.questionType === "MSQ") {
                              const set = new Set((prev[activeQuestion.id] || "").split(",").filter(Boolean));
                              if (set.has(letter)) {
                                set.delete(letter);
                              } else {
                                set.add(letter);
                              }
                              const nextValue = Array.from(set).sort().join(",");
                              return { ...prev, [activeQuestion.id]: nextValue };
                            }
                            return { ...prev, [activeQuestion.id]: letter };
                          });
                          setAnswerChanges((prev) => ({
                            ...prev,
                            [activeQuestion.id]: (prev[activeQuestion.id] || 0) + 1,
                          }));
                          const last = lastChangeRef.current[activeQuestion.id];
                          if (last && now - last < 3000) {
                            setRapidChanges((prev) => ({
                              ...prev,
                              [activeQuestion.id]: (prev[activeQuestion.id] || 0) + 1,
                            }));
                          }
                          lastChangeRef.current[activeQuestion.id] = now;
                          setFirstAnsweredAt((prev) => {
                            if (prev[activeQuestion.id]) return prev;
                            const elapsed = Math.max(0, Math.floor((now - examStartRef.current) / 1000));
                            return { ...prev, [activeQuestion.id]: elapsed };
                          });
                          if (subjectFirstRef.current[activeQuestion.subject] === null) {
                            subjectFirstRef.current[activeQuestion.subject] = Math.max(
                              0,
                              Math.floor((now - examStartRef.current) / 1000)
                            );
                          }
                        }}
                        disabled={solutionMode}
                      />
                      <span className="text-[17px] leading-7">
                        <MathText text={option} />
                        {solutionMode && isCorrect ? " (Correct)" : ""}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {solutionMode && solutionsEnabled && activeQuestion?.solution?.trim() ? (
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Solution
                </div>
                <div className="text-[15px] leading-7 text-slate-700">
                  <SolutionBlock text={stripChemTags(activeQuestion.solution)} />
                </div>
                {extractChemNames(activeQuestion.solution).length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {extractChemNames(activeQuestion.solution).map((name, index) => (
                      <ChemStructure key={`${name}-${index}`} name={name} />
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded bg-[#2f855a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1))
                }
                disabled={solutionMode}
              >
                SAVE & NEXT
              </button>
              <button
                className="rounded bg-[#e2e8f0] px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                onClick={() => setAnswers((prev) => ({ ...prev, [activeQuestion.id]: "" }))}
                disabled={solutionMode}
              >
                CLEAR
              </button>
              <button
                className="rounded bg-[#f59e0b] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => {
                  toggleReview(activeQuestion.id);
                  setActiveIndex((prev) => Math.min(questions.length - 1, prev + 1));
                }}
                disabled={solutionMode}
              >
                SAVE & MARK FOR REVIEW
              </button>
              <button
                className="rounded bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => toggleReview(activeQuestion.id)}
                disabled={solutionMode}
              >
                MARK FOR REVIEW & NEXT
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div className="flex gap-2">
                <button
                  className="rounded border border-slate-200 px-3 py-2 text-xs"
                  onClick={() => setActiveIndex(findNextInSection("prev"))}
                >
                  &lt;&lt; BACK
                </button>
                <button
                  className="rounded border border-slate-200 px-3 py-2 text-xs"
                  onClick={() => setActiveIndex(findNextInSection("next"))}
                >
                  NEXT &gt;&gt;
                </button>
              </div>
              <button
                className="rounded bg-[#2f855a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => setShowConfirm(true)}
                disabled={submitting || solutionMode}
              >
                {submitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-300 bg-white">
            <div className="flex items-center gap-4 border-b border-slate-300 px-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-2xl">
                U
              </div>
              <div>
                <div className="text-sm text-slate-500">User Name</div>
                <input
                  value={candidateName}
                  onChange={(event) => setCandidateName(event.target.value)}
                  className="mt-1 w-40 border-b border-dashed border-slate-300 bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-4 text-[11px] text-slate-700">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-emerald-500 text-white">
                  {answeredOnlyCount}
                </span>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-orange-500 text-white">
                  {notAnsweredCount}
                </span>
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-slate-300 text-slate-700">
                  {notVisitedCount}
                </span>
                <span>Not Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-purple-600 text-white">
                  {reviewOnlyCount}
                </span>
                <span>Marked for Review</span>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-[11px]">
                <span className="inline-flex h-8 w-10 items-center justify-center rounded bg-purple-600 text-white">
                  {answeredMarkedCount}
                </span>
                <span>Answered & Marked for Review</span>
              </div>
            </div>
            <div className="border-t border-slate-300 bg-[#7a1fa2] px-4 py-2 text-sm font-semibold text-white">
              {activeQuestion?.subject ?? "Section"} Section {currentSectionIndex + 1}
            </div>
            <div className="max-h-[420px] overflow-auto bg-[#dfefff] p-3">
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {sectionQuestions.map((question) => {
                  const index = questions.findIndex((item) => item.id === question.id);
                  const status = navStatus(question.id);
                  const isActive = activeQuestion.id === question.id;
                  const baseClass =
                    status === "answered"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : status === "answered-review"
                      ? "border-purple-600 bg-purple-600 text-white"
                      : status === "review"
                      ? "border-purple-600 bg-purple-600 text-white"
                      : status === "not-answered"
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-slate-300 bg-slate-100 text-slate-700";
                  return (
                    <button
                      key={question.id}
                      className={`relative flex h-8 w-8 items-center justify-center rounded border text-[11px] font-semibold shadow-sm ${baseClass} ${
                        isActive ? "ring-2 ring-[#7a1fa2] ring-offset-1 ring-offset-[#dfefff]" : ""
                      }`}
                      onClick={() => {
                        if (test?.lockNavigation) return;
                        setActiveIndex(index);
                      }}
                      disabled={Boolean(test?.lockNavigation)}
                    >
                      {String(question.index).padStart(2, "0")}
                      {status === "answered-review" && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </main>


      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur">
          <div className="rounded-2xl border border-white/10 bg-[#0f172a] px-8 py-6 text-center text-white shadow-2xl">
            <LottieLoader message="Submitting your test..." size={180} />
            <p className="mt-2 text-sm text-white/60">Generating analysis from your answers.</p>
          </div>
        </div>
      )}
      {focusLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-rose-900/90 via-rose-800/80 to-black/90 backdrop-blur">
          <div className="rounded-3xl border border-rose-400/40 bg-rose-500/10 px-8 py-6 text-center text-white shadow-2xl">
            <div className="text-xs uppercase tracking-[0.4em] text-rose-200/70">Focus Lock</div>
            <h2 className="mt-3 text-2xl font-semibold">Return to Test</h2>
            <p className="mt-2 text-sm text-rose-100/80">
              The test is paused while you're away. Click back into the test to continue.
            </p>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">Confirm Submission</h2>
            <p className="mt-2 text-sm text-slate-500">Review your attempt summary before final submit.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-slate-200 p-3 text-center">
                <p className="text-lg font-semibold text-emerald-600">{answeredCount}</p>
                <p className="text-slate-500">Answered</p>
              </div>
              <div className="rounded border border-slate-200 p-3 text-center">
                <p className="text-lg font-semibold text-purple-600">{reviewSet.size}</p>
                <p className="text-slate-500">Review</p>
              </div>
              <div className="rounded border border-slate-200 p-3 text-center">
                <p className="text-lg font-semibold text-amber-600">{notAnsweredCount}</p>
                <p className="text-slate-500">Not Answered</p>
              </div>
              <div className="rounded border border-slate-200 p-3 text-center">
                <p className="text-lg font-semibold text-red-500">{notVisitedCount}</p>
                <p className="text-slate-500">Not Visited</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm"
                onClick={() => setShowConfirm(false)}
              >
                Go Back
              </button>
              <button
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={submitAttempt}
                disabled={solutionMode}
              >
                Submit Final
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

