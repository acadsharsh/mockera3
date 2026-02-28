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
  const chapter = await prisma.chapter.create({
    data: {
      examId: body.examId ? String(body.examId) : null,
      subject: String(body.subject ?? "").trim(),
      name: String(body.name ?? "").trim(),
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
  await prisma.chapter.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
