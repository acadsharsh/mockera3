import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { sanitizeFromDB } from "@/lib/latex-escape";

export async function GET(request: Request) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const code = String(searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const room = await prisma.matchRoom.findUnique({
    where: { code },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: {
              id: true,
              prompt: true,
              options: true,
              questionType: true,
              subject: true,
              chapter: true,
              topic: true,
              imageUrl: true,
              cropX: true,
              cropY: true,
              cropW: true,
              cropH: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({
    room: {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      mode: room.mode,
      visibility: room.visibility,
      examId: room.examId,
      year: room.year,
      subject: room.subject,
      questionCount: room.questionCount,
      timeLimitMinutes: room.timeLimitMinutes,
      status: room.status,
      startAt: room.startAt,
      endAt: room.endAt,
    },
    participants: room.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.user?.name ?? "User",
      image: p.user?.image ?? null,
      score: p.score,
      accuracy: p.accuracy,
      correct: p.correct,
      wrong: p.wrong,
      skipped: p.skipped,
    })),
    questions: room.questions.map((q) => ({
      order: q.order,
      ...q.question,
      prompt: sanitizeFromDB(q.question.prompt ?? ""),
      options: Array.isArray(q.question.options)
        ? (q.question.options as string[]).map(sanitizeFromDB)
        : q.question.options,
    })),
  });
}
