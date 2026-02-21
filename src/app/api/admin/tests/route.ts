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
    data: { hidden: Boolean(payload.hidden) },
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
