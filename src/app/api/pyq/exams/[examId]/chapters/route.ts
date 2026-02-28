import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ChapterBucket = {
  name: string;
  total: number;
  byYear: Record<number, number>;
};

type SubjectBucket = {
  name: string;
  total: number;
  chapters: Map<string, ChapterBucket>;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
  const { examId } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, name: true, shortCode: true },
  });

  if (!exam) {
    return NextResponse.json({ error: "Exam not found" }, { status: 404, headers: cacheHeaders });
  }

  const papers = await prisma.examPaper.findMany({
    where: { examId },
    select: { year: true },
  });

  const questionRows = await prisma.question.findMany({
    where: {
      test: {
        isPyq: true,
        examId,
      },
    },
    select: {
      subject: true,
      chapter: true,
      test: { select: { year: true } },
    },
  });

  const subjectMap = new Map<string, SubjectBucket>();
  const yearSet = new Set<number>();

  for (const row of questionRows) {
    const subject = row.subject || "General";
    const chapter = row.chapter || "Uncategorized";
    const year = row.test?.year ?? null;

    if (year) {
      yearSet.add(year);
    }

    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, { name: subject, total: 0, chapters: new Map() });
    }

    const subjectBucket = subjectMap.get(subject)!;
    subjectBucket.total += 1;

    if (!subjectBucket.chapters.has(chapter)) {
      subjectBucket.chapters.set(chapter, {
        name: chapter,
        total: 0,
        byYear: {},
      });
    }

    const chapterBucket = subjectBucket.chapters.get(chapter)!;
    chapterBucket.total += 1;

    if (year) {
      chapterBucket.byYear[year] = (chapterBucket.byYear[year] || 0) + 1;
    }
  }

  const years = Array.from(yearSet).sort((a, b) => b - a);
  const latestYears = years.slice(0, 2);

  const papersYears = papers.map((paper) => paper.year).filter(Boolean) as number[];
  const paperYearMin = papersYears.length ? Math.min(...papersYears) : null;
  const paperYearMax = papersYears.length ? Math.max(...papersYears) : null;

  const subjects = Array.from(subjectMap.values())
    .map((subject) => {
      const chapters = Array.from(subject.chapters.values())
        .map((chapter) => ({
          name: chapter.name,
          total: chapter.total,
          byYear: chapter.byYear,
        }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

      return {
        name: subject.name,
        total: subject.total,
        chapters,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  return NextResponse.json(
    {
    exam,
    summary: {
      papers: papers.length,
      questions: questionRows.length,
      yearMin: paperYearMin,
      yearMax: paperYearMax,
    },
    years,
    latestYears,
    subjects,
    },
    { headers: cacheHeaders }
  );
}
