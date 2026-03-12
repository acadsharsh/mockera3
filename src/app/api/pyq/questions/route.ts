import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeFromDB } from "@/lib/latex-escape";

const parseIntMaybe = (value: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export async function GET(req: Request) {
  const cacheHeaders = {
    "Cache-Control": "private, max-age=0, no-store",
  };
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  const exam = searchParams.get("exam");
  const year = parseIntMaybe(searchParams.get("year"));
  const shift = searchParams.get("shift");
  const subject = searchParams.get("subject");
  const chapter = searchParams.get("chapter");
  const topic = searchParams.get("topic");
  const difficulty = searchParams.get("difficulty");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

  const where = {
    test: {
      isPyq: true,
      ...(examId ? { examId } : {}),
      ...(exam && !examId ? { exam } : {}),
      ...(year ? { year } : {}),
      ...(shift ? { shift } : {}),
    },
    ...(subject ? { subject } : {}),
    ...(chapter ? { chapter } : {}),
    ...(topic ? { topic } : {}),
    ...(difficulty ? { difficulty } : {}),
  } as const;

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        test: {
          select: { id: true, title: true, exam: true, year: true, shift: true },
        },
      },
    }),
  ]);

  const sanitized = items.map((item) => ({
    ...item,
    prompt: sanitizeFromDB(item.prompt ?? ""),
    solution: sanitizeFromDB(item.solution ?? ""),
    options: Array.isArray(item.options) ? (item.options as string[]).map(sanitizeFromDB) : item.options,
  }));

  return NextResponse.json({ total, items: sanitized }, { headers: cacheHeaders });
}
