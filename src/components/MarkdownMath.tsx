"use client";

import { useMemo } from "react";
import { MathJax } from "better-react-mathjax";

type MarkdownMathProps = {
  text: string;
  className?: string;
};

type TextBlock =
  | { type: "text"; lines: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

const LATEX_T_SUFFIXES = new Set([
  "imes",
  "heta",
  "au",
  "o",
  "ilde",
  "riangle",
  "riangleleft",
  "riangleright",
  "riangleq",
  "an",
  "anh",
  "ag",
  "herefore",
  "op",
  "iny",
  "frac",
]);

const safeTextReplace = (match: string, word: string): string => {
  if (LATEX_T_SUFFIXES.has(word) || word.startsWith("ext")) return match;
  return `\\text{${word}}`;
};

const deUnicodeText = (value: string): string => {
  return value
    // Unicode invisible times (U+2062) — main culprit in garbled PDF extraction
    .replace(/\u2062/g, "")
    // Unicode invisible separator characters
    .replace(/\u2061/g, "") // function application
    .replace(/\u2063/g, "") // invisible separator
    .replace(/\u2064/g, "") // invisible plus
    // Unicode minus → ASCII minus
    .replace(/\u2212/g, "-")
    // Superscript digits → ^{n}
    .replace(/⁰/g, "^{0}").replace(/¹/g, "^{1}").replace(/²/g, "^{2}")
    .replace(/³/g, "^{3}").replace(/⁴/g, "^{4}").replace(/⁵/g, "^{5}")
    .replace(/⁶/g, "^{6}").replace(/⁷/g, "^{7}").replace(/⁸/g, "^{8}")
    .replace(/⁹/g, "^{9}")
    // Subscript digits → _{n}
    .replace(/₀/g, "_{0}").replace(/₁/g, "_{1}").replace(/₂/g, "_{2}")
    .replace(/₃/g, "_{3}").replace(/₄/g, "_{4}").replace(/₅/g, "_{5}")
    .replace(/₆/g, "_{6}").replace(/₇/g, "_{7}").replace(/₈/g, "_{8}")
    .replace(/₉/g, "_{9}")
    // Unicode math operators
    .replace(/×/g, "\\times ")
    .replace(/·/g, "\\cdot ")
    .replace(/÷/g, "\\div ")
    .replace(/±/g, "\\pm ")
    .replace(/≈/g, "\\approx ")
    .replace(/≠/g, "\\neq ")
    .replace(/≤/g, "\\leq ")
    .replace(/≥/g, "\\geq ")
    .replace(/→/g, "\\rightarrow ")
    .replace(/←/g, "\\leftarrow ")
    .replace(/⇌/g, "\\rightleftharpoons ")
    // Italic Unicode letters (𝑎–𝑧) → plain ASCII a–z
    .replace(/[\uD835][\uDC4E-\uDC67]/g, (c) => {
      const cp = c.codePointAt(0);
      return cp ? String.fromCharCode(cp - 0x1D44E + 97) : c;
    })
    // Italic Unicode letters (𝐴–𝑍) → plain ASCII A–Z
    .replace(/[\uD835][\uDC34-\uDC4D]/g, (c) => {
      const cp = c.codePointAt(0);
      return cp ? String.fromCharCode(cp - 0x1D434 + 65) : c;
    })
    // Greek italic letters (𝛼 𝛽 𝛾 𝛿 etc.) → LaTeX commands
    .replace(/𝛼/g, "\\alpha").replace(/𝛽/g, "\\beta").replace(/𝛾/g, "\\gamma")
    .replace(/𝛿/g, "\\delta").replace(/𝜀/g, "\\varepsilon").replace(/𝜁/g, "\\zeta")
    .replace(/𝜂/g, "\\eta").replace(/𝜃/g, "\\theta").replace(/𝜄/g, "\\iota")
    .replace(/𝜅/g, "\\kappa").replace(/𝜆/g, "\\lambda").replace(/𝜇/g, "\\mu")
    .replace(/𝜈/g, "\\nu").replace(/𝜉/g, "\\xi").replace(/𝜋/g, "\\pi")
    .replace(/𝜌/g, "\\rho").replace(/𝜎/g, "\\sigma").replace(/𝜏/g, "\\tau")
    .replace(/𝜐/g, "\\upsilon").replace(/𝜙/g, "\\phi").replace(/𝜒/g, "\\chi")
    .replace(/𝜓/g, "\\psi").replace(/𝜔/g, "\\omega")
    // Regular Unicode Greek letters
    .replace(/α/g, "\\alpha").replace(/β/g, "\\beta").replace(/γ/g, "\\gamma")
    .replace(/δ/g, "\\delta").replace(/ε/g, "\\varepsilon").replace(/ζ/g, "\\zeta")
    .replace(/η/g, "\\eta").replace(/θ/g, "\\theta").replace(/λ/g, "\\lambda")
    .replace(/μ/g, "\\mu").replace(/ν/g, "\\nu").replace(/ξ/g, "\\xi")
    .replace(/π/g, "\\pi").replace(/ρ/g, "\\rho").replace(/σ/g, "\\sigma")
    .replace(/τ/g, "\\tau").replace(/φ/g, "\\phi").replace(/χ/g, "\\chi")
    .replace(/ψ/g, "\\psi").replace(/ω/g, "\\omega")
    .replace(/Ω/g, "\\Omega").replace(/Δ/g, "\\Delta").replace(/Σ/g, "\\Sigma")
    .replace(/Γ/g, "\\Gamma").replace(/Λ/g, "\\Lambda").replace(/Π/g, "\\Pi")
    .replace(/Φ/g, "\\Phi").replace(/Ψ/g, "\\Psi");
};

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
  const preFixed = withMathML
    .replace(/\\t\s*×/g, "\\times")
    .replace(/\t\s*×/g, " \\times ")
    .replace(/\n\s*×/g, " \\times ")
    .replace(/\r\s*×/g, " \\times ");
  const unescaped = preFixed
    .replace(/\\n(?![A-Za-z])/g, "\n")
    .replace(/\\t(?![A-Za-z])/g, "\t")
    .replace(/\\r(?![A-Za-z])/g, "\r")
    .replace(/\\\$/g, "$");

  // Strip Unicode math corruption (invisible chars, Unicode operators, italic letters)
  const deUnicode = deUnicodeText(unescaped);
  const fixedCommands = deUnicode
    .replace(/\brightarrow\b/g, "\\rightarrow")
    .replace(/\bleftarrow\b/g, "\\leftarrow")
    .replace(/\barrow\b/g, "\\rightarrow")
    .replace(/\btimes\b(?!\s*\\)/g, "\\times")
    .replace(/\bfrac\b(?!\s*[{\\])/g, "\\frac")
    .replace(/\bsqrt\b(?!\s*[{\\])/g, "\\sqrt")
    .replace(/\balpha\b(?!\s*[{\\])/g, "\\alpha")
    .replace(/\bbeta\b(?!\s*[{\\])/g, "\\beta")
    .replace(/\bgamma\b(?!\s*[{\\])/g, "\\gamma")
    .replace(/\btheta\b(?!\s*[{\\])/g, "\\theta")
    .replace(/\bomega\b(?!\s*[{\\])/g, "\\omega")
    .replace(/\binfty\b(?!\s*[{\\])/g, "\\infty")
    .replace(/\bsigma\b(?!\s*[{\\])/g, "\\sigma")
    .replace(/\bdelta\b(?!\s*[{\\])/g, "\\delta")
    .replace(/\blambda\b(?!\s*[{\\])/g, "\\lambda");
  const cleanedLatex = fixedCommands.replace(/ext(?=[\{\s\-\^]|$)/g, (match, offset, str) => {
    if (offset >= 2 && str[offset - 2] === "\\" && str[offset - 1] === "t") return match;
    if (offset >= 1 && str[offset - 1] === "\\") return match;
    return "";
  });

  const withTextFix = cleanedLatex.replace(/\\t([A-Za-z]+)/g, safeTextReplace);
  const withExtTimesFix = withTextFix.replace(/extimes/g, "\\times");
  const withTimesFix = withExtTimesFix.replace(/([A-Za-z0-9])imes(?=\s*\d)/g, "$1\\times ");

  const withBracketedDims = withTimesFix.replace(/(^|[^$])(\[[^\]\n]*[\^_][^\]\n]*\])/g, (_match, lead, bracket) => {
    return `${lead}$${bracket}$`;
  });

  const formattedOptions = withBracketedDims.replace(
    /(^|[\s;])\(([A-D])\)\s*/g,
    (match, lead, label, offset, str) => {
      const normalized = `${label.toLowerCase()}) `;
      if (offset === 0) return `${lead}${normalized}`;
      if (lead && lead !== "\n") return `\n${normalized}`;
      return `${lead}${normalized}`;
    }
  );

  const inlineTablePattern = /\|\s*-{3,}\s*\|\s*-{3,}\s*\|/;
  if (inlineTablePattern.test(formattedOptions) && !formattedOptions.includes("\n")) {
    const tokens = formattedOptions
      .split("|")
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (tokens.length >= 5 && tokens[3]?.startsWith("-") && tokens[4]?.startsWith("-")) {
      const intro = tokens[0];
      const header1 = tokens[1];
      const header2 = tokens[2];
      let idx = 5;
      const rows: Array<[string, string]> = [];
      while (idx + 1 < tokens.length) {
        const left = tokens[idx];
        const right = tokens[idx + 1];
        if (left.toLowerCase().startsWith("choose the correct answer")) break;
        rows.push([left, right]);
        idx += 2;
      }
      const trailing = tokens.slice(idx).join(" ").trim();
      const tableLines = [
        `| ${header1} | ${header2} |`,
        "|---|---|",
        ...rows.map(([left, right]) => `| ${left} | ${right} |`),
      ];
      return [intro, "", ...tableLines, ...(trailing ? ["", trailing] : [])].join("\n");
    }
  }

  return formattedOptions;
};

const fixLatexMath = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/\\t\{([+-])\}/g, "$1")
    .replace(/\\t([A-Za-z]+)/g, safeTextReplace)
    .replace(/\\left(?!\s*[\(\[\{\|\.])/g, "\\left.")
    .replace(/\\right(?!\s*[\)\]\}\|\.])/g, "\\right.")
    .replace(/\\x\s*(?=(?:\\rightarrow|→|\\to))/g, "")
    .replace(/(?<!\\)rightleftharpoons/g, "\\rightleftharpoons")
    .replace(/(?<!\\)leftharpoons/g, "\\leftharpoons")
    .replace(/(?<!\\)rightarrow/g, "\\rightarrow")
    .replace(/(?<!\\)leftarrow/g, "\\leftarrow")
    .replace(/(?<!\\)times/g, "\\times")
    .replace(/(?<!\\)cdot/g, "\\cdot")
    .replace(/(?<!\\)infty/g, "\\infty")
    .replace(/(?<!\\)approx/g, "\\approx")
    .replace(/(?<!\\)neq/g, "\\neq")
    .replace(/(?<!\\)leq/g, "\\leq")
    .replace(/(?<!\\)geq/g, "\\geq")
    .replace(/(?<!\\)pm/g, "\\pm")
    .replace(/(?<!\\)text\{/g, "\\text{");
};

const fixMathOnlyGlitches = (text: string): string =>
  text.replace(/(?:\^)?\s*([23])\s*ext\s*[-\u2212]/g, (_match, charge) => `^{${charge}-}`);

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
