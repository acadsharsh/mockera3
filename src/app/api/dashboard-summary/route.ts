import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheHeaders = {
    "Cache-Control": "private, max-age=120, stale-while-revalidate=300",
  };

  const latestAttemptPromise = prisma.attempt.findFirst({
    where: { userId, status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
    select: { score: true },
  });

  const attemptsCountPromise = prisma.attempt.count({
    where: { userId, status: "SUBMITTED" },
  });

  const avgScorePromise = prisma.attempt.aggregate({
    where: { userId, status: "SUBMITTED" },
    _avg: { score: true },
  });

  const recentAttemptsPromise = prisma.attempt.findMany({
    where: { userId, status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      testId: true,
      score: true,
      createdAt: true,
      test: { select: { title: true } },
    },
  });

  const publicTests = await prisma.test.findMany({
    where: { visibility: "Public" },
    select: { id: true, title: true },
    take: 50,
  });
  const publicIds = publicTests.map((t) => t.id);

  const trendingGroups = publicIds.length
    ? await prisma.attempt.groupBy({
        by: ["testId"],
        where: { testId: { in: publicIds }, status: "SUBMITTED" },
        _count: { testId: true },
        _avg: { timeTaken: true },
        orderBy: { _count: { testId: "desc" } },
        take: 3,
      })
    : [];

  const myTests = await prisma.test.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, title: true },
  });

  const myTestIds = myTests.map((t) => t.id);
  const myAttempts = myTestIds.length
    ? await prisma.attempt.findMany({
        where: { userId, status: "SUBMITTED", testId: { in: myTestIds } },
        orderBy: { createdAt: "desc" },
        select: { testId: true, score: true, createdAt: true },
      })
    : [];

  const [latestAttempt, attemptsCount, avgScoreResult, recentAttempts] = await Promise.all([
    latestAttemptPromise,
    attemptsCountPromise,
    avgScorePromise,
    recentAttemptsPromise,
  ]);

  const avgScore = Math.round(avgScoreResult._avg.score ?? 0);

  const trending = trendingGroups.map((group) => {
    const test = publicTests.find((t) => t.id === group.testId);
    const avgMinutes = Math.round(((group._avg.timeTaken ?? 0) / 60) || 0);
    return {
      id: group.testId,
      title: test?.title ?? "Untitled",
      attempts: group._count.testId ?? 0,
      avgMinutes,
    };
  });

  const myTestsSummary = myTests.map((test) => {
    const attempts = myAttempts.filter((a) => a.testId === test.id);
    const scores = attempts.map((a) => a.score ?? 0);
    const lastAttempt = attempts[0];
    return {
      id: test.id,
      title: test.title,
      attempts: attempts.length,
      lastScore: lastAttempt?.score ?? 0,
      bestScore: scores.length ? Math.max(...scores) : 0,
      lastAttemptAt: lastAttempt?.createdAt ?? null,
    };
  });

  return NextResponse.json(
    {
      user: { name: session.user?.name ?? "" },
      stats: {
        attemptsCount,
        lastScore: latestAttempt?.score ?? 0,
        avgScore,
      },
      recentAttempts: recentAttempts.map((attempt) => ({
        id: attempt.id,
        testId: attempt.testId,
        score: attempt.score ?? 0,
        createdAt: attempt.createdAt.toISOString(),
        testTitle: attempt.test?.title ?? "Untitled Test",
      })),
      trending,
      myTests: myTestsSummary.map((item) => ({
        ...item,
        lastAttemptAt: item.lastAttemptAt ? item.lastAttemptAt.toISOString() : null,
      })),
    },
    { headers: cacheHeaders }
  );
}
