import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SHIELD_COST = 200;
const SHIELD_HOURS = 24;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { performanceCredits: true, rankShieldUntil: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if ((user.performanceCredits ?? 0) < SHIELD_COST) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 400 });
  }

  const now = new Date();
  const nextUntil = new Date(now.getTime() + SHIELD_HOURS * 60 * 60 * 1000);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      performanceCredits: (user.performanceCredits ?? 0) - SHIELD_COST,
      rankShieldUntil: nextUntil,
    },
    select: { performanceCredits: true, rankShieldUntil: true },
  });

  return NextResponse.json({
    performanceCredits: updated.performanceCredits,
    rankShieldUntil: updated.rankShieldUntil?.toISOString() ?? null,
  });
}
