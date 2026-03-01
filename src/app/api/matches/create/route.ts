import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { pusherServer } from "@/lib/pusher/server";

const generateCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export async function POST(request: Request) {
  const session = await requireUser();
  const payload = await request.json();
  const {
    examId,
    year,
    subject,
    questionCount,
    timeLimitMinutes,
    mode = "DUEL",
    visibility = "PRIVATE",
  } = payload ?? {};

  const count = Math.min(Math.max(Number(questionCount) || 10, 5), 100);
  const duration = Math.min(Math.max(Number(timeLimitMinutes) || 20, 5), 180);

  const where = {
    test: {
      isPyq: true,
      ...(examId ? { examId } : {}),
      ...(year ? { year: Number(year) } : {}),
    },
    ...(subject ? { subject: String(subject) } : {}),
  };

  const candidates = await prisma.question.findMany({
    where,
    select: { id: true },
    take: 500,
  });

  const selected = shuffle(candidates).slice(0, count);

  let code = generateCode();
  for (let i = 0; i < 3; i += 1) {
    const existing = await prisma.matchRoom.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
  }

  const room = await prisma.matchRoom.create({
    data: {
      code,
      hostId: session.user.id,
      mode: String(mode),
      visibility: String(visibility),
      examId: examId ?? null,
      year: year ? Number(year) : null,
      subject: subject ? String(subject) : null,
      questionCount: selected.length,
      timeLimitMinutes: duration,
      participants: {
        create: {
          userId: session.user.id,
        },
      },
      questions: {
        create: selected.map((item, index) => ({
          questionId: item.id,
          order: index + 1,
        })),
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  await pusherServer.trigger(`match-${room.code}`, "room:update", {
    roomId: room.id,
    status: room.status,
  });

  return NextResponse.json({ room });
}
