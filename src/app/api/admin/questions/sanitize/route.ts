import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sanitizeOptions, sanitizeQuestionText } from "@/lib/text-sanitize";

const runSanitize = async (request?: Request) => {
  await requireAdmin();

  let batchSize = 200;
  let cursor: string | null = null;
  if (request) {
    const url = new URL(request.url);
    const qsBatch = url.searchParams.get("batchSize");
    const qsCursor = url.searchParams.get("cursor");
    if (qsBatch && Number.isFinite(Number(qsBatch))) {
      batchSize = Math.min(500, Math.max(50, Number(qsBatch)));
    }
    if (qsCursor) cursor = String(qsCursor);
    try {
      const body = await request.json();
      if (Number.isFinite(body?.batchSize)) {
        batchSize = Math.min(500, Math.max(50, Number(body.batchSize)));
      }
      if (body?.cursor) cursor = String(body.cursor);
    } catch {
      // ignore
    }
  }

  const questions = await prisma.question.findMany({
    take: batchSize,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { id: "asc" },
    select: { id: true, prompt: true, solution: true, options: true },
  });

  let updated = 0;
  for (const question of questions) {
    const nextPrompt = sanitizeQuestionText(question.prompt ?? "");
    const nextSolution = question.solution ? sanitizeQuestionText(question.solution) : null;
    const nextOptions = sanitizeOptions(Array.isArray(question.options) ? question.options : []);

    const promptChanged = nextPrompt !== (question.prompt ?? "");
    const solutionChanged = (nextSolution ?? null) !== (question.solution ?? null);
    const optionsChanged = JSON.stringify(nextOptions) !== JSON.stringify(question.options ?? []);

    if (!promptChanged && !solutionChanged && !optionsChanged) continue;

    await prisma.question.update({
      where: { id: question.id },
      data: {
        prompt: nextPrompt,
        solution: nextSolution,
        options: nextOptions,
      },
    });
    updated += 1;
  }

  const nextCursor = questions.length ? questions[questions.length - 1].id : null;
  return NextResponse.json({
    processed: questions.length,
    updated,
    nextCursor,
    done: questions.length < batchSize,
  });
};

export async function POST(request: Request) {
  return runSanitize(request);
}

export async function GET() {
  return runSanitize();
}
