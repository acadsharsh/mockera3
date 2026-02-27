import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [questionCount, chapterRows, examRows, maxYear] = await Promise.all([
    prisma.question.count({
      where: { test: { isPyq: true } },
    }),
    prisma.question.findMany({
      where: {
        test: { isPyq: true },
        chapter: { not: null },
      },
      distinct: ["chapter"],
      select: { chapter: true },
    }),
    prisma.test.findMany({
      where: { isPyq: true, exam: { not: null } },
      distinct: ["exam"],
      select: { exam: true },
    }),
    prisma.test.aggregate({
      where: { isPyq: true, year: { not: null } },
      _max: { year: true },
    }),
  ]);

  return NextResponse.json({
    questions: questionCount,
    chapters: chapterRows.length,
    exams: examRows.length,
    latestYear: maxYear._max.year ?? null,
  });
}
