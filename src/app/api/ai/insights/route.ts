import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { groqChat } from "@/lib/groq";

export async function POST(request: Request) {
  await requireUser();
  const payload = await request.json();
  const prompt = `You are an education analytics engine. Return STRICT JSON only with keys:
{
  "percentilePrediction": string,
  "weakTopics": string[],
  "mistakePatterns": string[],
  "revisionPlan": string[],
  "strategy": string,
  "forecast": string,
  "rankProbability": string
}
Use the provided data to infer weaknesses, strategy, and predictions.
Revision plan should be a list of question IDs or short labels (max 20 items).

DATA:
${JSON.stringify(payload).slice(0, 12000)}`;

  const content = await groqChat([
    { role: "system", content: "Return JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      percentilePrediction: "",
      weakTopics: [],
      mistakePatterns: [],
      revisionPlan: [],
      strategy: "",
      forecast: "",
      rankProbability: "",
    });
  }
}
