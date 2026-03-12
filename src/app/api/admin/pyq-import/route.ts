import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sanitizeOptions, sanitizeQuestionText } from "@/lib/text-sanitize";
import { v2 as cloudinary } from "cloudinary";

type ImportLang = "en" | "hi";

type RawQuestion = {
  paperId: string;
  paperTitle: string;
  examName: string;
  year: number | null;
  shift: string | null;
  subject: string;
  chapter: string | null;
  topic: string | null;
  questionType: "MCQ" | "MSQ" | "NUM";
  difficulty: "Easy" | "Moderate" | "Tough";
  marksCorrect: number;
  marksIncorrect: number;
  prompt: string;
  options: string[];
  correctOptions: Array<"A" | "B" | "C" | "D">;
  correctNumeric: string | null;
  solution: string | null;
  imageUrl: string | null;
};

type GroupedPaper = {
  key: string;
  examName: string;
  paperId: string;
  paperTitle: string;
  year: number | null;
  shift: string | null;
  questions: RawQuestion[];
};

type ImportSummary = {
  papersFound: number;
  papersCreated: number;
  papersSkipped: number;
  questionsImported: number;
  chaptersCreated: number;
  topicsCreated: number;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const toTitleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((token) => {
      const upper = token.toUpperCase();
      if (["JEE", "NEET", "NTA", "CUET", "UG"].includes(upper)) return upper;
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();

const normalizeExamName = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "PYQ Imported";
  return toTitleCase(raw.replace(/[^a-z0-9\s_-]+/gi, " "));
};

const normalizeSubject = (value: unknown) => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw.startsWith("phy")) return "Physics";
  if (raw.startsWith("chem")) return "Chemistry";
  if (raw.startsWith("math")) return "Maths";
  return toTitleCase(raw || "General");
};

const normalizeDifficulty = (value: unknown): "Easy" | "Moderate" | "Tough" => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["easy", "basic", "simple"].includes(raw)) return "Easy";
  if (["hard", "tough", "difficult"].includes(raw)) return "Tough";
  return "Moderate";
};

const normalizeQuestionType = (value: unknown): "MCQ" | "MSQ" | "NUM" => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (["num", "integer", "numeric", "numerical"].includes(raw)) return "NUM";
  if (["msq", "multiple", "multiple_correct", "multi"].includes(raw)) return "MSQ";
  return "MCQ";
};

const toLetter = (value: unknown): "A" | "B" | "C" | "D" | null => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(raw)) return raw as "A" | "B" | "C" | "D";
  if (["1", "2", "3", "4"].includes(raw)) {
    return (["A", "B", "C", "D"][Number(raw) - 1] as "A" | "B" | "C" | "D") ?? null;
  }
  const match = raw.match(/[A-D]/);
  return match ? (match[0] as "A" | "B" | "C" | "D") : null;
};

const htmlToText = (value: unknown) =>
  String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const extractFirstImageUrl = (...values: unknown[]) => {
  for (const value of values) {
    const raw = String(value ?? "").trim();
    if (!raw) continue;
    const imgMatch = raw.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch?.[1]) return imgMatch[1].trim();
    const markdownMatch = raw.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (markdownMatch?.[1]) return markdownMatch[1].trim();
    const urlMatch = raw.match(/https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg)/i);
    if (urlMatch?.[0]) return urlMatch[0].trim();
    if (/^data:image\/[a-zA-Z+]+;base64,/.test(raw)) return raw;
  }
  return null;
};

const isDirectImageUrl = (value: string) =>
  /^data:image\//i.test(value) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);

const resolveIbbImageUrl = async (url: string): Promise<string | null> => {
  if (!/ibb\.co\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch?.[1]) return ogMatch[1];
    const imgMatch = html.match(/<img[^>]*src=["'](https?:\/\/i\.ibb\.co\/[^"']+)["'][^>]*>/i);
    if (imgMatch?.[1]) return imgMatch[1];
  } catch {
    return null;
  }
  return null;
};

