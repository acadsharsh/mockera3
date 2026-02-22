import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const prompt = `Summarize performance and key mistakes. Return STRICT JSON: {"summary":string,"mistakes":string[]}.
Keep summary under 500 chars.

Input:
${JSON.stringify(payload).slice(0, 12000)}`;
  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);
  try {
    const parsed = JSON.parse(content);
    return NextResponse.json({
      summary: String(parsed.summary || ""),
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.map(String).slice(0, 6) : [],
    });
  } catch {
    return NextResponse.json({ summary: "", mistakes: [] }, { status: 200 });
  }
}
