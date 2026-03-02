import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  const tests = await prisma.test.findMany({
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    tests.map((t) => ({
      id: t.id,
      title: t.title,
      visibility: t.visibility,
      hidden: t.hidden,
      ownerEmail: t.owner?.email ?? null,
      createdAt: t.createdAt,
      isPyq: t.isPyq,
      isYearPaper: t.isYearPaper,
      exam: t.exam,
      examId: t.examId,
      year: t.year,
      shift: t.shift,
    }))
  );
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const payload = await request.json();
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const updated = await prisma.test.update({
    where: { id: payload.id },
    data: {
      hidden: payload.hidden !== undefined ? Boolean(payload.hidden) : undefined,
      isPyq: payload.isPyq !== undefined ? Boolean(payload.isPyq) : undefined,
      isYearPaper: payload.isYearPaper !== undefined ? Boolean(payload.isYearPaper) : undefined,
      examId: payload.examId !== undefined ? (payload.examId ? String(payload.examId) : null) : undefined,
      exam: payload.exam !== undefined ? (payload.exam ? String(payload.exam) : null) : undefined,
      year: payload.year !== undefined && payload.year !== null && payload.year !== "" ? Number(payload.year) : payload.year === null || payload.year === "" ? null : undefined,
      shift: payload.shift !== undefined ? (payload.shift ? String(payload.shift) : null) : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.test.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
