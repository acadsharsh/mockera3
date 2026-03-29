# JEE Question Extraction Prompt (v3.2)

Extract all questions from the provided document into a strict JSON format.

---

## 1. THE CRITICAL RULE: BACKSLASH ESCAPING IN JSON

JSON uses backslash as an escape character. These LaTeX commands WILL BREAK if you use a single backslash:

| Single backslash (BROKEN) | Double backslash (CORRECT) | Why it breaks |
|---|---|---|
| \times | \\times | \t = TAB |
| \text{} | \\text{} | \t = TAB |
| \theta | \\theta | \t = TAB |
| \tau | \\tau | \t = TAB |
| \tan | \\tan | \t = TAB |
| \to | \\to | \t = TAB |
| \nu | \\nu | \n = NEWLINE |
| \neq | \\neq | \n = NEWLINE |
| \nabla | \\nabla | \n = NEWLINE |
| \right | \\right | \r = CARRIAGE RETURN |
| \rho | \\rho | \r = CARRIAGE RETURN |
| \frac | \\frac | \f = FORM FEED |
| \beta | \\beta | \b = BACKSPACE |
| \bar | \\bar | \b = BACKSPACE |

ALL other LaTeX commands must also be double-escaped: \\alpha, \\gamma, \\delta, \\omega, \\Omega, \\Delta, \\pi, \\sigma, \\lambda, \\mu, \\phi, \\sqrt, \\vec, \\hat, \\log, \\sin, \\cos, \\left, \\right, \\infty, \\sum, \\int, \\lim, \\cdot, \\div, \\pm, \\leq, \\geq, \\approx.

**Rule: every backslash you write in LaTeX = two backslashes in the JSON string.**

### CORRECT JSON example:

```json
{"text": "If $\\theta = \\frac{\\pi}{2}$ and $F = 3 \\times 10^{-5} \\text{ N}$"}
```

### WRONG JSON example:

```json
{"text": "If $\theta = \frac{\pi}{2}$ and $F = 3 \times 10^{-5} \text{ N}$"}
```

---

## 2. FORBIDDEN: UNICODE CHARACTERS

NEVER output any Unicode math symbols. Always use double-escaped LaTeX.

| Unicode char | Write instead |
|---|---|
| × (multiply) | \\times |
| · (middle dot) | \\cdot |
| ÷ (division) | \\div |
| ± (plus-minus) | \\pm |
| ˜ (approx) | \\approx |
| ? (not equal) | \\neq |
| = (less-equal) | \\leq |
| = (greater-equal) | \\geq |
| ? (right arrow) | \\rightarrow |
| ? (left arrow) | \\leftarrow |
| ? (equilibrium) | \\rightleftharpoons |
| 8 (infinity) | \\infty |
| - (unicode minus) | - (ASCII hyphen-minus) |
| a | \\alpha |
| ß | \\beta |
| ? | \\gamma |
| d | \\delta |
| e | \\varepsilon |
| ? | \\zeta |
| ? | \\eta |
| ? | \\theta |
| ? | \\lambda |
| µ | \\mu |
| ? | \\nu |
| ? | \\xi |
| p | \\pi |
| ? | \\rho |
| s | \\sigma |
| t | \\tau |
| f | \\phi |
| ? | \\chi |
| ? | \\psi |
| ? | \\omega |
| O | \\Omega |
| ? | \\Delta |
| S | \\Sigma |
| G | \\Gamma |
| ? | \\Lambda |
| ? | \\Pi |
| F | \\Phi |
| ? | \\Psi |

Also NEVER output:
- Math italic Unicode (?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? h) — use plain ASCII: B P V a b c n r t h
- Invisible Unicode (U+2062 invisible times, U+2061 function application, U+2063 invisible separator) — delete entirely
- Superscript digits (° ¹ ² ³ 4 5 6 7 8 ?) — use ^{n}
- Subscript digits (0 1 2 3 4 5 6 7 8 9) — use _{n}
- The Planck constant symbol h (U+210E) — use plain h

---

## 2.5 PDF CORRUPTION PATTERNS — DO NOT COPY VERBATIM

The PDF text extractor produces CORRUPTED text. NEVER copy-paste raw extracted text. Always INTERPRET the mathematical meaning and REWRITE it cleanly in LaTeX.

### Common corruptions you will see:

