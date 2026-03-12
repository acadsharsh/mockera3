import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sanitizeOptions, sanitizeQuestionText } from "@/lib/text-sanitize";
import { sanitizeForDB } from "@/lib/latex-escape";

const runSanitize = async (request?: Request) => {
  await requireAdmin();

  let batchSize = 200;
  let auto = false;
  let maxBatches = 1;
  let maxSeconds = 6;
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
    const qsBatches = url.searchParams.get("batches");
    if (qsBatches && Number.isFinite(Number(qsBatches))) {
      maxBatches = Math.min(20, Math.max(1, Number(qsBatches)));
    }
    const qsSeconds = url.searchParams.get("seconds");
    if (qsSeconds && Number.isFinite(Number(qsSeconds))) {
      maxSeconds = Math.min(20, Math.max(2, Number(qsSeconds)));
    }
    try {
      const body = await request.json();
      if (Number.isFinite(body?.batchSize)) {
        batchSize = Math.min(500, Math.max(50, Number(body.batchSize)));
      }
      if (body?.cursor) cursor = String(body.cursor);
      if (body?.auto) auto = true;
      if (Number.isFinite(body?.batches)) {
        maxBatches = Math.min(20, Math.max(1, Number(body.batches)));
      }
      if (Number.isFinite(body?.seconds)) {
        maxSeconds = Math.min(20, Math.max(2, Number(body.seconds)));
      }
    } catch {
      // ignore
    }
  }

  let processed = 0;
  let updated = 0;
  let nextCursor = cursor;
  let done = false;

  const started = Date.now();
  let batches = 0;
  do {
    const questions = await prisma.question.findMany({
      take: batchSize,
      ...(nextCursor ? { skip: 1, cursor: { id: nextCursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, prompt: true, solution: true, options: true },
    });

    processed += questions.length;

    for (const question of questions) {
      const nextPrompt = sanitizeForDB(sanitizeQuestionText(question.prompt ?? ""));
      const nextSolution = question.solution
        ? sanitizeForDB(sanitizeQuestionText(question.solution))
        : null;
      const nextOptions = sanitizeOptions(Array.isArray(question.options) ? question.options : []).map(
        sanitizeForDB
      );

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
    batches += 1;
  } while (auto && !done && batches < maxBatches && Date.now() - started < maxSeconds * 1000);

  return NextResponse.json({
    processed,
    updated,
    nextCursor,
    done,
    auto,
    batches,
    maxBatches,
    maxSeconds,
    debug: {
      url: request?.url ?? null,
      autoQuery: request ? new URL(request.url).searchParams.get("auto") : null,
    },
  });
};

export async function POST(request: Request) {
  return runSanitize(request);
}

export async function GET(request: Request) {
  return runSanitize(request);
}
