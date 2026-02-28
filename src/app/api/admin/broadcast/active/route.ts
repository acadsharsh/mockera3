import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const item = await prisma.broadcastMessage.findFirst({
    where: {
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (!item) {
    const fallback = await prisma.broadcastMessage.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fallback ?? null, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  return NextResponse.json(item ?? null, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
