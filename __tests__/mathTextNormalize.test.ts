import { describe, it, expect } from "vitest";
import { normalizeText, deUnicodeText } from "@/utils/mathTextNormalize";

describe("safeTextReplace - preserves LaTeX \\t commands", () => {
  it("preserves \\times", () => {
    const r = normalizeText("$3 \\times 10^{7}$");
    expect(r).toContain("\\times");
    expect(r).not.toContain("\\text{imes}");
  });

  it("preserves \\theta", () => {
    const r = normalizeText("$\\theta$");
    expect(r).toContain("\\theta");
    expect(r).not.toContain("\\text{heta}");
  });

  it("preserves \\tau", () => {
    const r = normalizeText("$\\tau$");
    expect(r).toContain("\\tau");
    expect(r).not.toContain("\\text{au}");
  });

  it("preserves \\text{constant}", () => {
    const r = normalizeText("$PV^{\\alpha} = \\text{constant}$");
    expect(r).toContain("\\text{constant}");
  });

  it("preserves \\text{ ms}", () => {
    const r = normalizeText("$\\text{ ms}^{-1}$");
    expect(r).toContain("\\text{ ms}");
  });
});

describe("ext cleanup - function-based, no lookbehinds", () => {
  it("strips orphan ext from PDF corruption", () => {
    const r = normalizeText("some ext value");
    expect(r).not.toMatch(/\bext\b/);
  });

  it("does NOT strip ext inside \\text{}", () => {
    const r = normalizeText("$\\text{kg}$");
    expect(r).toContain("\\text{kg}");
  });

  it("does not crash on complex input", () => {
    const input = "\uD835\uDC35 = \uD835\uDC35\u2080[\\sin(3.14 \u00D7 10\u2077)ct]";
    expect(() => normalizeText(input)).not.toThrow();
  });
});

describe("preFixed - reassembles broken \\times", () => {
  it("fixes literal \\t×", () => {
    const r = normalizeText("3 \\t\u00D7 10^8");
    expect(r).toContain("\\times");
    expect(r).not.toContain("\\t\u00D7");
  });

  it("fixes literal \\t × (with space)", () => {
    const r = normalizeText("6.6 \\t \u00D7 10^{-34}");
    expect(r).toContain("\\times");
  });

  it("fixes actual TAB char + ×", () => {
    const r = normalizeText("3\t\u00D7 10^8");
    expect(r).toContain("\\times");
    expect(r).not.toContain("\t");
  });

  it("fixes actual NEWLINE + ×", () => {
    const r = normalizeText("3\n\u00D7 10^8");
    expect(r).toContain("\\times");
  });

  it("fixes actual CR + ×", () => {
    const r = normalizeText("3\r\u00D7 10^8");
    expect(r).toContain("\\times");
  });
});

describe("fixedCommands - repairs PDF-corrupted LaTeX names", () => {
  it("fixes bare 'arrow' ? \\rightarrow", () => {
    const r = normalizeText("A arrow B");
    expect(r).toContain("\\rightarrow");
  });

  it("fixes bare 'rightarrow' ? \\rightarrow", () => {
    const r = normalizeText("A rightarrow B");
    expect(r).toContain("\\rightarrow");
  });

  it("fixes bare 'leftarrow' ? \\leftarrow", () => {
    const r = normalizeText("A leftarrow B");
    expect(r).toContain("\\leftarrow");
  });

  it("does NOT double-prefix already correct \\rightarrow", () => {
    const r = normalizeText("$A \\rightarrow B$");
    expect(r).not.toContain("\\\\rightarrow");
    expect(r).toContain("\\rightarrow");
  });
});

describe("deUnicodeText", () => {
  it("strips invisible times U+2062", () => {
    expect(deUnicodeText("5\u2062x")).toBe("5x");
  });

  it("converts math italic ?? ? B", () => {
    expect(deUnicodeText("\uD835\uDC35")).toBe("B");
  });

  it("converts math italic ???? ? PV", () => {
    expect(deUnicodeText("\uD835\uDC43\uD835\uDC49")).toBe("PV");
  });

  it("converts × ? \\times", () => {
    expect(deUnicodeText("3\u00D710")).toBe("3\\times 10");
  });

  it("converts a ? \\alpha", () => {
    expect(deUnicodeText("\u03B1")).toBe("\\alpha");
  });

  it("converts superscript ² ? ^{2}", () => {
    expect(deUnicodeText("x\u00B2")).toBe("x^{2}");
  });

  it("converts subscript 2 ? _{2}", () => {
    expect(deUnicodeText("x\u2082")).toBe("x_{2}");
  });

  it("converts h (U+210E Planck constant) to h", () => {
    expect(deUnicodeText("\u210E")).toBe("h");
  });

  it("converts ? to \\hbar", () => {
    expect(deUnicodeText("\u210F")).toBe("\\hbar ");
  });
});

describe("integration - real failing inputs from bugs", () => {
  it("screenshot bug: B0[sin(3.14 \\t× 10^7)ct]", () => {
    const input =
      "B = B_0[\\sin(3.14 \\t\u00D7 10^7)ct + \\sin(6.28 \\t\u00D7 10^7)ct]";
    const r = normalizeText(input);
    expect(r).toContain("\\times");
    expect(r).not.toContain("\\t\u00D7");
    expect(r).not.toContain("extimes");
  });

  it("screenshot bug: c = 3 \\t× 10^8 \\text{ ms}^{-1}", () => {
    const input = "$(c = 3 \\t\u00D7 10^8 \\text{ ms}^{-1})$";
    const r = normalizeText(input);
    expect(r).toContain("\\times");
    expect(r).toContain("\\text{ ms}");
  });

  it("match-the-column: 5/18 ?\\t ×10-4", () => {
    const input = "5/18 \u2062\\t \u00D710\u207B\u2074 SI unit";
    const r = normalizeText(input);
    expect(r).toContain("\\times");
    expect(r).not.toContain("\u2062");
    expect(r).not.toContain("\u00D7");
  });

  it("corrupted arrow: ???????????????", () => {
    const input =
      "\uD835\uDC4E\u2062\uD835\uDC5F\u2062\uD835\uDC5F\u2062\uD835\uDC5C\u2062\uD835\uDC64\u2062";
    const r = normalizeText(input);
    expect(r).toContain("\\rightarrow");
    expect(r).not.toContain("\u2062");
  });

  it("Unicode-heavy: 1.5?× 10³ N/m²", () => {
    const input = "1.5\u2062\u00D7 10\u00B3 N/m\u00B2";
    const r = normalizeText(input);
    expect(r).toContain("\\times");
    expect(r).toContain("^{3}");
    expect(r).toContain("^{2}");
    expect(r).not.toContain("\u2062");
  });

  it("fixes theta with Planck constant h", () => {
    const input = "\uD835\uDC61\u2062\u210E\u2061\uD835\uDC52\u2062\uD835\uDC61\u2062\uD835\uDC4E";
    const r = normalizeText(input);
    expect(r).toContain("\\theta");
  });

  it("fixes arrowP,T (no word boundary)", () => {
    const r = normalizeText("arrowP,T");
    expect(r).toContain("\\rightarrow");
  });

  it("fixes TAB + imes from JSON corruption", () => {
    const r = normalizeText("3	imes 5");
    expect(r).toContain("\\times");
  });
});