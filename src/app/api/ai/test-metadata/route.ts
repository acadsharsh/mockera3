import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const text = String(payload?.text || "").slice(0, 12000);
  const prompt = `You are generating metadata for a CBT test. Return STRICT JSON only: {"description": string, "tags": string[]}.
Use short description (max 200 chars) and 3-6 tags.

Content:
${text}`;
  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);
  try {
    const parsed = JSON.parse(content);
    return NextResponse.json({
      description: String(parsed.description || "").slice(0, 200),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 6) : [],
    });
  } catch {
    return NextResponse.json({ description: "", tags: [] }, { status: 200 });
  }
}
