// src/utils/mathTextNormalize.ts

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

const safeTextReplace = (_match: string, word: string): string => {
  if (LATEX_T_SUFFIXES.has(word) || word.startsWith("ext")) return _match;
  return `\\text{${word}}`;
};

const GREEK_ITALIC_MAP: Record<number, string> = {
  0x1d6fc: "\\alpha ",
  0x1d6fd: "\\beta ",
  0x1d6fe: "\\gamma ",
  0x1d6ff: "\\delta ",
  0x1d700: "\\varepsilon ",
  0x1d701: "\\zeta ",
  0x1d702: "\\eta ",
  0x1d703: "\\theta ",
  0x1d704: "\\iota ",
  0x1d705: "\\kappa ",
  0x1d706: "\\lambda ",
  0x1d707: "\\mu ",
  0x1d708: "\\nu ",
  0x1d709: "\\xi ",
  0x1d70b: "\\pi ",
  0x1d70c: "\\rho ",
  0x1d70e: "\\sigma ",
  0x1d70f: "\\tau ",
  0x1d710: "\\upsilon ",
  0x1d711: "\\phi ",
  0x1d712: "\\chi ",
  0x1d713: "\\psi ",
  0x1d714: "\\omega ",
};

const BMP_CHAR_MAP: Record<number, string> = {
  0x2062: "",
  0x2061: "",
  0x2063: "",
  0x2064: "",
  0x210e: "h",
  0x210f: "\\hbar ",
  0x2113: "l",
  0x2147: "e",
  0x2148: "i",
  0x2149: "j",
  0x2212: "-",
  0x2070: "^{0}",
  0x00b9: "^{1}",
  0x00b2: "^{2}",
  0x00b3: "^{3}",
  0x2074: "^{4}",
  0x2075: "^{5}",
  0x2076: "^{6}",
  0x2077: "^{7}",
  0x2078: "^{8}",
  0x2079: "^{9}",
  0x207b: "^{-}",
  0x2080: "_{0}",
  0x2081: "_{1}",
  0x2082: "_{2}",
  0x2083: "_{3}",
  0x2084: "_{4}",
  0x2085: "_{5}",
  0x2086: "_{6}",
  0x2087: "_{7}",
  0x2088: "_{8}",
  0x2089: "_{9}",
  0x00d7: "\\times ",
  0x00b7: "\\cdot ",
  0x00f7: "\\div ",
  0x00b1: "\\pm ",
  0x2248: "\\approx ",
  0x2260: "\\neq ",
  0x2264: "\\leq ",
  0x2265: "\\geq ",
  0x2192: "\\rightarrow ",
  0x2190: "\\leftarrow ",
  0x21cc: "\\rightleftharpoons ",
  0x221e: "\\infty ",
  0x00b0: "^{\\circ}",
  0x03b1: "\\alpha ",
  0x03b2: "\\beta ",
  0x03b3: "\\gamma ",
  0x03b4: "\\delta ",
  0x03b5: "\\varepsilon ",
  0x03b6: "\\zeta ",
  0x03b7: "\\eta ",
  0x03b8: "\\theta ",
  0x03bb: "\\lambda ",
  0x03bc: "\\mu ",
  0x03bd: "\\nu ",
  0x03be: "\\xi ",
  0x03c0: "\\pi ",
  0x03c1: "\\rho ",
  0x03c3: "\\sigma ",
  0x03c4: "\\tau ",
  0x03c6: "\\phi ",
  0x03c7: "\\chi ",
  0x03c8: "\\psi ",
  0x03c9: "\\omega ",
  0x03a9: "\\Omega ",
  0x0394: "\\Delta ",
  0x03a3: "\\Sigma ",
  0x0393: "\\Gamma ",
  0x039b: "\\Lambda ",
  0x03a0: "\\Pi ",
  0x03a6: "\\Phi ",
  0x03a8: "\\Psi ",
};

export const deUnicodeText = (value: string): string => {
  const out: string[] = [];

  for (const ch of value) {
    const cp = ch.codePointAt(0)!;

    if (cp >= 0x1d44e && cp <= 0x1d467) {
      out.push(String.fromCharCode(cp - 0x1d44e + 97));
      continue;
    }
    if (cp >= 0x1d434 && cp <= 0x1d44d) {
      out.push(String.fromCharCode(cp - 0x1d434 + 65));
      continue;
    }
    const greek = GREEK_ITALIC_MAP[cp];
    if (greek) {
      out.push(greek);
      continue;
    }
    const bmp = BMP_CHAR_MAP[cp];
    if (bmp !== undefined) {
      out.push(bmp);
      continue;
    }

    out.push(ch);
  }

  return out.join("");
};

