import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  candidateName?: string;
  batchCode?: string;
  score?: number;
  accuracy?: number;
  timeTaken?: number;
  performanceCredits?: number;
  streakMultiplier?: number;
  answers: Record<string, string>;
  timeSpent: Record<string, number>;
  events?: Record<string, unknown>;
  userId?: string;
  userName?: string;
  userImage?: string | null;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const testId = url.searchParams.get("testId");
  const batchCode = url.searchParams.get("batchCode");
  const scope = url.searchParams.get("scope");

  const attempts = await prisma.attempt.findMany({
    where: {
      ...(scope === "global" ? {} : { userId: session.user.id }),
      ...(testId ? { testId } : {}),
      ...(batchCode ? { batchCode } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    attempts.map((attempt) => ({
      id: attempt.id,
      testId: attempt.testId,
      createdAt: attempt.createdAt.toISOString(),
      candidateName: attempt.candidateName ?? undefined,
      batchCode: attempt.batchCode ?? undefined,
      score: attempt.score ?? 0,
      accuracy: attempt.accuracy ?? 0,
      timeTaken: attempt.timeTaken ?? 0,
      performanceCredits: attempt.performanceCredits ?? 0,
      streakMultiplier: attempt.streakMultiplier ?? 1,
      answers: attempt.answers as Attempt["answers"],
      timeSpent: attempt.timeSpent as Attempt["timeSpent"],
      events: (attempt.events as Record<string, unknown>) ?? undefined,
      userId: attempt.userId,
      userName: attempt.user?.name ?? "Anonymous",
      userImage: attempt.user?.image ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Omit<Attempt, "id" | "createdAt"> & {
    answerChanges?: Record<string, number>;
    rapidChanges?: Record<string, number>;
    firstAnsweredAt?: Record<string, number>;
    tabSwitches?: number;
    idleGaps?: number;
    idleSeconds?: number;
    sectionOrder?: Array<"Physics" | "Chemistry" | "Maths">;
  };

  const test = await prisma.test.findUnique({
    where: { id: payload.testId },
    include: { questions: true },
  });

  if (!test) {
    return NextResponse.json({ error: "Test not found" }, { status: 404 });
  }

  const isCorrectAnswer = (question: any, selected?: string) => {
    if (!selected) return false;
    if (question.questionType === "NUM") {
      const normalized = selected.trim();
      return normalized !== "" && normalized === (question.correctNumeric ?? "").trim();
    }
    if (question.questionType === "MSQ") {
      const expected = (question.correctOption ?? "")
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean)
        .sort()
        .join(",");
      const got = selected
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort()
        .join(",");
      return got !== "" && got === expected;
    }
    return selected === question.correctOption;
  };

  let score = 0;
  let attempted = 0;
  let correct = 0;
  test.questions.forEach((question) => {
    const selected = (payload.answers as Record<string, string>)[question.id];
    if (!selected) return;
    attempted += 1;
    if (question.questionType === "NUM") {
      const normalized = selected.trim();
      const isCorrect = normalized !== "" && normalized === (question.correctNumeric ?? "").trim();
      if (isCorrect) {
        score += test.markingCorrect;
        correct += 1;
      } else {
        score += test.markingIncorrect;
      }
      return;
    }
    if (question.questionType === "MSQ") {
      const expected = (question.correctOption ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort()
        .join(",");
      const got = selected
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort()
        .join(",");
      if (got && got === expected) {
        score += test.markingCorrect;
        correct += 1;
      } else {
        score += test.markingIncorrect;
      }
      return;
    }
    if (selected === question.correctOption) {
      score += test.markingCorrect;
      correct += 1;
    } else {
      score += test.markingIncorrect;
    }
  });
  const accuracy = attempted ? correct / attempted : 0;
  const timeTaken = Object.values(payload.timeSpent || {}).reduce((a, b) => a + b, 0);

  const previousAttempts = await prisma.attempt.findMany({
    where: { testId: payload.testId, status: "SUBMITTED" },
    select: { answers: true, timeSpent: true },
  });

  const globalStats = new Map<
    string,
    { attempted: number; correct: number; totalTime: number }
  >();
  test.questions.forEach((question) => {
    globalStats.set(question.id, { attempted: 0, correct: 0, totalTime: 0 });
  });

  previousAttempts.forEach((attemptItem) => {
    const answers = attemptItem.answers as Record<string, string>;
    const timeSpent = attemptItem.timeSpent as Record<string, number>;
    test.questions.forEach((question) => {
      const selected = answers?.[question.id];
      if (!selected) return;
      const stat = globalStats.get(question.id);
      if (!stat) return;
      stat.attempted += 1;
      if (isCorrectAnswer(question, selected)) {
        stat.correct += 1;
      }
      const seconds = timeSpent?.[question.id] ?? 0;
      if (seconds > 0) {
        stat.totalTime += seconds;
      }
    });
  });

  let baseCredits = 0;
  test.questions.forEach((question) => {
    const selected = (payload.answers as Record<string, string>)[question.id];
    const timeSpent = (payload.timeSpent as Record<string, number>)?.[question.id] ?? 0;
    const stat = globalStats.get(question.id);
    const attemptedCount = stat?.attempted ?? 0;
    const accuracyRate = attemptedCount ? (stat?.correct ?? 0) / attemptedCount : 0;
    const avgTime = attemptedCount ? (stat?.totalTime ?? 0) / attemptedCount : 0;
    const correctNow = isCorrectAnswer(question, selected);
    if (correctNow && question.difficulty === "Tough") {
      baseCredits += 20;
    }
    if (correctNow && accuracy > 0.9 && avgTime > 0 && timeSpent > 0 && timeSpent <= avgTime * 0.7) {
      baseCredits += 50;
    }
    if (!selected && accuracyRate > 0 && accuracyRate < 0.1) {
      baseCredits += 10;
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { performanceCredits: true, streakDays: true, lastAttemptAt: true },
  });

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  let nextStreak = 1;
  if (user?.lastAttemptAt) {
    const last = new Date(user.lastAttemptAt);
    const lastStart = new Date(last.getFullYear(), last.getMonth(), last.getDate()).getTime();
    const diffDays = Math.floor((todayStart - lastStart) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      nextStreak = Math.max(1, user.streakDays);
    } else if (diffDays === 1) {
      nextStreak = user.streakDays + 1;
    } else {
      nextStreak = 1;
    }
  }

  let streakMultiplier = 1;
  if (nextStreak >= 4) {
    streakMultiplier = 2.0;
  } else if (nextStreak === 3) {
    streakMultiplier = 1.5;
  } else if (nextStreak === 2) {
    streakMultiplier = 1.2;
  }
  const performanceCredits = Math.round(baseCredits * streakMultiplier);

  const events = {
    answerChanges: payload.answerChanges ?? {},
    rapidChanges: payload.rapidChanges ?? {},
    firstAnsweredAt: payload.firstAnsweredAt ?? {},
    tabSwitches: payload.tabSwitches ?? 0,
    idleGaps: payload.idleGaps ?? 0,
    idleSeconds: payload.idleSeconds ?? 0,
    sectionOrder: payload.sectionOrder ?? [],
  };

  const [attempt] = await prisma.$transaction([
    prisma.attempt.create({
      data: {
        testId: payload.testId,
        userId: session.user.id,
        candidateName: payload.candidateName ?? null,
        batchCode: payload.batchCode ?? null,
        status: "SUBMITTED",
        answers: payload.answers,
        timeSpent: payload.timeSpent,
        events,
        score,
        accuracy,
        timeTaken,
        performanceCredits,
        streakMultiplier,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        performanceCredits: (user?.performanceCredits ?? 0) + performanceCredits,
        streakDays: nextStreak,
        lastAttemptAt: new Date(),
        lastDecayAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json(
    {
      id: attempt.id,
      testId: attempt.testId,
      createdAt: attempt.createdAt.toISOString(),
      candidateName: attempt.candidateName ?? undefined,
      batchCode: attempt.batchCode ?? undefined,
      performanceCredits: attempt.performanceCredits ?? 0,
      streakMultiplier: attempt.streakMultiplier ?? 1,
      answers: attempt.answers as Attempt["answers"],
      timeSpent: attempt.timeSpent as Attempt["timeSpent"],
      events: (attempt.events as Record<string, unknown>) ?? undefined,
    },
    { status: 201 }
  );
}
