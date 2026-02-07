import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption: "A" | "B" | "C" | "D";
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
  questionText?: string;
  options?: string[];
  x: number;
  y: number;
  w: number;
  h: number;
};

const mapTest = (test: any) => ({
  id: test.id,
  title: test.title,
  visibility: test.visibility as "Public" | "Private",
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
    correctOption: q.correctOption,
    marks: "+4/-1",
    difficulty: q.difficulty,
    imageDataUrl: q.imageUrl,
    questionText: q.prompt ?? "",
    options: (q.options as string[]) ?? [],
    questionType: q.questionType as Crop["questionType"],
    correctOptions: q.correctOption ? (q.correctOption as string).split(",") : [],
    correctNumeric: q.correctNumeric ?? undefined,
    x: q.cropX,
    y: q.cropY,
    w: q.cropW,
    h: q.cropH,
  })),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const latest = url.searchParams.get("latest");
  const testId = url.searchParams.get("testId");

  if (testId) {
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        OR: [{ visibility: "Public" }, { ownerId: session.user.id }],
      },
      include: { questions: true },
    });
    return NextResponse.json(test ? mapTest(test) : null);
  }

  if (latest) {
    const latestTest = await prisma.test.findFirst({
      where: {
        OR: [{ visibility: "Public" }, { ownerId: session.user.id }],
      },
      include: { questions: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(latestTest ? mapTest(latestTest) : null);
  }

  const tests = await prisma.test.findMany({
    where: {
      OR: [{ visibility: "Public" }, { ownerId: session.user.id }],
    },
    include: { questions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tests.map(mapTest));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    title: string;
    visibility: "Public" | "Private";
    accessCode?: string;
    durationMinutes: number;
    markingCorrect: number;
    markingIncorrect: number;
    lockNavigation?: boolean;
    crops: Crop[];
  };

  const created = await prisma.test.create({
    data: {
      title: payload.title,
      visibility: payload.visibility,
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
          correctOption:
            crop.questionType === "MSQ"
              ? (crop.correctOptions ?? []).join(",")
              : crop.questionType === "NUM"
              ? null
              : crop.correctOption,
          correctNumeric: crop.questionType === "NUM" ? crop.correctNumeric ?? "" : null,
          marksCorrect: payload.markingCorrect,
          marksIncorrect: payload.markingIncorrect,
          imageUrl: crop.imageDataUrl,
          cropX: crop.x,
          cropY: crop.y,
          cropW: crop.w,
          cropH: crop.h,
          prompt: crop.questionText ?? "",
          options: crop.options ?? [],
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(mapTest(created), { status: 201 });
}
