import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.chapter.findMany({
    orderBy: [{ examId: "asc" }, { subject: "asc" }, { order: "asc" }, { name: "asc" }],
    include: { topics: true, exam: { select: { id: true, name: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const subject = String(body.subject ?? "").trim();
  const name = String(body.name ?? "").trim();
  const examId = body.examId ? String(body.examId) : null;
  const iconUrl = body.iconUrl ? String(body.iconUrl) : null;

  const existing = await prisma.chapter.findFirst({
    where: { examId, subject, name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Chapter already exists.", chapter: existing },
      { status: 409 }
    );
  }

  const chapter = await prisma.chapter.create({
    data: {
      examId,
      subject,
      name,
      iconUrl,
      order: Number(body.order ?? 0),
    },
  });
  return NextResponse.json(chapter);
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const chapter = await prisma.chapter.update({
    where: { id: String(body.id) },
    data: {
      examId: body.examId !== undefined ? (body.examId ? String(body.examId) : null) : undefined,
      subject: body.subject ? String(body.subject).trim() : undefined,
      name: body.name ? String(body.name).trim() : undefined,
      iconUrl: body.iconUrl !== undefined ? (body.iconUrl ? String(body.iconUrl) : null) : undefined,
      order: body.order !== undefined ? Number(body.order) : undefined,
    },
  });
  return NextResponse.json(chapter);
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    select: { id: true, examId: true, subject: true, name: true },
  });
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.topic.deleteMany({ where: { chapterId: chapter.id } }),
    prisma.question.updateMany({
      where: {
        subject: chapter.subject,
        chapter: chapter.name,
        test: { examId: chapter.examId ?? undefined, isPyq: true },
      },
      data: { chapter: null, topic: null },
    }),
    prisma.chapter.delete({ where: { id: chapter.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
