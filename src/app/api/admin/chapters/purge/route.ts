import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const examId = String(body?.examId ?? "").trim();
  if (!examId) return NextResponse.json({ error: "Missing examId" }, { status: 400 });

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { id: true, name: true },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });

  const chapters = await prisma.chapter.findMany({
    where: { examId },
    select: { subject: true, name: true },
  });
  const valid = new Set(chapters.map((c) => `${c.subject}::${c.name}`));

  const questions = await prisma.question.findMany({
    where: {
      test: {
        isPyq: true,
        OR: [{ examId }, { exam: exam.name }],
      },
    },
    select: { id: true, subject: true, chapter: true },
  });

  const toDelete = questions
    .filter((q) => {
      const chapter = q.chapter?.trim() ?? "";
      if (!chapter) return true;
      const subject = q.subject ?? "General";
      return !valid.has(`${subject}::${chapter}`);
    })
    .map((q) => q.id);

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500);
    const res = await prisma.question.deleteMany({ where: { id: { in: chunk } } });
    deleted += res.count;
  }

  return NextResponse.json({ ok: true, deleted });
}
