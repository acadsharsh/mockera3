import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { pusherServer } from "@/lib/pusher/server";

const normalizeSet = (value: string | null | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

const isAnswerCorrect = (type: string | null | undefined, answer: string | null, correct: string | null) => {
  if (!correct) return false;
  if (type === "NUM") {
    return String(answer ?? "").trim() === String(correct).trim();
  }
  const ansSet = normalizeSet(answer);
  const correctSet = normalizeSet(correct);
  if (!ansSet.size || ansSet.size !== correctSet.size) return false;
  for (const item of correctSet) {
    if (!ansSet.has(item)) return false;
  }
  return true;
};

export async function POST(request: Request) {
  const session = await requireUser();
  const payload = await request.json();
  const code = String(payload?.code || "").trim().toUpperCase();
  const questionId = String(payload?.questionId || "");
  const answer = payload?.answer ? String(payload.answer) : "";
  const timeSpent = payload?.timeSpent ? Number(payload.timeSpent) : null;

  if (!code || !questionId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const room = await prisma.matchRoom.findUnique({ where: { code } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, questionType: true, correctOption: true, correctNumeric: true, marksCorrect: true, marksIncorrect: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correctValue = question.questionType === "NUM" ? question.correctNumeric : question.correctOption;
  const isCorrect = isAnswerCorrect(question.questionType, answer, correctValue);
  const isSkipped = !answer?.trim();

  await prisma.matchAnswer.upsert({
    where: {
      roomId_userId_questionId: {
        roomId: room.id,
        userId: session.user.id,
        questionId,
      },
    },
    update: {
      answer,
      isCorrect,
      timeSpent,
    },
    create: {
      roomId: room.id,
      userId: session.user.id,
      questionId,
      answer,
      isCorrect,
      timeSpent,
    },
  });

  const answers = await prisma.matchAnswer.findMany({
    where: { roomId: room.id, userId: session.user.id },
    include: {
      question: {
        select: { marksCorrect: true, marksIncorrect: true },
      },
    },
  });

  let score = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  answers.forEach((item) => {
    if (!item.answer || !item.answer.trim()) {
      skipped += 1;
      return;
    }
    if (item.isCorrect) {
      correct += 1;
      score += item.question.marksCorrect ?? 0;
    } else {
      wrong += 1;
      score -= item.question.marksIncorrect ?? 0;
    }
  });
  const attempted = correct + wrong;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;

  await prisma.matchParticipant.update({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: session.user.id,
      },
    },
    data: {
      score,
      correct,
      wrong,
      skipped,
      accuracy,
    },
  });

  const participants = await prisma.matchParticipant.findMany({
    where: { roomId: room.id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { score: "desc" },
  });

  await pusherServer.trigger(`match-${room.code}`, "score:update", {
    participants: participants.map((p) => ({
      userId: p.userId,
      name: p.user?.name ?? "User",
      image: p.user?.image ?? null,
      score: p.score,
      accuracy: p.accuracy,
      correct: p.correct,
      wrong: p.wrong,
      skipped: p.skipped,
    })),
  });

  return NextResponse.json({ ok: true, isCorrect, score });
}
