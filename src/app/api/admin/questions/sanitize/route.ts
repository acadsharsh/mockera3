import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sanitizeOptions, sanitizeQuestionText } from "@/lib/text-sanitize";

const runSanitize = async (request?: Request) => {
  await requireAdmin();

  let batchSize = 200;
  let auto = false;
  let cursor: string | null = null;
  if (request) {
    const url = new URL(request.url);
    const qsBatch = url.searchParams.get("batchSize");
    const qsCursor = url.searchParams.get("cursor");
    const qsAuto = url.searchParams.get("auto");
    if (qsBatch && Number.isFinite(Number(qsBatch))) {
      batchSize = Math.min(500, Math.max(50, Number(qsBatch)));
    }
    if (qsCursor) cursor = String(qsCursor);
    if (qsAuto !== null) {
      const normalized = qsAuto.trim().toLowerCase();
      auto = normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes";
    }
    try {
      const body = await request.json();
      if (Number.isFinite(body?.batchSize)) {
        batchSize = Math.min(500, Math.max(50, Number(body.batchSize)));
      }
      if (body?.cursor) cursor = String(body.cursor);
      if (body?.auto) auto = true;
    } catch {
      // ignore
    }
  }

  let processed = 0;
  let updated = 0;
  let nextCursor = cursor;
  let done = false;

  do {
    const questions = await prisma.question.findMany({
      take: batchSize,
      ...(nextCursor ? { skip: 1, cursor: { id: nextCursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, prompt: true, solution: true, options: true },
    });

    processed += questions.length;

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

    nextCursor = questions.length ? questions[questions.length - 1].id : null;
    done = questions.length < batchSize;
  } while (auto && !done);

  return NextResponse.json({
    processed,
    updated,
    nextCursor,
    done,
    auto,
    debug: {
      url: request?.url ?? null,
      autoQuery: request ? new URL(request.url).searchParams.get("auto") : null,
    },
  });
};

export async function POST(request: Request) {
  return runSanitize(request);
}

export async function GET() {
  return runSanitize();
}
