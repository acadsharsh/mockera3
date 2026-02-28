import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.topic.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { chapter: { include: { exam: { select: { id: true, name: true } } } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const topic = await prisma.topic.create({
    data: {
      chapterId: String(body.chapterId),
      name: String(body.name ?? "").trim(),
      order: Number(body.order ?? 0),
    },
  });
  return NextResponse.json(topic);
}

export async function PATCH(req: Request) {
  await requireAdmin();
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const topic = await prisma.topic.update({
    where: { id: String(body.id) },
    data: {
      chapterId: body.chapterId ? String(body.chapterId) : undefined,
      name: body.name ? String(body.name).trim() : undefined,
      order: body.order !== undefined ? Number(body.order) : undefined,
    },
  });
  return NextResponse.json(topic);
}

export async function DELETE(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
