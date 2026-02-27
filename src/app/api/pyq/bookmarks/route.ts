import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

export async function GET() {
  const session = await requireUser();
  const items = await prisma.savedQuestion.findMany({
    where: { userId: session.user.id },
    include: {
      question: {
        include: { test: { select: { id: true, title: true, exam: true, year: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await requireUser();
  const body = await req.json();
  const questionId = String(body.questionId ?? "");
  if (!questionId) return NextResponse.json({ error: "Missing questionId" }, { status: 400 });

  const existing = await prisma.savedQuestion.findUnique({
    where: { userId_questionId: { userId: session.user.id, questionId } },
  });

  if (existing) {
    await prisma.savedQuestion.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedQuestion.create({
    data: { userId: session.user.id, questionId },
  });
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: Request) {
  const session = await requireUser();
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
  await prisma.savedQuestion.deleteMany({
    where: { userId: session.user.id, questionId },
  });
  return NextResponse.json({ ok: true });
}