const rehostImageToCloudinary = async (url: string): Promise<string | null> => {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return null;
  if (url.includes("res.cloudinary.com")) return url;
  const resolved =
    isDirectImageUrl(url) || url.startsWith("data:image/")
      ? url
      : (await resolveIbbImageUrl(url)) ?? url;
  if (!resolved) return null;
  try {
    const result = await cloudinary.uploader.upload(resolved, {
      resource_type: "image",
      folder: "cbtcore/questions",
    });
    return result.secure_url || null;
  } catch {
    return null;
  }
};

const cleanLabel = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return toTitleCase(raw.replace(/[-_/]+/g, " "));
};

const extractYear = (questionYear: unknown, paperTitle: string, paperId: string): number | null => {
  const y = Number(questionYear);
  if (Number.isFinite(y) && y > 1900 && y < 2200) return y;
  const titleYear = paperTitle.match(/\b(20\d{2})\b/);
  if (titleYear) return Number(titleYear[1]);
  const idYear = paperId.match(/(?:^|[^0-9])(20\d{2})(?:[^0-9]|$)/);
  return idYear ? Number(idYear[1]) : null;
};

const normalizeShift = (value: unknown): string | null => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return raw.replace(/\s+/g, " ");
};

const extractShiftFromPaperTitle = (paperTitle: string): string | null => {
  const raw = paperTitle.trim();
  if (!raw) return null;
  const withoutPrefix = raw.replace(/^.*?\b20\d{2}\b(?:\s*\(.*?\))?\s*/i, "").trim();
  return withoutPrefix || null;
};

const extractShiftFromPaperId = (paperId: string): string | null => {
  const raw = paperId.trim();
  if (!raw) return null;
  const afterOnline = raw.split("-online-")[1];
  if (!afterOnline) return null;
  return toTitleCase(afterOnline.replace(/-/g, " "));
};

const normalizeOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((option) => {
      if (typeof option === "string") return sanitizeQuestionText(option);
      if (option && typeof option === "object") {
        const record = option as Record<string, unknown>;
        return sanitizeQuestionText(record.content ?? record.text ?? "");
      }
      return "";
    })
    .map((option) => option.trim())
    .filter(Boolean);
};

const normalizeCorrectOptions = (value: unknown): Array<"A" | "B" | "C" | "D"> => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toLetter(item))
    .filter((item): item is "A" | "B" | "C" | "D" => Boolean(item));
};

