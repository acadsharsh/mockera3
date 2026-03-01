import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

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
  const questionId = String(payload?.questionId || "");
  const examId = payload?.examId ? String(payload.examId) : null;
  const examName = payload?.examName ? String(payload.examName) : null;
  const subject = payload?.subject ? String(payload.subject) : null;
  const chapter = payload?.chapter ? String(payload.chapter) : null;
  const topic = payload?.topic ? String(payload.topic) : null;
  const answer = payload?.answer ? String(payload.answer) : "";
  const timeSpent = payload?.timeSpent ? Number(payload.timeSpent) : null;

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, questionType: true, correctOption: true, correctNumeric: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correctValue = question.questionType === "NUM" ? question.correctNumeric : question.correctOption;
  const isCorrect = isAnswerCorrect(question.questionType, answer, correctValue);

  const record = await prisma.pyqAttempt.create({
    data: {
      userId: session.user.id,
      examId,
      examName,
      questionId,
      subject,
      chapter,
      topic,
      answer,
      isCorrect,
      timeSpent,
    },
  });

  return NextResponse.json({ id: record.id, isCorrect });
}
