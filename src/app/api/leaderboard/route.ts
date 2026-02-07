import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type LeaderRow = {
  userId: string;
  name: string;
  image?: string | null;
  performanceCredits: number;
  rankShieldUntil?: string | null;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "global";
  const batchCode = url.searchParams.get("batchCode");

  let userIds: string[] | null = null;
  if (scope === "batch" && batchCode) {
    const attempts = await prisma.attempt.findMany({
      where: { batchCode, status: "SUBMITTED" },
      select: { userId: true },
    });
    userIds = Array.from(new Set(attempts.map((attempt) => attempt.userId)));
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const users = await prisma.user.findMany({
    where: {
      ...(userIds ? { id: { in: userIds } } : {}),
      attempts: { some: { status: "SUBMITTED" } },
    },
    select: {
      id: true,
      name: true,
      image: true,
      performanceCredits: true,
      rankShieldUntil: true,
      lastAttemptAt: true,
      lastDecayAt: true,
    },
    orderBy: { performanceCredits: "desc" },
  });

  const decayUpdates: Array<{ id: string; performanceCredits: number; lastDecayAt: Date }> = [];

  users.forEach((user) => {
    const lastDecay = user.lastDecayAt ?? user.lastAttemptAt;
    if (!lastDecay) return;
    const lastDecayStart = new Date(
      lastDecay.getFullYear(),
      lastDecay.getMonth(),
      lastDecay.getDate()
    ).getTime();
    const shieldActive = user.rankShieldUntil && user.rankShieldUntil > now;
    if (shieldActive) {
      if (lastDecayStart < todayStart) {
        decayUpdates.push({
          id: user.id,
          performanceCredits: user.performanceCredits ?? 0,
          lastDecayAt: new Date(todayStart),
        });
      }
      return;
    }
    const days = Math.floor((todayStart - lastDecayStart) / dayMs);
    if (days <= 0) return;
    const currentCredits = user.performanceCredits ?? 0;
    const decayPerDay = Math.max(10, Math.floor(currentCredits * 0.01));
    const totalDecay = Math.min(currentCredits, decayPerDay * days);
    const nextCredits = Math.max(0, currentCredits - totalDecay);
    decayUpdates.push({
      id: user.id,
      performanceCredits: nextCredits,
      lastDecayAt: new Date(todayStart),
    });
  });

  if (decayUpdates.length > 0) {
    await prisma.$transaction(
      decayUpdates.map((update) =>
        prisma.user.update({
          where: { id: update.id },
          data: {
            performanceCredits: update.performanceCredits,
            lastDecayAt: update.lastDecayAt,
          },
        })
      )
    );
  }

  const updatedUsers = decayUpdates.length
    ? await prisma.user.findMany({
        where: {
          ...(userIds ? { id: { in: userIds } } : {}),
          attempts: { some: { status: "SUBMITTED" } },
        },
        select: {
          id: true,
          name: true,
          image: true,
          performanceCredits: true,
          rankShieldUntil: true,
        },
        orderBy: { performanceCredits: "desc" },
      })
    : users;

  const rows: LeaderRow[] = updatedUsers.map((user) => ({
    userId: user.id,
    name: user.name ?? "Anonymous",
    image: user.image ?? null,
    performanceCredits: user.performanceCredits ?? 0,
    rankShieldUntil: user.rankShieldUntil?.toISOString() ?? null,
  }));

  return NextResponse.json({
    rows,
    totalUsers: rows.length,
  });
}
