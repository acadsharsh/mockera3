import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  const subject = searchParams.get("subject");

  const chapters = await prisma.chapter.findMany({
    where: {
      examId: examId || undefined,
      subject: subject || undefined,
    },
    orderBy: [{ subject: "asc" }, { order: "asc" }, { name: "asc" }],
    include: {
      topics: { orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  });

  return NextResponse.json(chapters);
}