| Corrupted text | Actual meaning | Write in JSON |
|---|---|---|
| ???h????????? | theta | $\\theta$ |
| ?????????h??? | alpha | $\\alpha$ |
| ??????????? | beta | $\\beta$ |
| ?????????????? or ? | right arrow | \\rightarrow |
| ?????????????? or × | multiplication | \\times |
| ??????????? | fraction | \\frac{}{} |
| ? (invisible char) | nothing | delete it |
| ?? ?? ?? ?? (italic) | regular letters | B P V n |
| h (Planck constant symbol) | letter h | h |
| 5?×10?4 | 5 times 10^-4 | $5 \\times 10^{-4}$ |
| 10?4 or 10-4 | 10 to the -4 | $10^{-4}$ |
| imes | times | \\times |
| ext | (delete) | \\text{} |
| extimes | times | \\times |

---

## 3. JSON Schema

```json
{
  "questions": [
    {
      "number": 1,
      "text": "Question text with $\\LaTeX$ in dollar signs",
      "questionType": "MCQ",
      "options": ["(A) first option", "(B) second option", "(C) third option", "(D) fourth option"],
      "answer": "A",
      "correctOptions": ["A", "C"],
      "correctNumeric": "42.5",
      "exam": "JEE Advanced",
      "year": 2025,
      "shift": "FT-I Paper 1",
      "subject": "Physics",
      "difficulty": "Moderate",
      "marksCorrect": 3,
      "marksIncorrect": -1,
      "hasDiagram": false
    }
  ]
}
```

Field rules:
- "questionType": one of "MCQ", "MSQ", "NUM"
- MCQ (single correct): fill "answer" with single letter A/B/C/D. marksCorrect=3, marksIncorrect=-1
- MSQ (one or more correct): fill "correctOptions" with array of letters. marksCorrect=4, marksIncorrect=-2
- NUM (numerical): fill "correctNumeric" with numeric string. marksCorrect=4, marksIncorrect=0
- Matching list type: questionType="MCQ" (since there is one correct code A/B/C/D). marksCorrect=3, marksIncorrect=-1
- "options": include for MCQ/MSQ, use empty array [] for NUM
- "hasDiagram": true if question references a figure/diagram you cannot reproduce in text

---

## 4. Math Formatting Rules

- Wrap ALL math expressions and variables in $...$
- Always use braces for multi-char sub/superscripts: $10^{-3}$ not $10^-3$
- Ion charges: $\\text{Fe}^{2+}$, $\\text{Cl}^{-}$, $\\text{SO}_4^{2-}$
- Fractions: always \\frac{a}{b}, never a/b inside math mode
- Units: inside \\text{} with leading space: $5 \\text{ kg}$, $3 \\times 10^8 \\text{ m/s}$
- Ratios: always \\frac{C_p}{C_v}, never C_p/C_v
- Vectors: \\vec{F} or \\hat{i}
- Chemical formulas: $\\text{H}_2\\text{O}$, $\\text{NaCl}$

### Matching List Type questions:

Format with a markdown table inside the text field. Use \\rightarrow for arrows between entries.

Example:
```
"text": "Match List-I with List-II:\n\n| List-I | List-II |\n|---|---|\n| (P) statement P | (1) statement 1 |\n| (Q) statement Q | (2) statement 2 |\n\nThe correct option is:"
```

For the options, format as:
```
"options": ["(A) P \\rightarrow 1; Q \\rightarrow 2; R \\rightarrow 3; S \\rightarrow 4", ...]
```

---

## 5. Structure and Cleaning

- Statement questions: format as **Statement I:** text followed by **Statement II:** text
- Remove: section labels like [Section A], Part-I, SECTION-A, page numbers, headers/footers, watermarks
- Paragraph questions: put shared paragraph in first question's text
- Sub-parts that are NOT options: keep as part of text
- For questions with diagrams: set hasDiagram=true and describe the diagram briefly in the text if possible

---

## 6. SELF-CHECK BEFORE OUTPUTTING

Scan your ENTIRE JSON output. If ANY of these exist, fix them:

| Pattern found | Bug | Fix |
|---|---|---|
| A single \ before t, n, r, b, f | Will become control character | Add extra \ |
| Any × a ß ? ? µ p etc. | Unicode math symbol | Use \\times \\alpha etc. |
| Any ?? ?? ?? ?? ?? ?? h | Math italic Unicode | Use plain ASCII |
| Any ? (invisible times) | Invisible character | Delete it |
| extimes or bare imes | Corrupted \\times | Use \\times |
| arrow as plain text | Corrupted \\rightarrow | Use \\rightarrow |
| 10-4 or 10-4 (no caret) | Missing superscript | Use $10^{-4}$ |
| Unmatched $ signs | Broken math delimiters | Pair every $ |
| ^ or _ without braces on multi-char | Missing braces | Add {} |

---

## 7. OUTPUT FORMAT

Output ONLY the raw JSON object. No commentary. No explanation. No markdown code fences around the JSON. Start with { and end with }.