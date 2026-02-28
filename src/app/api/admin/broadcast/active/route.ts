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
  return NextResponse.json(item ?? null, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
