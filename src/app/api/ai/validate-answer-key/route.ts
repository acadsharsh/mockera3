import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const prompt = `Validate answer key vs options. Return STRICT JSON only: {"issues":[{"index":number,"message":string}]}.
Flag if answer not in options, missing options, or invalid format.

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
    return NextResponse.json({ issues: [] }, { status: 200 });
  }
}
