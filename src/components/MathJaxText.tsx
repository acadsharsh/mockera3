"use client";

import { useMemo } from "react";
import { MathJax } from "better-react-mathjax";

type MathJaxTextProps = {
  text: string;
  inline?: boolean;
  className?: string;
};

const hasMathSyntax = (value: string) => /\\[A-Za-z]+|[_^$]/.test(value);

const hasDelimiters = (value: string) => /\$\$|\$|\\\[|\\\]|\\\(|\\\)/.test(value);

const normalizeChemFormula = (value: string) => {
  if (!value) return value;
  if (hasDelimiters(value) || /\\[A-Za-z]+/.test(value)) return value;
  if (!/[A-Za-z]/.test(value)) return value;
  if (!/\d/.test(value) && !/[+-]\s*$/.test(value)) return value;
  if (!/^[A-Za-z0-9\s()+\-]+$/.test(value)) return value;

  let out = value.trim().replace(/\s+/g, "");
  out = out.replace(/^(.+?)(\d+)?([+-])$/, (_m, base, num, sign) => {
    const charge = `${num ?? ""}${sign}`;
    return `${base}^{${charge}}`;
  });
  return `\\ce{${out}}`;
};

export default function MathJaxText({ text, inline = false, className }: MathJaxTextProps) {
  if (!text) return null;
  const normalizedText = normalizeChemFormula(text);
  if (!hasMathSyntax(normalizedText)) {
    return <span className={className}>{normalizedText}</span>;
  }

  const content = useMemo(() => {
    if (hasDelimiters(normalizedText)) return normalizedText;
    return inline ? `$${normalizedText}$` : `$$${normalizedText}$$`;
  }, [inline, normalizedText]);

  if (inline) {
    return (
      <span className={className}>
        <MathJax inline dynamic>
          {content}
        </MathJax>
      </span>
    );
  }

  return (
    <div className={className}>
      <MathJax dynamic>{content}</MathJax>
    </div>
  );
}
