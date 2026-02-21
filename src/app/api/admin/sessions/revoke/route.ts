import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await requireAdmin();
  const payload = await request.json();
  if (!payload?.userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  await prisma.session.deleteMany({ where: { userId: payload.userId } });
  return NextResponse.json({ ok: true });
}
