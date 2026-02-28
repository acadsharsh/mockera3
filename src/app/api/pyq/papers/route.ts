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

  const rows = await prisma.examPaper.findMany({
    where,
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { exam: true, test: true },
  });
  return NextResponse.json(rows, { headers: cacheHeaders });
}
