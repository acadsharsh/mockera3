const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");

const stripHtml = (value: string) =>
  decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const normalizeMathTokens = (value: string) =>
  value
    .replace(/\r?\n+/g, " ")
    .replace(/(^|[^\\])\bightleftharpoons\b/gi, "$1\\\\rightleftharpoons")
    .replace(/(^|[^\\])\bimes\b/gi, "$1\\\\times")
    .replace(/(^|[^\\])\btimes(?=\d)/gi, "$1\\\\times")
    .replace(/(^|[^\\])\btext\s*([A-Za-z]+)\b/gi, "$1\\\\text{$2}")
    .replace(/\\left\s*\./g, "")
    .replace(/\\left(?=\s*(?:[A-Za-z0-9]|\\))/g, "")
    .replace(/\\right(?![\)\]\}|\|])/g, "")
    .replace(/(^|[^\\])\bext\s*\{/gi, "$1\\\\text{")
    .replace(/(^|[^\\])\bext\b/gi, "$1\\\\text")
    .replace(
      /(^|[^\\])\b(times|cdot|sin|cos|tan|log|ln|sqrt|pi|alpha|beta|gamma|theta|lambda|mu|eta|phi|psi|omega|rightleftharpoons|leftrightarrow|rightarrow|leftarrow|implies|iff)\b/gi,
      "$1\\\\$2"
    )
    .replace(/\s{2,}/g, " ")
    .trim();

const wrapReactionLines = (value: string) =>
  value
    .split(/\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      const hasMathWrap = /(\$|\\\(|\\\[)/.test(trimmed);
      const looksLikeEquation =
        /(rightleftharpoons|leftrightarrow|rightarrow|leftarrow)/.test(trimmed) && /[_^]/.test(trimmed);
      if (looksLikeEquation && !hasMathWrap) {
        return `$${trimmed}$`;
      }
      return trimmed;
    })
    .join("\n");

export const sanitizeQuestionText = (value: unknown) => {
  const raw = String(value ?? "");
  if (!raw) return "";
  const withoutHtml = raw.includes("<") ? stripHtml(raw) : raw;
  const normalized = normalizeMathTokens(withoutHtml);
  return wrapReactionLines(normalized);
};

export const sanitizeOptions = (options: unknown) => {
  if (!Array.isArray(options)) return [];
  return options.map((option) => sanitizeQuestionText(option)).filter(Boolean);
};
