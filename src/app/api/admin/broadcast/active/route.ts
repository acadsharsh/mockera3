import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json(null, { status: 200 });
  }
  const now = new Date();
  const item = await prisma.broadcastMessage.findFirst({
    where: {
      active: true,
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: { lte: now }, endsAt: { gte: now } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(item ?? null);
}
