import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const prompt = `Estimate difficulty for each question as Easy, Moderate, or Tough. Return STRICT JSON: {"items":[{"id":string,"difficulty":"Easy"|"Moderate"|"Tough"}]}.

Input:
${JSON.stringify(payload).slice(0, 12000)}`;
  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);
  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