const convertMathMLToTex = (input: string) => {
  if (typeof window === "undefined" || typeof DOMParser === "undefined")
    return input;
  const assistiveRegex = /<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/gi;
  return input.replace(assistiveRegex, (match) => {
    const mathMatch = match.match(/<math[\s\S]*?<\/math>/i);
    if (!mathMatch) return "";
    try {
      const doc = new DOMParser().parseFromString(
        mathMatch[0],
        "application/xml"
      );
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
            return children.length
              ? children.map(nodeToTex).join("")
              : clean;
        }
      };
      const tex = nodeToTex(math);
      return tex ? `$${tex}$` : "";
    } catch {
      return "";
    }
  });
};

export const normalizeText = (value: string): string => {
  try {
    const withMathML = value.includes("<mjx-container")
      ? convertMathMLToTex(value)
      : value;

    const preFixed = withMathML
      .replace(/\\t\s*\u00D7/g, "\\times ")
      .replace(/\\t\s*imes\b/g, "\\times ")
      .replace(/\\t\s*ext(\s*\{)/g, "\\text$1")
      .replace(/\\t\s*heta\b/g, "\\theta ")
      .replace(/\\t\s*au\b/g, "\\tau ")
      .replace(/\\n\s*abla\b/g, "\\nabla ")
      .replace(/\\n\s*eq\b/g, "\\neq ")
      .replace(/\\r\s*ight/g, "\\right")
      .replace(/\\r\s*ho\b/g, "\\rho ")
      .replace(/\\f\s*rac/g, "\\frac")
      .replace(/\\b\s*eta\b/g, "\\beta ")
      .replace(/\\b\s*ar/g, "\\bar");

    const unescaped = preFixed
      .replace(/\\n(?![A-Za-z])/g, "\n")
      .replace(/\\t(?![A-Za-z])/g, "\t")
      .replace(/\\r(?![A-Za-z])/g, "\r")
      .replace(/\\\$/g, "$");

    const postFixed = unescaped
      .replace(/\t\s*\u00D7/g, " \\times ")
      .replace(/\t\s*imes\b/g, "\\times ")
      .replace(/\n\s*\u00D7/g, " \\times ")
      .replace(/\r\s*\u00D7/g, " \\times ")
      .replace(/[\t\f]/g, " ");

    const deUnicode = deUnicodeText(postFixed);

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

    const withBraces = fixedCommands
      .replace(/\\frac\s*(?!\{)(\S+)\s+(?!\{)(\S+)/g, "\\frac{$1}{$2}")
      .replace(/\\sqrt\s*(?!\{)(\S+)/g, "\\sqrt{$1}");

    const cleanedLatex = withBraces.replace(
      /ext(?=[\{\s\-\^]|$)/g,
      (match, offset, str) => {
        if (
          offset >= 2 &&
          str[offset - 2] === "\\" &&
          str[offset - 1] === "t"
        )
          return match;
        if (offset >= 1 && str[offset - 1] === "\\") return match;
        return "";
      }
    );

    const withTextFix = cleanedLatex.replace(
      /\\t([A-Za-z]+)/g,
      safeTextReplace
    );

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

    const inlineTablePattern = /\|\s*-{3,}\s*\|\s*-{3,}\s*\|/;
    if (
      inlineTablePattern.test(formattedOptions) &&
      !formattedOptions.includes("\n")
    ) {
      const tokens = formattedOptions
        .split("|")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      if (
        tokens.length >= 5 &&
        tokens[3]?.startsWith("-") &&
        tokens[4]?.startsWith("-")
      ) {
        const intro = tokens[0];
        const header1 = tokens[1];
        const header2 = tokens[2];
        let idx = 5;
        const rows: Array<[string, string]> = [];
        while (idx + 1 < tokens.length) {
          const left = tokens[idx];
          const right = tokens[idx + 1];
          if (left.toLowerCase().startsWith("choose the correct answer"))
            break;
          rows.push([left, right]);
          idx += 2;
        }
        const trailing = tokens.slice(idx).join(" ").trim();
        const tableLines = [
          `| ${header1} | ${header2} |`,
          "|---|---|",
          ...rows.map(([l, r]) => `| ${l} | ${r} |`),
        ];
        return [
          intro,
          "",
          ...tableLines,
          ...(trailing ? ["", trailing] : []),
        ].join("\n");
      }
    }

    return formattedOptions;
  } catch (e) {
    console.error("[mathTextNormalize] normalizeText crashed:", e);
    return value;
  }
};

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