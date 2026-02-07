import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testId = searchParams.get("testId");
  if (!testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }
  const bands = await prisma.testPercentileBand.findMany({
    where: { testId },
    orderBy: { minScore: "asc" },
  });
  return NextResponse.json(bands);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const testId: string | undefined = body?.testId;
  const bands: Array<{
    minScore: number;
    maxScore?: number | null;
    percentileLabel: string;
  }> | undefined = body?.bands;

  if (!testId || !Array.isArray(bands)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.testPercentileBand.deleteMany({ where: { testId } });

  if (bands.length > 0) {
    await prisma.testPercentileBand.createMany({
      data: bands.map((band) => ({
        testId,
        minScore: Number(band.minScore),
        maxScore: band.maxScore === null || band.maxScore === undefined ? null : Number(band.maxScore),
        percentileLabel: String(band.percentileLabel),
      })),
    });
  }

  const saved = await prisma.testPercentileBand.findMany({
    where: { testId },
    orderBy: { minScore: "asc" },
  });
  return NextResponse.json(saved);
}
