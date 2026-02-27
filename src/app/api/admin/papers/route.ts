import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.examPaper.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    include: { exam: true, test: true },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const paper = await prisma.examPaper.create({
    data: {
      examId: String(body.examId),
      year: Number(body.year),
      shift: body.shift ? String(body.shift) : null,
      pdfUrl: String(body.pdfUrl),
      testId: body.testId ? String(body.testId) : null,
    },
  });
  return NextResponse.json(paper);
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const paper = await prisma.examPaper.update({
    where: { id: String(body.id) },
    data: {
      examId: body.examId ? String(body.examId) : undefined,
      year: body.year !== undefined ? Number(body.year) : undefined,
      shift: body.shift !== undefined ? (body.shift ? String(body.shift) : null) : undefined,
      pdfUrl: body.pdfUrl ? String(body.pdfUrl) : undefined,
      testId: body.testId !== undefined ? (body.testId ? String(body.testId) : null) : undefined,
    },
  });
  return NextResponse.json(paper);
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.examPaper.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
