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
    include: { participants: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await prisma.matchParticipant.upsert({
    where: {
      roomId_userId: { roomId: room.id, userId: session.user.id },
    },
    update: {},
    create: {
      roomId: room.id,
      userId: session.user.id,
    },
  });

  await pusherServer.trigger(`match-${room.code}`, "room:update", {
    roomId: room.id,
    status: room.status,
  });

  return NextResponse.json({ roomId: room.id, code: room.code });
}
