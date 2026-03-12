import renderMathInElement from "katex/contrib/auto-render";

type RenderOptions = {
  displayMode?: boolean;
};

export const renderKatexInElement = (element: HTMLElement, _options?: RenderOptions) => {
  if (!element || typeof window === "undefined") return;
  renderMathInElement(element, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
    ],
    throwOnError: false,
    strict: "ignore",
  });
};
