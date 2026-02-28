import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const { questionId } = await params;
  if (!questionId) {
    return NextResponse.json({ error: "Missing question id." }, { status: 400 });
  }

  const item = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      test: {
        select: { id: true, title: true, exam: true, year: true, shift: true },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}