const parseExamGoalShape = (payload: any, lang: ImportLang): RawQuestion[] => {
  const list: RawQuestion[] = [];
  const groups = Array.isArray(payload?.results) ? payload.results : [];

  for (const group of groups) {
    const subjectHint = normalizeSubject(group?.title ?? group?._id ?? "");
    const questions = Array.isArray(group?.questions) ? group.questions : [];

    for (const item of questions) {
      const langBlock =
        item?.question?.[lang] ??
        item?.question?.en ??
        item?.question?.hi ??
        {};

      const prompt = sanitizeQuestionText(langBlock?.content ?? item?.prompt ?? item?.questionText ?? "");
      if (!prompt) continue;
      const imageUrl = extractFirstImageUrl(
        langBlock?.content,
        ...(Array.isArray(langBlock?.options)
          ? langBlock.options.map((option: any) =>
              typeof option === "string" ? option : option?.content ?? option?.text ?? ""
            )
          : []),
        item?.imageUrl,
        item?.image,
        item?.diagram,
        item?.questionImage
      );

      const paperId = String(item?.paperId ?? item?.yearKey ?? item?.question_id ?? "").trim();
      const paperTitle = String(item?.paperTitle ?? "").trim();
      const examName = normalizeExamName(item?.exam);
      const year = extractYear(item?.year, paperTitle, paperId);
      const shift =
        normalizeShift(item?.shift) ??
        extractShiftFromPaperTitle(paperTitle) ??
        extractShiftFromPaperId(paperId);
      const questionType = normalizeQuestionType(item?.type);
      const options = normalizeOptions(langBlock?.options);
      const correctOptions = normalizeCorrectOptions(langBlock?.correct_options);
      const answerValue = String(langBlock?.answer ?? item?.answer ?? "").trim();
      const answerLetter = toLetter(answerValue);
      const correctNumeric = questionType === "NUM" ? (answerValue || null) : null;

      const finalCorrectOptions =
        questionType === "MSQ"
          ? correctOptions
          : questionType === "MCQ"
          ? correctOptions.length
            ? [correctOptions[0]]
            : answerLetter
            ? [answerLetter]
            : []
          : [];

      const marksCorrect = Number(item?.marks);
      const marksIncorrectRaw = Number(item?.negMarks);
      const marksIncorrect =
        Number.isFinite(marksIncorrectRaw) && marksIncorrectRaw !== 0
          ? -Math.abs(marksIncorrectRaw)
          : -1;

      list.push({
        paperId: paperId || `${examName}-${year ?? "unknown"}-${subjectHint}`,
        paperTitle: paperTitle || `${examName} ${year ?? ""}`.trim(),
        examName,
        year,
        shift,
        subject: normalizeSubject(item?.subject ?? subjectHint),
        chapter: cleanLabel(item?.chapter),
        topic: cleanLabel(item?.topic),
        questionType,
        difficulty: normalizeDifficulty(item?.difficulty),
        marksCorrect: Number.isFinite(marksCorrect) && marksCorrect > 0 ? marksCorrect : 4,
        marksIncorrect,
        prompt,
        options: questionType === "NUM" ? [] : options,
        correctOptions: finalCorrectOptions,
        correctNumeric,
        solution: sanitizeQuestionText(langBlock?.explanation ?? item?.solution ?? "") || null,
        imageUrl,
      });
    }
  }

  return list;
};

const parseGenericShape = (payload: any): RawQuestion[] => {
  const list: RawQuestion[] = [];
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const meta = (payload?.meta ?? {}) as Record<string, unknown>;

  for (const item of questions) {
    const prompt = sanitizeQuestionText(item?.text ?? item?.prompt ?? item?.question ?? "");
    if (!prompt) continue;
    const questionType = normalizeQuestionType(item?.questionType ?? item?.type);
    const answerValue = String(item?.answer ?? "").trim();
    const imageUrl = extractFirstImageUrl(
      item?.prompt,
      item?.text,
      item?.question,
      item?.imageUrl,
      item?.image,
      item?.diagram,
      item?.questionImage
    );
    const correctOptions = normalizeCorrectOptions(item?.correctOptions);
    const answerLetter = toLetter(answerValue);
    const finalCorrectOptions =
      questionType === "MSQ"
        ? correctOptions
        : questionType === "MCQ"
        ? correctOptions.length
          ? [correctOptions[0]]
          : answerLetter
          ? [answerLetter]
          : []
        : [];

    const paperTitle = String(item?.paperTitle ?? meta.paperTitle ?? payload?.title ?? "Imported PYQ").trim();
    const examName = normalizeExamName(item?.exam ?? meta.exam ?? payload?.exam ?? "PYQ Imported");
    const paperId =
      String(item?.paperId ?? item?.yearKey ?? "").trim() ||
      `${examName}-${paperTitle || "paper"}-${item?.number ?? list.length + 1}`;
    const year = extractYear(item?.year ?? meta.year, paperTitle, paperId);
    const shift = normalizeShift(item?.shift ?? meta.shift ?? payload?.shift);

    const marksCorrect = Number(item?.marksCorrect ?? item?.marks ?? meta.marksCorrect);
    const marksIncorrectRaw = Number(item?.marksIncorrect ?? item?.negMarks ?? meta.marksIncorrect);

    list.push({
      paperId,
      paperTitle: paperTitle || `${examName} ${year ?? ""}`.trim(),
      examName,
      year,
      shift,
      subject: normalizeSubject(item?.subject ?? meta.subject),
      chapter: cleanLabel(item?.chapter),
      topic: cleanLabel(item?.topic),
      questionType,
      difficulty: normalizeDifficulty(item?.difficulty),
      marksCorrect: Number.isFinite(marksCorrect) && marksCorrect > 0 ? marksCorrect : 4,
      marksIncorrect:
        Number.isFinite(marksIncorrectRaw) && marksIncorrectRaw !== 0
          ? -Math.abs(marksIncorrectRaw)
          : -1,
      prompt,
      options:
        questionType === "NUM"
          ? []
          : normalizeOptions(item?.options).length
          ? normalizeOptions(item?.options)
          : ["Option A", "Option B", "Option C", "Option D"],
      correctOptions: finalCorrectOptions,
      correctNumeric:
        questionType === "NUM"
          ? String(item?.correctNumeric ?? answerValue ?? "").trim() || null
          : null,
      solution: sanitizeQuestionText(item?.solution ?? item?.explanation ?? "") || null,
      imageUrl,
    });
  }

  return list;
};

