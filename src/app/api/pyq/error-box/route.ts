import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const isCorrect = (question: any, selected?: string) => {
  if (!selected) return false;
  if (question.questionType === "NUM") {
    return selected.trim() === (question.correctNumeric ?? "").trim();
  }
  if (question.questionType === "MSQ") {
    const expected = (question.correctOption ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    const got = selected
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return got !== "" && got === expected;
  }
  return selected === question.correctOption;
};

export async function GET() {
  const session = await requireUser();
  const attempts = await prisma.attempt.findMany({
    where: { userId: session.user.id, status: { not: "DRAFT" } },
    include: { test: { include: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  const wrongQuestionIds = new Set<string>();

  attempts.forEach((attempt) => {
    const answers = (attempt.answers ?? {}) as Record<string, string>;
    attempt.test.questions.forEach((question) => {
      const selected = answers[question.id];
      if (selected && !isCorrect(question, selected)) {
        wrongQuestionIds.add(question.id);
      }
    });
  });

  const questions = await prisma.question.findMany({
    where: { id: { in: Array.from(wrongQuestionIds) } },
    include: { test: { select: { id: true, title: true, exam: true, year: true } } },
  });

  return NextResponse.json({ total: questions.length, items: questions });
}
