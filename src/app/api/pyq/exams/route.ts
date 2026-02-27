import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const exams = await prisma.exam.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  if (exams.length) {
    return NextResponse.json(exams);
  }

  const fallback = await prisma.test.findMany({
    where: { isPyq: true, exam: { not: null } },
    distinct: ["exam"],
    select: { exam: true },
    orderBy: { exam: "asc" },
  });

  return NextResponse.json(
    fallback.map((item) => ({
      id: item.exam ?? "",
      name: item.exam ?? "",
      shortCode: item.exam?.slice(0, 3).toUpperCase() ?? "",
      order: 0,
      active: true,
    }))
  );
}
