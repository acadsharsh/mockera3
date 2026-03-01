import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examId = searchParams.get("examId") ?? "";
  if (!examId) {
    return NextResponse.json({ error: "examId required" }, { status: 400 });
  }

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, name: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  }

  const baseWhere = { test: { isPyq: true, examId } } as const;

  const [
    totalQuestions,
    subjectGroups,
    difficultyGroups,
    typeGroups,
    chapterRows,
    topicRows,
    chapterTagged,
    topicTagged,
    testsWithYear,
  ] = await Promise.all([
    prisma.question.count({ where: baseWhere }),
    prisma.question.groupBy({
      by: ["subject"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.question.groupBy({
      by: ["difficulty"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.question.groupBy({
      by: ["questionType"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.question.findMany({
      where: { ...baseWhere, chapter: { not: null } },
      distinct: ["chapter"],
      select: { chapter: true },
    }),
    prisma.question.findMany({
      where: { ...baseWhere, topic: { not: null } },
      distinct: ["topic"],
      select: { topic: true },
    }),
    prisma.question.count({
      where: { ...baseWhere, chapter: { not: null } },
    }),
    prisma.question.count({
      where: { ...baseWhere, topic: { not: null } },
    }),
    prisma.test.findMany({
      where: { isPyq: true, examId, year: { not: null } },
      select: {
        id: true,
        year: true,
        shift: true,
        _count: { select: { questions: true } },
      },
    }),
  ]);

  const yearCounts = new Map<number, number>();
  const shiftCounts = new Map<string, number>();
  let totalPaperQuestions = 0;

  testsWithYear.forEach((test) => {
    const year = test.year ?? 0;
    const count = test._count.questions ?? 0;
    totalPaperQuestions += count;
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + count);
    const shiftKey = test.shift?.trim() || "Unspecified";
    shiftCounts.set(shiftKey, (shiftCounts.get(shiftKey) ?? 0) + count);
  });

  const years = Array.from(yearCounts.keys()).sort((a, b) => a - b);
  const yearDistribution = years.map((year) => ({
    year,
    count: yearCounts.get(year) ?? 0,
  }));

  const shiftDistribution = Array.from(shiftCounts.entries())
    .map(([shift, count]) => ({ shift, count }))
    .sort((a, b) => b.count - a.count);

  const avgQuestionsPerPaper =
    testsWithYear.length > 0 ? Math.round(totalPaperQuestions / testsWithYear.length) : 0;

  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  return NextResponse.json(
    {
      exam,
      totals: {
        questions: totalQuestions,
        chapters: chapterRows.length,
        topics: topicRows.length,
        papers: testsWithYear.length,
        avgQuestionsPerPaper,
      },
      coverage: {
        chapterTagged,
        topicTagged,
      },
      distribution: {
        subjects: subjectGroups.map((row) => ({ key: row.subject, count: row._count._all })),
        difficulty: difficultyGroups.map((row) => ({ key: row.difficulty, count: row._count._all })),
        types: typeGroups.map((row) => ({ key: row.questionType, count: row._count._all })),
        years: yearDistribution,
        shifts: shiftDistribution,
      },
      years: {
        earliest: years[0] ?? null,
        latest: years[years.length - 1] ?? null,
        span: years.length > 1 ? years[years.length - 1] - years[0] + 1 : years.length,
      },
    },
    { headers: cacheHeaders }
  );
}
