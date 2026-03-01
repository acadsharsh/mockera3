import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { pusherServer } from "@/lib/pusher/server";

export async function POST(request: Request) {
  const session = await requireUser();
  const payload = await request.json();
  const code = String(payload?.code || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const room = await prisma.matchRoom.findUnique({
    where: { code },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Only host can start" }, { status: 403 });
  }

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + room.timeLimitMinutes * 60 * 1000);

  const updated = await prisma.matchRoom.update({
    where: { id: room.id },
    data: { status: "LIVE", startAt, endAt },
  });

  await pusherServer.trigger(`match-${room.code}`, "match:started", {
    roomId: updated.id,
    startAt: updated.startAt,
    endAt: updated.endAt,
  });

  return NextResponse.json({ room: updated });
}
