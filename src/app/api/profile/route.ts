import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      performanceCredits: true,
      streakDays: true,
      lastAttemptAt: true,
      rankShieldUntil: true,
    },
  });

  const testsCount = await prisma.test.count({
    where: { ownerId: session.user.id },
  });

  const attemptsAgg = await prisma.attempt.aggregate({
    where: { userId: session.user.id },
    _count: { id: true },
    _sum: { timeTaken: true },
    _avg: { accuracy: true, score: true },
    _max: { score: true, createdAt: true },
    _min: { timeTaken: true },
  });

  const attempts = await prisma.attempt.findMany({
    where: { userId: session.user.id },
    include: {
      test: {
        select: {
          questions: {
            select: { id: true, subject: true, correctOption: true },
          },
        },
      },
    },
  });

  const subjectStatsMap = new Map<string, { attempted: number; correct: number }>();
  attempts.forEach((attempt) => {
    const answers = attempt.answers as Record<string, string>;
    attempt.test.questions.forEach((question) => {
      const selected = answers?.[question.id];
      if (!selected) return;
      const existing = subjectStatsMap.get(question.subject) ?? { attempted: 0, correct: 0 };
      existing.attempted += 1;
      if (question.correctOption && selected === question.correctOption) {
        existing.correct += 1;
      }
      subjectStatsMap.set(question.subject, existing);
    });
  });

  const subjectStats = Array.from(subjectStatsMap.entries()).map(([subject, stats]) => ({
    subject,
    attempted: stats.attempted,
    correct: stats.correct,
    accuracy: stats.attempted ? stats.correct / stats.attempted : 0,
  }));

  const strongestSubject = subjectStats
    .slice()
    .sort((a, b) => b.accuracy - a.accuracy)[0]?.subject;

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { expires: "desc" },
    take: 5,
    select: { id: true, expires: true },
  });

  return NextResponse.json({
    user,
    stats: {
      testsCount,
      attemptsCount: attemptsAgg._count.id,
      totalTimeSeconds: attemptsAgg._sum.timeTaken ?? 0,
      avgAccuracy: attemptsAgg._avg.accuracy ?? 0,
      avgScore: attemptsAgg._avg.score ?? 0,
      bestScore: attemptsAgg._max.score ?? 0,
      fastestAttemptSeconds: attemptsAgg._min.timeTaken ?? 0,
      lastAttemptAt: attemptsAgg._max.createdAt?.toISOString() ?? null,
      strongestSubject: strongestSubject ?? null,
      performanceCredits: user?.performanceCredits ?? 0,
      streakDays: user?.streakDays ?? 0,
      rankShieldUntil: user?.rankShieldUntil?.toISOString() ?? null,
      subjectStats,
    },
    sessions: sessions.map((item) => ({
      id: item.id,
      expires: item.expires.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    name?: string;
    image?: string;
  };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: payload.name ?? undefined,
      image: payload.image ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  return NextResponse.json({ user: updated });
}
