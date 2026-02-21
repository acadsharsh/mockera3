import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdmin();
  const items = await prisma.broadcastMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  const payload = await request.json();
  const created = await prisma.broadcastMessage.create({
    data: {
      title: payload.title ?? "",
      body: payload.body ?? "",
      active: Boolean(payload.active),
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
      createdById: session.user?.id ?? null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