const groupByPaper = (questions: RawQuestion[]): GroupedPaper[] => {
  const map = new Map<string, GroupedPaper>();

  for (const question of questions) {
    const key = question.paperId || question.paperTitle || "imported-paper";
    if (!map.has(key)) {
      map.set(key, {
        key,
        examName: question.examName,
        paperId: question.paperId,
        paperTitle: question.paperTitle,
        year: question.year,
        shift: question.shift,
        questions: [],
      });
    }
    map.get(key)!.questions.push(question);
  }

  return Array.from(map.values());
};

const buildQuestionRows = (testId: string, questions: RawQuestion[]) =>
  questions.map((question) => {
    const correctOption =
      question.questionType === "NUM"
        ? null
        : question.questionType === "MSQ"
        ? question.correctOptions.length
          ? question.correctOptions.join(",")
          : null
        : question.correctOptions[0] ?? null;

    return {
      testId,
      subject: question.subject,
      difficulty: question.difficulty,
      questionType: question.questionType,
      chapter: question.chapter,
      topic: question.topic,
      correctOption,
      correctNumeric: question.questionType === "NUM" ? question.correctNumeric ?? "" : null,
      marksCorrect: question.marksCorrect,
      marksIncorrect: question.marksIncorrect,
      imageUrl: question.imageUrl ?? "",
      cropX: 0,
      cropY: 0,
      cropW: 1,
      cropH: 1,
      prompt: question.prompt,
      solution: question.solution,
      options: question.questionType === "NUM" ? [] : question.options,
    };
  });

