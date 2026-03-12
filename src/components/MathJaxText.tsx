"use client";

import { useEffect, useMemo, useRef } from "react";

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

  const content = useMemo(
    () =>
      hasDelimiters(text) ? text : inline ? `\\(${text}\\)` : `\\[${text}\\]`,
    [inline, text]
  );
  const divRef = useRef<HTMLDivElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const container = inline ? spanRef.current : divRef.current;
    if (!container || typeof window === "undefined") return;
    const mathJax = (window as typeof window & { MathJax?: any }).MathJax;
    if (!mathJax?.typesetPromise) return;
    mathJax.typesetClear?.([container]);
    mathJax.typesetPromise([container]).catch(() => undefined);
  }, [content]);

  if (inline) {
    return (
      <span ref={spanRef} className={className}>
        {content}
      </span>
    );
  }
  return (
    <div ref={divRef} className={className}>
      {content}
    </div>
  );
}
