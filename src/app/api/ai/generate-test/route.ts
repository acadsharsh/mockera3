import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const questionText = String(payload?.questionText ?? "");
  const answerKeyText = String(payload?.answerKeyText ?? "");

  const prompt = `You are extracting a CBT test from PDFs. Return ONLY valid JSON in this exact schema:
{
  "questions": [
    {
      "number": 1,
      "subject": "Physics", 
      "section": "Section 1",
      "text": "Question text",
      "options": ["A ...","B ...","C ...","D ..."],
      "answer": "B",
      "hasDiagram": false
    }
  ]
}
Rules:
- Include every question in order; do not skip numbers. If something is unreadable, still include the question with empty text/options.
- Always set "subject" and "section" for each question so we can categorize them.
- If a question references a diagram/figure/graph or contains an image, set "hasDiagram": true.
- If numeric answer, set "answer" to the number as a string.
- If multiple correct, use "answer": "A,C".
- Use the answer key text to fill "answer" for each question.
- Do not include any extra keys or commentary.

QUESTION_PDF_TEXT:
${questionText.slice(0, 12000)}

ANSWER_KEY_TEXT:
${answerKeyText.slice(0, 12000)}`;

  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
}
