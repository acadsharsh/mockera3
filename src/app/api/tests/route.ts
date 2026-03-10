import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helpers";

const parseAdminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption: "" | "A" | "B" | "C" | "D";
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  solution?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
  questionText?: string;
  options?: string[];
  chapter?: string;
  topic?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

const mapTest = (test: any) => ({
  id: test.id,
  title: test.title,
  description: test.description ?? "",
  tags: test.tags ?? [],
  pdfUrl: test.pdfUrl ?? undefined,
  isPyq: Boolean(test.isPyq),
  exam: test.exam ?? undefined,
  examId: test.examId ?? undefined,
  year: test.year ?? undefined,
  shift: test.shift ?? undefined,
  visibility: test.visibility as "Public" | "Private",
  hidden: Boolean(test.hidden),
  ownerId: test.ownerId,
  accessCode: test.accessCode ?? undefined,
  durationMinutes: test.durationMinutes,
  markingCorrect: test.markingCorrect,
  markingIncorrect: test.markingIncorrect,
  lockNavigation: test.lockNavigation,
  createdAt: test.createdAt,
  crops: test.questions.map((q: any) => ({
    id: q.id,
    subject: q.subject,
    correctOption: q.correctOption ?? "",
    marks: "+4/-1",
    difficulty: q.difficulty,
    imageDataUrl: q.imageUrl,
    questionText: q.prompt ?? "",
    solution: q.solution ?? "",
    options: (q.options as string[]) ?? [],
    questionType: q.questionType as Crop["questionType"],
    correctOptions: q.correctOption ? (q.correctOption as string).split(",") : [],
    correctNumeric: q.correctNumeric ?? undefined,
    chapter: q.chapter ?? "",
    topic: q.topic ?? "",
    x: q.cropX,
    y: q.cropY,
    w: q.cropW,
    h: q.cropH,
  })),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const adminEmails = parseAdminEmails();
  const isAdmin = session.user.email ? adminEmails.includes(session.user.email.toLowerCase()) : false;
  const cacheHeaders = {
    "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
  };
  const url = new URL(request.url);
  const latest = url.searchParams.get("latest");
  const testId = url.searchParams.get("testId");
  const limitParam = url.searchParams.get("limit");
  const cursor = url.searchParams.get("cursor");
  const limit = limitParam ? Math.min(Number(limitParam) || 0, 100) : 0;

  if (testId) {
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        OR: [{ visibility: "Public", hidden: false }, { ownerId: session.user.id }],
      },
      include: { questions: true },
    });
    return NextResponse.json(test ? mapTest(test) : null, { headers: cacheHeaders });
  }

  if (latest) {
    const latestTest = await prisma.test.findFirst({
      where: {
        OR: [{ visibility: "Public", hidden: false }, { ownerId: session.user.id }],
      },
      include: { questions: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(latestTest ? mapTest(latestTest) : null, { headers: cacheHeaders });
  }

  if (!limit) {
    const tests = await prisma.test.findMany({
      where: {
        OR: [{ visibility: "Public", hidden: false }, { ownerId: session.user.id }],
      },
      include: { questions: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tests.map(mapTest), { headers: cacheHeaders });
  }

  const paged = await prisma.test.findMany({
    where: {
      OR: [{ visibility: "Public", hidden: false }, { ownerId: session.user.id }],
    },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = paged.length > limit;
  const items = hasMore ? paged.slice(0, limit) : paged;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  return NextResponse.json({ items: items.map(mapTest), nextCursor }, { headers: cacheHeaders });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    title: string;
    description?: string;
    tags?: string[];
    pdfUrl?: string;
    visibility: "Public" | "Private";
    accessCode?: string;
    durationMinutes: number;
    markingCorrect: number;
    markingIncorrect: number;
    lockNavigation?: boolean;
    isPyq?: boolean;
    examId?: string;
    exam?: string;
    year?: number;
    shift?: string;
    crops: Crop[];
  };

  const created = await prisma.test.create({
    data: {
      title: payload.title,
      description: payload.description ?? null,
      tags: payload.tags ?? [],
      pdfUrl: payload.pdfUrl ?? null,
      visibility: payload.visibility,
      isPyq: Boolean(payload.isPyq),
      examId: payload.examId ?? null,
      exam: payload.exam ?? null,
      year: payload.year ?? null,
      shift: payload.shift ?? null,
      accessCode: payload.visibility === "Private" ? payload.accessCode : null,
      durationMinutes: payload.durationMinutes,
      markingCorrect: payload.markingCorrect,
      markingIncorrect: payload.markingIncorrect,
      lockNavigation: Boolean(payload.lockNavigation),
      ownerId: session.user.id,
      questions: {
        create: payload.crops.map((crop) => ({
          subject: crop.subject,
          difficulty: crop.difficulty,
          questionType: crop.questionType ?? "MCQ",
          chapter: crop.chapter ?? null,
          topic: crop.topic ?? null,
          correctOption:
            crop.questionType === "MSQ"
              ? (crop.correctOptions ?? []).length
                ? (crop.correctOptions ?? []).join(",")
                : null
              : crop.questionType === "NUM"
              ? null
              : crop.correctOption || null,
          correctNumeric: crop.questionType === "NUM" ? crop.correctNumeric ?? "" : null,
          marksCorrect: payload.markingCorrect,
          marksIncorrect: payload.markingIncorrect,
          imageUrl: crop.imageDataUrl,
          cropX: crop.x,
          cropY: crop.y,
          cropW: crop.w,
          cropH: crop.h,
          prompt: crop.questionText ?? "",
          solution: crop.solution ?? null,
          options: crop.options ?? [],
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(mapTest(created), { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const testId = url.searchParams.get("testId");
  if (!testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }

  const ownedTest = await prisma.test.findFirst({
    where: { id: testId, ownerId: session.user.id },
    select: { id: true },
  });

  if (!ownedTest) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.test.delete({ where: { id: testId } });
  return NextResponse.json({ ok: true });
}


export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    testId?: string;
    title: string;
    description?: string;
    tags?: string[];
    pdfUrl?: string;
    visibility: "Public" | "Private";
    accessCode?: string;
    durationMinutes: number;
    markingCorrect: number;
    markingIncorrect: number;
    isPyq?: boolean;
    examId?: string;
    exam?: string;
    year?: number;
    shift?: string;
    crops: Array<any>;
    lockNavigation?: boolean;
  };

  if (!payload?.testId) {
    return NextResponse.json({ error: "Missing testId" }, { status: 400 });
  }

  const ownedTest = await prisma.test.findFirst({
    where: { id: payload.testId, ownerId: session.user.id },
    select: { id: true },
  });
  if (!ownedTest) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { testId: payload.testId } });
    return tx.test.update({
      where: { id: payload.testId },
      data: {
        title: payload.title,
        description: payload.description,
        tags: payload.tags ?? [],
        pdfUrl: payload.pdfUrl ?? null,
        visibility: payload.visibility,
        isPyq: Boolean(payload.isPyq),
        examId: payload.examId ?? null,
        exam: payload.exam ?? null,
        year: payload.year ?? null,
        shift: payload.shift ?? null,
        accessCode: payload.visibility === "Private" ? payload.accessCode : null,
        durationMinutes: payload.durationMinutes,
        markingCorrect: payload.markingCorrect,
        markingIncorrect: payload.markingIncorrect,
        lockNavigation: payload.lockNavigation ?? false,
        questions: {
          create: payload.crops.map((crop: any) => ({
            subject: crop.subject,
            difficulty: crop.difficulty,
            questionType: crop.questionType ?? "MCQ",
            marksCorrect: payload.markingCorrect,
            marksIncorrect: payload.markingIncorrect,
            correctOption:
            crop.questionType === "MSQ"
              ? (crop.correctOptions ?? []).length
                ? (crop.correctOptions ?? []).join(",")
                : null
              : crop.questionType === "NUM"
              ? null
              : crop.correctOption || null,
            correctNumeric: crop.questionType === "NUM" ? crop.correctNumeric ?? "" : null,
            chapter: crop.chapter ?? null,
            topic: crop.topic ?? null,
            imageUrl: crop.imageDataUrl,
            cropX: crop.x,
            cropY: crop.y,
            cropW: crop.w,
            cropH: crop.h,
            prompt: crop.questionText ?? "",
            solution: crop.solution ?? null,
            options: crop.options ?? [],
          })),
        },
      },
      include: { questions: true },
    });
  });

  return NextResponse.json(mapTest(updated));
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    testId?: string;
    entries?: Array<{ index?: number; value: string }>;
    title?: string;
    description?: string;
    tags?: string[];
    questions?: Array<{
      subject?: "Physics" | "Chemistry" | "Maths";
      questionType?: "MCQ" | "MSQ" | "NUM";
      answer?: string;
      correctOptions?: string[];
      correctNumeric?: string;
      solution?: string;
      options?: string[];
      questionText?: string;
      chapter?: string;
      topic?: string;
      difficulty?: "Easy" | "Moderate" | "Tough";
      imageUrl?: string;
    }>;
  };


  const wantsMetaUpdate = Boolean(
    payload?.testId &&
      (typeof payload.title === "string" ||
        typeof payload.description === "string" ||
        Array.isArray(payload.tags))
  );
  if (wantsMetaUpdate) {
    const ownedTest = await prisma.test.findFirst({
      where: { id: payload.testId, ownerId: session.user.id },
      select: { id: true },
    });
    if (!ownedTest) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await prisma.test.update({
      where: { id: payload.testId },
      data: {
        title: typeof payload.title === "string" ? payload.title : undefined,
        description:
          typeof payload.description === "string" ? payload.description : undefined,
        tags: Array.isArray(payload.tags) ? payload.tags : undefined,
      },
      include: { questions: true },
    });
    return NextResponse.json(mapTest(updated));
  }

  if (payload?.testId && Array.isArray(payload.questions)) {
    const ownedTest = await prisma.test.findFirst({
      where: { id: payload.testId, ownerId: session.user.id },
      include: { questions: true },
    });
    if (!ownedTest) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normalizeType = (value?: string, numeric?: string, options?: string[], corrects?: string[]) => {
      const raw = (value ?? "").toUpperCase();
      if (raw === "NUM" || raw === "MCQ" || raw === "MSQ") return raw as "MCQ" | "MSQ" | "NUM";
      if (numeric && String(numeric).trim() !== "") return "NUM";
      const correctList = Array.isArray(corrects) ? corrects.filter(Boolean) : [];
      if (correctList.length > 1) return "MSQ";
      return "MCQ";
    };

    const normalizeLetter = (value?: string) => (value ?? "").trim().toUpperCase();

    await prisma.question.deleteMany({ where: { testId: ownedTest.id } });

    const created = await prisma.test.update({
      where: { id: ownedTest.id },
      data: {
        questions: {
          create: payload.questions.map((q) => {
            const questionType = normalizeType(q.questionType, q.correctNumeric, q.options, q.correctOptions);
            const correctOptions = Array.isArray(q.correctOptions) ? q.correctOptions.map(normalizeLetter) : [];
            const answer = normalizeLetter(q.answer);
            const correctOption =
              questionType === "MSQ"
                ? correctOptions.length
                  ? correctOptions.join(",")
                  : answer
                : questionType === "NUM"
                ? null
                : answer || (correctOptions[0] ?? "");
            return {
              subject: q.subject ?? "Physics",
              difficulty: q.difficulty ?? "Moderate",
              questionType,
              chapter: q.chapter ?? null,
              topic: q.topic ?? null,
              correctOption: correctOption || null,
              correctNumeric: questionType === "NUM" ? (q.correctNumeric ?? "").trim() : null,
              marksCorrect: ownedTest.markingCorrect,
              marksIncorrect: ownedTest.markingIncorrect,
              imageUrl: q.imageUrl ? q.imageUrl : "",
              cropX: 0,
              cropY: 0,
              cropW: 0,
              cropH: 0,
              prompt: q.questionText ?? "",
              solution: q.solution ?? null,
              options: Array.isArray(q.options) ? q.options : [],
            };
          }),
        },
      },
      include: { questions: true },
    });

    return NextResponse.json(mapTest(created));
  }

  if (!payload?.testId || !payload.entries?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const test = await prisma.test.findFirst({
    where: { id: payload.testId, ownerId: session.user.id },
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!test) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ordered = test.questions;
  const updates: Prisma.PrismaPromise<any>[] = [];

  const normalize = (value: string) => value.trim().toUpperCase();

  payload.entries.forEach((entry, idx) => {
    const targetIndex = entry.index ? entry.index - 1 : idx;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;
    const question = ordered[targetIndex];
    const raw = normalize(entry.value);
    if (!raw) return;
    if (question.questionType === "NUM") {
      updates.push(
        prisma.question.update({
          where: { id: question.id },
          data: { correctNumeric: raw, correctOption: null },
        })
      );
      return;
    }
    const letters = raw.split(",").join("").split("");
    const cleaned = letters.filter((letter) => ["A", "B", "C", "D"].includes(letter));
    if (cleaned.length === 0) return;
    if (question.questionType === "MSQ") {
      updates.push(
        prisma.question.update({
          where: { id: question.id },
          data: { correctOption: cleaned.join(","), correctNumeric: null },
        })
      );
      return;
    }
    updates.push(
      prisma.question.update({
        where: { id: question.id },
        data: { correctOption: cleaned[0], correctNumeric: null },
      })
    );
  });

  if (updates.length === 0) {
    return NextResponse.json({ error: "No updates applied" }, { status: 400 });
  }

  await prisma.$transaction(updates);
  const refreshed = await prisma.test.findFirst({
    where: { id: test.id },
    include: { questions: true },
  });

  return NextResponse.json(refreshed ? mapTest(refreshed) : null);
}
