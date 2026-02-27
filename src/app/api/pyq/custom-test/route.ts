import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";

const parseIntMaybe = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export async function POST(req: Request) {
  const session = await requireUser();
  const body = await req.json();
  const questionIds: string[] = Array.isArray(body.questionIds) ? body.questionIds : [];
  const limit = Math.min(Number(body.limit ?? 50), 200);

  let questions = [] as Awaited<ReturnType<typeof prisma.question.findMany>>;

  if (questionIds.length) {
    questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { test: true },
      take: limit,
    });
  } else {
    const examId = body.examId ? String(body.examId) : null;
    const exam = body.exam ? String(body.exam) : null;
    const year = parseIntMaybe(body.year ?? null);
    const shift = body.shift ? String(body.shift) : null;
    const subject = body.subject ? String(body.subject) : null;
    const chapter = body.chapter ? String(body.chapter) : null;
    const topic = body.topic ? String(body.topic) : null;
    const difficulty = body.difficulty ? String(body.difficulty) : null;

    questions = await prisma.question.findMany({
      where: {
        test: {
          isPyq: true,
          ...(examId ? { examId } : {}),
          ...(exam && !examId ? { exam } : {}),
          ...(year ? { year } : {}),
          ...(shift ? { shift } : {}),
        },
        ...(subject ? { subject } : {}),
        ...(chapter ? { chapter } : {}),
        ...(topic ? { topic } : {}),
        ...(difficulty ? { difficulty } : {}),
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { test: true },
    });
  }

  if (!questions.length) {
    return NextResponse.json({ error: "No questions matched." }, { status: 400 });
  }

  const title = String(body.title ?? "Custom PYQ Mock");
  const durationMinutes = Number(body.durationMinutes ?? 180);
  const markingCorrect = Number(body.markingCorrect ?? 4);
  const markingIncorrect = Number(body.markingIncorrect ?? -1);

  const created = await prisma.test.create({
    data: {
      title,
      description: "Custom PYQ mock built from filtered questions.",
      visibility: "Private",
      durationMinutes,
      markingCorrect,
      markingIncorrect,
      ownerId: session.user.id,
      tags: ["PYQ", "CUSTOM"],
      questions: {
        create: questions.map((q) => ({
          subject: q.subject,
          difficulty: q.difficulty,
          questionType: q.questionType,
          correctOption: q.correctOption,
          correctNumeric: q.correctNumeric,
          marksCorrect: q.marksCorrect,
          marksIncorrect: q.marksIncorrect,
          imageUrl: q.imageUrl,
          cropX: q.cropX,
          cropY: q.cropY,
          cropW: q.cropW,
          cropH: q.cropH,
          prompt: q.prompt,
          options: q.options ?? Prisma.JsonNull,
          chapter: q.chapter,
          topic: q.topic,
        })),
      },
    },
  });

  return NextResponse.json({ testId: created.id });
}