export async function POST(request: Request) {
  const session = await requireAdmin();

  let rawJson = "";
  let overwrite = false;
  let lang: ImportLang = "en";
  let selectedExamId = "";
  let selectedChapterId = "";
  let importMode: "papers" | "questions" = "papers";
  let testTitle = "";

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) {
      rawJson = await file.text();
    } else {
      rawJson = String(form.get("rawJson") ?? "");
    }
    overwrite = String(form.get("overwrite") ?? "false").toLowerCase() === "true";
    lang = String(form.get("lang") ?? "en").toLowerCase() === "hi" ? "hi" : "en";
    selectedExamId = String(form.get("examId") ?? "").trim();
    selectedChapterId = String(form.get("chapterId") ?? "").trim();
    importMode = String(form.get("mode") ?? "papers") === "questions" ? "questions" : "papers";
    testTitle = String(form.get("testTitle") ?? "").trim();
  } else {
    const body = await request.json();
    rawJson =
      typeof body?.rawJson === "string"
        ? body.rawJson
        : JSON.stringify(body?.data ?? body?.payload ?? body ?? {});
    overwrite = Boolean(body?.overwrite);
    lang = String(body?.lang ?? "en").toLowerCase() === "hi" ? "hi" : "en";
    selectedExamId = String(body?.examId ?? "").trim();
    selectedChapterId = String(body?.chapterId ?? "").trim();
    importMode = String(body?.mode ?? "papers") === "questions" ? "questions" : "papers";
    testTitle = String(body?.testTitle ?? "").trim();
  }

  if (!rawJson.trim()) {
    return NextResponse.json({ error: "Empty JSON input." }, { status: 400 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const extracted = parseExamGoalShape(parsed, lang);
  let questions = extracted.length ? extracted : parseGenericShape(parsed);
  if (!questions.length) {
    return NextResponse.json(
      { error: "No questions found in uploaded JSON." },
      { status: 400 }
    );
  }

  if (!selectedExamId) {
    return NextResponse.json({ error: "Please select an exam." }, { status: 400 });
  }
  if (!selectedChapterId) {
    return NextResponse.json({ error: "Please select a chapter." }, { status: 400 });
  }

  const selectedExam = await prisma.exam.findUnique({
    where: { id: selectedExamId },
    select: { id: true, name: true },
  });
  if (!selectedExam) {
    return NextResponse.json({ error: "Selected exam not found." }, { status: 400 });
  }

  const selectedChapter = await prisma.chapter.findUnique({
    where: { id: selectedChapterId },
    select: { id: true, examId: true, subject: true, name: true },
  });
  if (!selectedChapter) {
    return NextResponse.json({ error: "Selected chapter not found." }, { status: 400 });
  }
  if (selectedChapter.examId !== selectedExam.id) {
    return NextResponse.json(
      { error: "Selected chapter does not belong to selected exam." },
      { status: 400 }
    );
  }

  questions = questions.map((question) => ({
    ...question,
    examName: selectedExam.name,
    subject: selectedChapter.subject,
    chapter: selectedChapter.name,
  }));

  const imageCache = new Map<string, string | null>();
  for (const question of questions) {
    if (!question.imageUrl) continue;
    const rawUrl = question.imageUrl.trim();
    if (!rawUrl) continue;
    if (imageCache.has(rawUrl)) {
      question.imageUrl = imageCache.get(rawUrl) ?? null;
      continue;
    }
    const uploaded = await rehostImageToCloudinary(rawUrl);
    imageCache.set(rawUrl, uploaded ?? rawUrl);
    question.imageUrl = uploaded ?? rawUrl;
  }

  if (importMode === "questions") {
    const defaultTitle = `Imported Questions - ${selectedExam.name} - ${selectedChapter.name}`;
    const title = testTitle || defaultTitle;
    const existingTest = await prisma.test.findFirst({
      where: {
        title,
        examId: selectedExam.id,
        isPyq: true,
        isYearPaper: false,
      },
      select: { id: true },
    });
    if (existingTest && !overwrite) {
      return NextResponse.json(
        { error: "Test already exists. Enable overwrite to replace it." },
        { status: 400 }
      );
    }
    if (existingTest && overwrite) {
      await prisma.test.delete({ where: { id: existingTest.id } });
    }

    const firstQuestion = questions[0];
    const test = await prisma.test.create({
      data: {
        title,
        description: "Imported from admin JSON",
        tags: ["PYQ", "Imported"],
        visibility: "Public",
        hidden: false,
        isPyq: true,
        isYearPaper: false,
        exam: selectedExam.name,
        examId: selectedExam.id,
        durationMinutes: 180,
        markingCorrect: firstQuestion.marksCorrect,
        markingIncorrect: firstQuestion.marksIncorrect,
        ownerId: session.user.id,
      },
      select: { id: true },
    });

    const rows = buildQuestionRows(test.id, questions);
    for (let start = 0; start < rows.length; start += 300) {
      const chunk = rows.slice(start, start + 300);
      await prisma.question.createMany({ data: chunk });
    }

    const topicKeysToCreate = new Set<string>();
    for (const question of questions) {
      if (question.topic) {
        const chapterKey = `${selectedExam.id}::${selectedChapter.subject}::${selectedChapter.name}`;
        topicKeysToCreate.add(`${chapterKey}::${question.topic}`);
      }
    }
    for (const topicKey of topicKeysToCreate) {
      const parts = topicKey.split("::");
      const chapterId = selectedChapter.id;
      const topicName = parts[3];
      if (!topicName) continue;
      await prisma.topic.upsert({
        where: { chapterId_name: { chapterId, name: topicName } },
        update: {},
        create: { chapterId, name: topicName, order: 0 },
      });
    }

    return NextResponse.json({
      ok: true,
      summary: {
        papersFound: 1,
        papersCreated: 1,
        papersSkipped: 0,
        questionsImported: rows.length,
        chaptersCreated: 0,
        topicsCreated: topicKeysToCreate.size,
      },
    });
  }

  const grouped = groupByPaper(questions);
  const examCache = new Map<string, { id: string; name: string }>();
  examCache.set(selectedExam.name, selectedExam);
  const chapterCache = new Map<string, string>();
  const chapterKeysToCreate = new Set<string>();
  const topicKeysToCreate = new Set<string>();

  const summary: ImportSummary = {
    papersFound: grouped.length,
    papersCreated: 0,
    papersSkipped: 0,
    questionsImported: 0,
    chaptersCreated: 0,
    topicsCreated: 0,
  };

  for (const paper of grouped) {
    if (!paper.questions.length) continue;
    const examName = normalizeExamName(selectedExam.name || paper.examName);
    if (!examCache.has(examName)) {
      examCache.set(examName, selectedExam);
    }
    const exam = examCache.get(examName)!;

    const year = paper.year;
    const shift = paper.shift;
    const title =
      paper.paperTitle ||
      [exam.name, year ? String(year) : "", shift ?? ""].filter(Boolean).join(" ").trim() ||
      "Imported PYQ Paper";

    const existingTest = await prisma.test.findFirst({
      where: {
        isPyq: true,
        isYearPaper: true,
        examId: exam.id,
        year: year ?? null,
        shift: shift ?? null,
        title,
      },
      select: { id: true },
    });

    if (existingTest && !overwrite) {
      summary.papersSkipped += 1;
      continue;
    }
    if (existingTest && overwrite) {
      await prisma.test.delete({ where: { id: existingTest.id } });
    }

    const firstQuestion = paper.questions[0];
    const test = await prisma.test.create({
      data: {
        title,
        description: "Imported from admin JSON",
        tags: ["PYQ", "Imported"],
        visibility: "Public",
        hidden: false,
        isPyq: true,
        isYearPaper: true,
        exam: selectedExam.name,
        examId: selectedExam.id,
        year: year ?? null,
        shift: shift ?? null,
        durationMinutes: 180,
        markingCorrect: firstQuestion.marksCorrect,
        markingIncorrect: firstQuestion.marksIncorrect,
        ownerId: session.user.id,
      },
      select: { id: true },
    });

    const rows = buildQuestionRows(test.id, paper.questions);
    for (let start = 0; start < rows.length; start += 300) {
      const chunk = rows.slice(start, start + 300);
      await prisma.question.createMany({ data: chunk });
    }

    summary.papersCreated += 1;
    summary.questionsImported += rows.length;

    for (const question of paper.questions) {
      if (!question.chapter) continue;
      const chapterKey = `${selectedExam.id}::${selectedChapter.subject}::${selectedChapter.name}`;
      chapterKeysToCreate.add(chapterKey);
      if (question.topic) {
        topicKeysToCreate.add(`${chapterKey}::${question.topic}`);
      }
    }
  }

  for (const chapterKey of chapterKeysToCreate) {
    chapterCache.set(chapterKey, selectedChapter.id);
  }
  summary.chaptersCreated = 0;

  let createdTopicCount = 0;
  for (const topicKey of topicKeysToCreate) {
    const parts = topicKey.split("::");
    const chapterKey = parts.slice(0, 3).join("::");
    const topicName = parts[3];
    const chapterId = chapterCache.get(chapterKey);
    if (!chapterId || !topicName) continue;
    await prisma.topic.upsert({
      where: { chapterId_name: { chapterId, name: topicName } },
      update: {},
      create: { chapterId, name: topicName, order: 0 },
    });
    createdTopicCount += 1;
  }
  summary.topicsCreated = createdTopicCount;

  return NextResponse.json({
    ok: true,
    summary,
  });
}
