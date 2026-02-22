import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const prompt = `Clean and normalize the question text and options. Fix grammar, spacing, and math notation. Preserve meaning.
Return STRICT JSON only: {"questions":[{"id":string,"text":string,"options":string[]}]}.

Input:
${JSON.stringify({ questions }).slice(0, 12000)}`;
  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);
  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ questions: [] }, { status: 200 });
  }
}
