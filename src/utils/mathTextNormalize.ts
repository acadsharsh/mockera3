// src/utils/mathTextNormalize.ts

// --- Known LaTeX commands starting with \t -------------------
const LATEX_T_SUFFIXES = new Set([
  "imes", "heta", "au", "o", "ilde", "riangle", "riangleleft",
  "riangleright", "riangleq", "an", "anh", "ag", "herefore",
  "op", "iny", "frac",
]);

const safeTextReplace = (_match: string, word: string): string => {
  if (LATEX_T_SUFFIXES.has(word) || word.startsWith("ext")) return _match;
  return `\\text{${word}}`;
};

// --- Unicode cleanup -----------------------------------------
export const deUnicodeText = (value: string): string => {
  return value
    // Invisible chars
    .replace(/\u2062/g, "")
    .replace(/\u2061/g, "")
    .replace(/\u2063/g, "")
    .replace(/\u2064/g, "")

    // Letterlike symbols (PDF extractors use these)
    .replace(/\u210E/g, "h")       // h Planck constant
    .replace(/\u210F/g, "\\hbar ")
    .replace(/\u2113/g, "l")       // l script l
    .replace(/\u2147/g, "e")       // ? Euler's number
    .replace(/\u2148/g, "i")       // ? imaginary
    .replace(/\u2149/g, "j")

    // Unicode minus
    .replace(/\u2212/g, "-")

    // Superscript digits
    .replace(/\u2070/g, "^{0}").replace(/\u00B9/g, "^{1}").replace(/\u00B2/g, "^{2}")
    .replace(/\u00B3/g, "^{3}").replace(/\u2074/g, "^{4}").replace(/\u2075/g, "^{5}")
    .replace(/\u2076/g, "^{6}").replace(/\u2077/g, "^{7}").replace(/\u2078/g, "^{8}")
    .replace(/\u2079/g, "^{9}")
    // Superscript minus
    .replace(/\u207B/g, "^{-}")

    // Subscript digits
    .replace(/\u2080/g, "_{0}").replace(/\u2081/g, "_{1}").replace(/\u2082/g, "_{2}")
    .replace(/\u2083/g, "_{3}").replace(/\u2084/g, "_{4}").replace(/\u2085/g, "_{5}")
    .replace(/\u2086/g, "_{6}").replace(/\u2087/g, "_{7}").replace(/\u2088/g, "_{8}")
    .replace(/\u2089/g, "_{9}")

    // Unicode math operators
    .replace(/\u00D7/g, "\\times ")
    .replace(/\u00B7/g, "\\cdot ")
    .replace(/\u00F7/g, "\\div ")
    .replace(/\u00B1/g, "\\pm ")
    .replace(/\u2248/g, "\\approx ")
    .replace(/\u2260/g, "\\neq ")
    .replace(/\u2264/g, "\\leq ")
    .replace(/\u2265/g, "\\geq ")
    .replace(/\u2192/g, "\\rightarrow ")
    .replace(/\u2190/g, "\\leftarrow ")
    .replace(/\u21CC/g, "\\rightleftharpoons ")
    .replace(/\u221E/g, "\\infty ")

    // Mathematical italic a–z (U+1D44E – U+1D467)
    .replace(/[\uD835][\uDC4E-\uDC67]/g, (c) => {
      const cp = c.codePointAt(0);
      return cp ? String.fromCharCode(cp - 0x1D44E + 97) : c;
    })
    // Mathematical italic A–Z (U+1D434 – U+1D44D)
    .replace(/[\uD835][\uDC34-\uDC4D]/g, (c) => {
      const cp = c.codePointAt(0);
      return cp ? String.fromCharCode(cp - 0x1D434 + 65) : c;
    })

    // Greek italic letters
    .replace(/\uD835\uDEFC/g, "\\alpha ").replace(/\uD835\uDEFD/g, "\\beta ").replace(/\uD835\uDEFE/g, "\\gamma ")
    .replace(/\uD835\uDEFF/g, "\\delta ").replace(/\uD835\uDF00/g, "\\varepsilon ").replace(/\uD835\uDF01/g, "\\zeta ")
    .replace(/\uD835\uDF02/g, "\\eta ").replace(/\uD835\uDF03/g, "\\theta ").replace(/\uD835\uDF04/g, "\\iota ")
    .replace(/\uD835\uDF05/g, "\\kappa ").replace(/\uD835\uDF06/g, "\\lambda ").replace(/\uD835\uDF07/g, "\\mu ")
    .replace(/\uD835\uDF08/g, "\\nu ").replace(/\uD835\uDF09/g, "\\xi ").replace(/\uD835\uDF0B/g, "\\pi ")
    .replace(/\uD835\uDF0C/g, "\\rho ").replace(/\uD835\uDF0E/g, "\\sigma ").replace(/\uD835\uDF0F/g, "\\tau ")
    .replace(/\uD835\uDF10/g, "\\upsilon ").replace(/\uD835\uDF11/g, "\\phi ").replace(/\uD835\uDF12/g, "\\chi ")
    .replace(/\uD835\uDF13/g, "\\psi ").replace(/\uD835\uDF14/g, "\\omega ")

    // Regular Unicode Greek
    .replace(/\u03B1/g, "\\alpha ").replace(/\u03B2/g, "\\beta ").replace(/\u03B3/g, "\\gamma ")
    .replace(/\u03B4/g, "\\delta ").replace(/\u03B5/g, "\\varepsilon ").replace(/\u03B6/g, "\\zeta ")
    .replace(/\u03B7/g, "\\eta ").replace(/\u03B8/g, "\\theta ").replace(/\u03BB/g, "\\lambda ")
    .replace(/\u03BC/g, "\\mu ").replace(/\u03BD/g, "\\nu ").replace(/\u03BE/g, "\\xi ")
    .replace(/\u03C0/g, "\\pi ").replace(/\u03C1/g, "\\rho ").replace(/\u03C3/g, "\\sigma ")
    .replace(/\u03C4/g, "\\tau ").replace(/\u03C6/g, "\\phi ").replace(/\u03C7/g, "\\chi ")
    .replace(/\u03C8/g, "\\psi ").replace(/\u03C9/g, "\\omega ")
    .replace(/\u03A9/g, "\\Omega ").replace(/\u0394/g, "\\Delta ").replace(/\u03A3/g, "\\Sigma ")
    .replace(/\u0393/g, "\\Gamma ").replace(/\u039B/g, "\\Lambda ").replace(/\u03A0/g, "\\Pi ")
    .replace(/\u03A6/g, "\\Phi ").replace(/\u03A8/g, "\\Psi ");
};

