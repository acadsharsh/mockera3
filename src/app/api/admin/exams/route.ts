import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  const exams = await prisma.exam.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(exams);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const exam = await prisma.exam.create({
    data: {
      name: String(body.name ?? "").trim(),
      shortCode: body.shortCode ? String(body.shortCode).trim() : null,
      order: Number(body.order ?? 0),
      active: body.active !== false,
    },
  });
  return NextResponse.json(exam);
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const exam = await prisma.exam.update({
    where: { id: String(body.id) },
    data: {
      name: body.name ? String(body.name).trim() : undefined,
      shortCode: body.shortCode !== undefined ? (body.shortCode ? String(body.shortCode).trim() : null) : undefined,
      order: body.order !== undefined ? Number(body.order) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    },
  });
  return NextResponse.json(exam);
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
