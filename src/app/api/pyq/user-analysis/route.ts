import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

const parseRange = (range: string | null) => {
  if (!range || range === "all") return null;
  const match = range.match(/^(\d+)(d|w|m)$/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  const days = unit === "d" ? value : unit === "w" ? value * 7 : value * 30;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return start;
};

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

export async function GET(request: Request) {
  const session = await requireUser();
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId") ?? "";
  const range = searchParams.get("range") ?? "all";
  if (!examId) {
    return NextResponse.json({ error: "examId required" }, { status: 400 });
  }

  const startAt = parseRange(range);

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, name: true },
  });

  const attempts = await prisma.attempt.findMany({
    where: {
      userId: session.user.id,
      status: "SUBMITTED",
      ...(startAt ? { createdAt: { gte: startAt } } : {}),
      test: {
        isPyq: true,
        OR: [
          { examId },
          ...(exam?.name ? [{ exam: exam.name }] : []),
        ],
      },
    },
    include: {
      test: {
        include: { questions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const peerScores = await prisma.attempt.findMany({
    where: {
      status: "SUBMITTED",
      ...(startAt ? { createdAt: { gte: startAt } } : {}),
      test: {
        isPyq: true,
        OR: [
          { examId },
          ...(exam?.name ? [{ exam: exam.name }] : []),
        ],
      },
    },
    select: { score: true },
  });

  let totalQuestions = 0;
  let attempted = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let scoreSum = 0;
  let negativeMarks = 0;
  let timeWastedWrong = 0;

  const subjectTime = new Map<string, number>();
  const topicStats = new Map<
    string,
    { attempted: number; correct: number; subject?: string }
  >();
  const questionTime = new Map<
    string,
    { time: number; count: number; label: string }
  >();
  const fatigue = [
    { attempted: 0, correct: 0 },
    { attempted: 0, correct: 0 },
    { attempted: 0, correct: 0 },
    { attempted: 0, correct: 0 },
  ];

  attempts.forEach((attempt) => {
    const answers = attempt.answers as Record<string, string>;
    const timeSpent = attempt.timeSpent as Record<string, number>;
    scoreSum += attempt.score ?? 0;
    totalQuestions += attempt.test.questions.length;
    const questions = attempt.test.questions;
    const quarterSize = Math.max(1, Math.ceil(questions.length / 4));
    questions.forEach((question, index) => {
      const selected = answers?.[question.id];
      const spent = timeSpent?.[question.id] ?? 0;
      const hasAnswer = Boolean(selected && selected.trim() !== "");
      if (!hasAnswer) {
        skipped += 1;
      } else {
        attempted += 1;
        if (isCorrectAnswer(question, selected)) {
          correct += 1;
        } else {
          wrong += 1;
          negativeMarks += Math.abs(question.marksIncorrect ?? 0);
          timeWastedWrong += spent;
        }
      }

      const subject = question.subject || "Unknown";
      subjectTime.set(subject, (subjectTime.get(subject) ?? 0) + spent);

      if (question.topic) {
        const entry = topicStats.get(question.topic) ?? {
          attempted: 0,
          correct: 0,
          subject: question.subject,
        };
        if (hasAnswer) {
          entry.attempted += 1;
          if (isCorrectAnswer(question, selected)) entry.correct += 1;
        }
        topicStats.set(question.topic, entry);
      }

      const label = question.topic || question.chapter || question.subject || "Question";
      const qEntry = questionTime.get(question.id) ?? { time: 0, count: 0, label };
      if (spent > 0) {
        qEntry.time += spent;
        qEntry.count += 1;
      }
      questionTime.set(question.id, qEntry);

      const bucket = Math.min(3, Math.floor(index / quarterSize));
      if (hasAnswer) {
        fatigue[bucket].attempted += 1;
        if (isCorrectAnswer(question, selected)) fatigue[bucket].correct += 1;
      }
    });
  });

  const attemptsCount = attempts.length;
  const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
  const attemptRate = totalQuestions ? Math.round((attempted / totalQuestions) * 100) : 0;
  const avgScore = attemptsCount ? Math.round(scoreSum / attemptsCount) : 0;

  const peerScoresList = peerScores.map((item) => item.score ?? 0);
  const peerCount = peerScoresList.length;
  let percentile: number | null = null;
  let rank: number | null = null;
  if (peerCount > 0) {
    const higher = peerScoresList.filter((score) => score > avgScore).length;
    const atOrBelow = peerScoresList.filter((score) => score <= avgScore).length;
    rank = higher + 1;
    percentile = Math.round((atOrBelow / peerCount) * 100);
  }

  const subjectTimeList = Array.from(subjectTime.entries())
    .map(([subject, time]) => ({ subject, time }))
    .sort((a, b) => b.time - a.time);

  const questionTimeList = Array.from(questionTime.entries())
    .map(([id, data]) => ({
      id,
      avgTime: data.count ? Math.round(data.time / data.count) : 0,
      label: data.label,
    }))
    .filter((item) => item.avgTime > 0)
    .sort((a, b) => b.avgTime - a.avgTime);

  const fatigueAccuracy = fatigue.map((bucket) =>
    bucket.attempted ? Math.round((bucket.correct / bucket.attempted) * 100) : 0
  );

  const topics = Array.from(topicStats.entries())
    .map(([topic, data]) => ({
      topic,
      subject: data.subject ?? "Unknown",
      attempted: data.attempted,
      correct: data.correct,
      accuracy: data.attempted ? Math.round((data.correct / data.attempted) * 100) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const trend = attempts
    .slice(0, 12)
    .map((attempt) => ({
      date: attempt.createdAt.toISOString(),
      score: attempt.score ?? 0,
      accuracy: Math.round((attempt.accuracy ?? 0) * 100),
      timeTaken: attempt.timeTaken ?? 0,
    }))
    .reverse();

  return NextResponse.json({
    summary: {
      attempts: attemptsCount,
      totalQuestions,
      attempted,
      correct,
      wrong,
      skipped,
      scoreSum,
      avgScore,
      accuracy,
      attemptRate,
      negativeMarks,
      percentile,
      rank,
      peerCount,
    },
    trend,
    time: {
      bySubject: subjectTimeList,
      slowest: questionTimeList.slice(0, 5),
      fastest: questionTimeList.slice(-5).reverse(),
      wastedOnWrong: timeWastedWrong,
      fatigue: fatigueAccuracy,
    },
    topics: {
      list: topics.slice(0, 12),
      strongest: topics[0] ?? null,
      weakest: topics.length ? topics[topics.length - 1] : null,
    },
  });
}