// --- MathML conversion ---------------------------------------
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
          case "mi": case "mn": case "mo": case "mtext": return clean;
          case "mrow": return children.map(nodeToTex).join("");
          case "msub": return `${nodeToTex(children[0])}_{${nodeToTex(children[1])}}`;
          case "msup": return `${nodeToTex(children[0])}^{${nodeToTex(children[1])}}`;
          case "msubsup": return `${nodeToTex(children[0])}_{${nodeToTex(children[1])}}^{${nodeToTex(children[2])}}`;
          case "mfrac": return `\\frac{${nodeToTex(children[0])}}{${nodeToTex(children[1])}}`;
          case "msqrt": return `\\sqrt{${children.map(nodeToTex).join("")}}`;
          case "mroot": return `\\sqrt[${nodeToTex(children[1])}]{${nodeToTex(children[0])}}`;
          case "mspace": return " ";
          default: return children.length ? children.map(nodeToTex).join("") : clean;
        }
      };
      const tex = nodeToTex(math);
      return tex ? `$${tex}$` : "";
    } catch {
      return "";
    }
  });
};

// --- Main normalize ------------------------------------------
export const normalizeText = (value: string): string => {
  try {
    const withMathML = value.includes("<mjx-container")
      ? convertMathMLToTex(value)
      : value;

    // Reassemble \t + × and other JSON-corrupted LaTeX commands
    // BEFORE the unescape step destroys \t ? TAB
    const preFixed = withMathML
      .replace(/\\t\s*\u00D7/g, "\\times ")      // literal \t + ×
      .replace(/\\t\s*imes\b/g, "\\times ")       // literal \t + imes
      .replace(/\\t\s*ext(\s*\{)/g, "\\text$1")   // literal \t + ext{ ? \text{
      .replace(/\\t\s*heta\b/g, "\\theta ")       // literal \t + heta
      .replace(/\\t\s*au\b/g, "\\tau ")           // literal \t + au
      .replace(/\\n\s*abla\b/g, "\\nabla ")       // literal \n + abla
      .replace(/\\n\s*eq\b/g, "\\neq ")           // literal \n + eq
      .replace(/\\r\s*ight/g, "\\right")          // literal \r + ight
      .replace(/\\r\s*ho\b/g, "\\rho ")           // literal \r + ho
      .replace(/\\f\s*rac/g, "\\frac")            // literal \f + rac
      .replace(/\\b\s*eta\b/g, "\\beta ")         // literal \b + eta
      .replace(/\\b\s*ar/g, "\\bar");             // literal \b + ar

    const unescaped = preFixed
      .replace(/\\n(?![A-Za-z])/g, "\n")
      .replace(/\\t(?![A-Za-z])/g, "\t")
      .replace(/\\r(?![A-Za-z])/g, "\r")
      .replace(/\\\$/g, "$");

    // Now fix actual control chars + × that survived
    const postFixed = unescaped
      .replace(/\t\s*\u00D7/g, " \\times ")       // TAB char + ×
      .replace(/\t\s*imes\b/g, "\\times ")         // TAB char + imes
      .replace(/\n\s*\u00D7/g, " \\times ")        // NEWLINE + ×
      .replace(/\r\s*\u00D7/g, " \\times ")        // CR + ×
      .replace(/[\t\f]/g, " ");                    // clean remaining control chars

    const deUnicode = deUnicodeText(postFixed);

    // Fix corrupted LaTeX command names from PDF extraction
    // e.g. after deUnicode: "theta" "alpha" "arrow" as bare words
    const fixedCommands = deUnicode
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

    // Strip orphan "ext" from PDF corruption but NOT from \text{}
    const cleanedLatex = fixedCommands.replace(
      /ext(?=[\{\s\-\^]|$)/g,
      (match, offset, str) => {
        if (offset >= 2 && str[offset - 2] === "\\" && str[offset - 1] === "t") return match;
        if (offset >= 1 && str[offset - 1] === "\\") return match;
        return "";
      }
    );

    // Safe \t ? \text conversion (skips \times, \theta, etc.)
    const withTextFix = cleanedLatex.replace(/\\t([A-Za-z]+)/g, safeTextReplace);

    const withExtTimesFix = withTextFix.replace(/extimes/g, "\\times");
    const withTimesFix = withExtTimesFix.replace(
      /([A-Za-z0-9])imes(?=\s*\d)/g,
      "$1\\times "
    );

    const withBracketedDims = withTimesFix.replace(
      /(^|[^$])(\[[^\]\n]*[\^_][^\]\n]*\])/g,
      (_match, lead, bracket) => `${lead}$${bracket}$`
    );

    const formattedOptions = withBracketedDims.replace(
      /(^|[\s;])\(([A-D])\)\s*/g,
      (_match, lead, label, offset) => {
        const normalized = `${label.toLowerCase()}) `;
        if (offset === 0) return `${lead}${normalized}`;
        if (lead && lead !== "\n") return `\n${normalized}`;
        return `${lead}${normalized}`;
      }
    );

    // Inline table detection
    const inlineTablePattern = /\|\s*-{3,}\s*\|\s*-{3,}\s*\|/;
    if (inlineTablePattern.test(formattedOptions) && !formattedOptions.includes("\n")) {
      const tokens = formattedOptions.split("|").map((t) => t.trim()).filter((t) => t.length > 0);
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
          ...rows.map(([l, r]) => `| ${l} | ${r} |`),
        ];
        return [intro, "", ...tableLines, ...(trailing ? ["", trailing] : [])].join("\n");
      }
    }

    return formattedOptions;
  } catch (e) {
    console.error("[mathTextNormalize] normalizeText crashed:", e);
    return value;
  }
};

// --- Fix LaTeX inside math mode ------------------------------
export const fixLatexMath = (text: string): string => {
  if (!text) return "";
  let result = text
    .replace(/\\t\{([+-])\}/g, "$1")
    .replace(/\\t([A-Za-z]+)/g, safeTextReplace)
    .replace(/\\left(?!\s*[(\[{|.])/g, "\\left.")
    .replace(/\\right(?!\s*[)\]}|.])/g, "\\right.")
    .replace(/\\x\s*(?=(?:\\rightarrow|\u2192|\\to))/g, "")
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

  // Balance \left / \right
  const leftCount = (result.match(/\\left\s*[(\[{|.]/g) || []).length;
  const rightCount = (result.match(/\\right\s*[)\]}|.]/g) || []).length;
  if (leftCount > rightCount) {
    result += "\\right.".repeat(leftCount - rightCount);
  } else if (rightCount > leftCount) {
    result = "\\left.".repeat(rightCount - leftCount) + result;
  }

  return result;
};

export const fixMathOnlyGlitches = (text: string): string =>
  text.replace(
    /(?:\^)?\s*([23])\s*ext\s*[-\u2212]/g,
    (_match, charge) => `^{${charge}-}`
  );