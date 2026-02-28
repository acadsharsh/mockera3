import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id." }, { status: 400 });
  }

  const item = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      test: {
        select: { id: true, title: true, exam: true, year: true, shift: true },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const attempts = await prisma.attempt.findMany({
    where: { testId: item.testId },
    select: { answers: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, number>();
  let total = 0;
  const normalize = (raw: string) => raw.trim().toUpperCase();

  attempts.forEach((attempt) => {
    const answers = attempt.answers as Record<string, string | undefined> | null;
    const raw = answers?.[questionId];
    if (!raw) return;
    const cleaned = normalize(raw);
    if (!cleaned) return;
    total += 1;

    if (item.questionType === "MSQ") {
      const parts = cleaned
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      parts.forEach((letter) => {
        counts.set(letter, (counts.get(letter) ?? 0) + 1);
      });
      return;
    }

    const key = cleaned;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const distribution = Array.from(counts.entries()).map(([value, count]) => ({
    value,
    count,
    percent: total ? Math.round((count / total) * 100) : 0,
  }));

  return NextResponse.json({ item, stats: { total, distribution } });
}
