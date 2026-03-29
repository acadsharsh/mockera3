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

export const deUnicodeText = (value: string): string => {
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
    // Letterlike symbols (PDF extractors use these)
    .replace(/\u210E/g, "h")
    .replace(/\u210F/g, "\\hbar ")
    .replace(/\u2113/g, "l")
    .replace(/\u2147/g, "e")
    .replace(/\u2148/g, "i")
    .replace(/\u2149/g, "j")
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

export const normalizeText = (value: string) => {
  try {
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
    // Reassemble \times split by JSON corruption
    .replace(/\\t\s*\u00D7/g, "\\times ")
    .replace(/\t\s*\u00D7/g, " \\times ")
    .replace(/\t\s*imes\b/g, "\\times ")
    .replace(/\t\s*ext(\s*\{)/g, "\\text$1")
    .replace(/\t\s*heta\b/g, "\\theta ")
    .replace(/\t\s*au\b/g, "\\tau ")
    .replace(/\n\s*\u00D7/g, " \\times ")
    .replace(/\n\s*abla\b/g, "\\nabla ")
    .replace(/\n\s*eq\b/g, "\\neq ")
    .replace(/\r\s*\u00D7/g, " \\times ")
    .replace(/\r\s*ight/g, "\\right")
    .replace(/\r\s*ho\b/g, "\\rho ")
    .replace(/\f\s*rac/g, "\\frac")
    .replace(/[\t\f]/g, " ");
  const unescaped = preFixed
    .replace(/\\n(?![A-Za-z])/g, "\n")
    .replace(/\\t(?![A-Za-z])/g, "\t")
    .replace(/\\r(?![A-Za-z])/g, "\r")
    .replace(/\\\$/g, "$");

  // Strip Unicode math corruption (invisible chars, Unicode operators, italic letters)
  const deUnicode = deUnicodeText(unescaped);
  const fixedCommands = deUnicode
    // Use (?=[^a-z]|$) instead of word boundaries
    .replace(/\brightarrow(?=[^a-z]|$)/gi, "\\rightarrow ")
    .replace(/\bleftarrow(?=[^a-z]|$)/gi, "\\leftarrow ")
    .replace(/\barrow(?=[^a-z]|$)/gi, "\\rightarrow ")
    .replace(/\btimes(?=[^a-z]|$)/gi, "\\times ")
    .replace(/\bfrac(?=[^a-z]|$)/g, "\\frac")
    .replace(/\bsqrt(?=[^a-z]|$)/g, "\\sqrt")
    .replace(/\balpha(?=[^a-z]|$)/g, "\\alpha ")
    .replace(/\bbeta(?=[^a-z]|$)/g, "\\beta ")
    .replace(/\bgamma(?=[^a-z]|$)/g, "\\gamma ")
    .replace(/\btheta(?=[^a-z]|$)/g, "\\theta ")
    .replace(/\bdelta(?=[^a-z]|$)/g, "\\delta ")
    .replace(/\bomega(?=[^a-z]|$)/g, "\\omega ")
    .replace(/\bsigma(?=[^a-z]|$)/g, "\\sigma ")
    .replace(/\blambda(?=[^a-z]|$)/g, "\\lambda ")
    .replace(/\binfty(?=[^a-z]|$)/g, "\\infty ");
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
  } catch (e) {
    console.error("[MarkdownMath] normalizeText crashed:", e);
    console.error("[MarkdownMath] input preview:", value.slice(0, 300));
    return value;
  }
};

export const fixLatexMath = (text: string): string => {
  if (!text) return "";
  let result = text
    .replace(/\t\{([+-])\}/g, "$1")
    .replace(/\t([A-Za-z]+)/g, safeTextReplace)
    .replace(/\left(?!\s*[\(\[\{\|\.])/g, "\\left.")
    .replace(/\right(?!\s*[\)\]\}\|\.])/g, "\\right.")
    .replace(/\x\s*(?=(?:\rightarrow|???|\to))/g, "")
    .replace(/(?<!\)rightleftharpoons/g, "\\rightleftharpoons")
    .replace(/(?<!\)leftharpoons/g, "\\leftharpoons")
    .replace(/(?<!\)rightarrow/g, "\\rightarrow")
    .replace(/(?<!\)leftarrow/g, "\\leftarrow")
    .replace(/(?<!\)times/g, "\\times")
    .replace(/(?<!\)cdot/g, "\\cdot")
    .replace(/(?<!\)infty/g, "\\infty")
    .replace(/(?<!\)approx/g, "\\approx")
    .replace(/(?<!\)neq/g, "\\neq")
    .replace(/(?<!\)leq/g, "\\leq")
    .replace(/(?<!\)geq/g, "\\geq")
    .replace(/(?<!\)pm/g, "\\pm")
    .replace(/(?<!\)text\{/g, "\\text{");

  const leftCount = (result.match(/\left\s*[(\[{|.]/g) || []).length;
  const rightCount = (result.match(/\right\s*[)\]}|.]/g) || []).length;
  if (leftCount > rightCount) {
    result += "\\right.".repeat(leftCount - rightCount);
  } else if (rightCount > leftCount) {
    result = "\\left.".repeat(rightCount - leftCount) + result;
  }

  return result;
};

export const fixMathOnlyGlitches = (text: string): string =>
  text.replace(/(?:\^)?\s*([23])\s*ext\s*[-\u2212]/g, (_match, charge) => `^{${charge}-}`);
