import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  const year = searchParams.get("year");
  const shift = searchParams.get("shift");
  const where: any = {};
  if (examId) where.examId = examId;
  if (year) where.year = Number(year);
  if (shift) where.shift = shift;

  const rows = await prisma.test.findMany({
    where: {
      isYearPaper: true,
      examId: examId || undefined,
      year: year ? Number(year) : undefined,
      shift: shift || undefined,
    },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { examRef: true },
  });
  return NextResponse.json(
    rows.map((t) => ({
      id: t.id,
      year: t.year,
      shift: t.shift,
      exam: t.examRef ? { id: t.examRef.id, name: t.examRef.name } : null,
      test: { id: t.id, title: t.title },
    })),
    { headers: cacheHeaders }
  );
}
