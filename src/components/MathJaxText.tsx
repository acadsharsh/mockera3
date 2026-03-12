"use client";

import { MathJax } from "better-react-mathjax";

type MathJaxTextProps = {
  text: string;
  inline?: boolean;
  className?: string;
};

const hasMathSyntax = (value: string) => /\\[A-Za-z]+|[_^$]/.test(value);

const hasDelimiters = (value: string) => /\$\$|\$|\\\[|\\\]|\\\(|\\\)/.test(value);

export default function MathJaxText({ text, inline = false, className }: MathJaxTextProps) {
  if (!text) return null;
  if (!hasMathSyntax(text)) {
    return <span className={className}>{text}</span>;
  }

  const content = hasDelimiters(text)
    ? text
    : inline
    ? `\\(${text}\\)`
    : `\\[${text}\\]`;

  return (
    <span className={className}>
      <MathJax inline={inline} dynamic>
        {content}
      </MathJax>
    </span>
  );
}
