/* eslint-disable no-console */
const { Client, Databases } = require("node-appwrite");
const { PrismaClient } = require("@prisma/client");

const endpoint = process.env.APPWRITE_ENDPOINT;
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.DATABASE_ID || process.env.APPWRITE_DATABASE_ID;

if (!endpoint || !projectId || !apiKey || !databaseId) {
  console.error("Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, or DATABASE_ID.");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const prisma = new PrismaClient();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeStringify = (value) => (value === null || value === undefined ? null : JSON.stringify(value));

const upsertDoc = async (collectionId, id, data) => {
  try {
    await databases.getDocument(databaseId, collectionId, id);
    await databases.updateDocument(databaseId, collectionId, id, data);
  } catch {
    await databases.createDocument(databaseId, collectionId, id, data);
  }
  await sleep(10);
};

const migrateUsers = async () => {
  const rows = await prisma.user.findMany();
  for (const [index, row] of rows.entries()) {
    const image =
      typeof row.image === "string" && row.image.length <= 2048 ? row.image : null;
    await upsertDoc("User", row.id, {
      username: row.username ?? null,
      displayUsername: row.displayUsername ?? null,
      name: row.name,
      email: row.email,
      emailVerified: row.emailVerified,
      image,
      role: row.role,
      banned: row.banned ?? false,
      banReason: row.banReason ?? null,
      banExpires: row.banExpires?.toISOString() ?? null,
      performanceCredits: row.performanceCredits,
      streakDays: row.streakDays,
      lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
      lastDecayAt: row.lastDecayAt?.toISOString() ?? null,
      rankShieldUntil: row.rankShieldUntil?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Users migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Users migrated: ${rows.length}`);
};

const migrateAccounts = async () => {
  const rows = await prisma.account.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Account", row.id, {
      providerId: row.providerId,
      accountId: row.accountId,
      userId: row.userId,
      accessToken: row.accessToken ?? null,
      refreshToken: row.refreshToken ?? null,
      idToken: row.idToken ?? null,
      accessTokenExpiresAt: row.accessTokenExpiresAt?.toISOString() ?? null,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt?.toISOString() ?? null,
      scope: row.scope ?? null,
      password: row.password ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Accounts migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Accounts migrated: ${rows.length}`);
};

const migrateSessions = async () => {
  const rows = await prisma.session.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Session", row.id, {
      userId: row.userId,
      expiresAt: row.expiresAt.toISOString(),
      token: row.token,
      ipAddress: row.ipAddress ?? null,
      userAgent: row.userAgent ?? null,
      impersonatedBy: row.impersonatedBy ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Sessions migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Sessions migrated: ${rows.length}`);
};

const migrateVerifications = async () => {
  const rows = await prisma.verification.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Verification", row.id, {
      value: row.value,
      expiresAt: row.expiresAt.toISOString(),
      identifier: row.identifier,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Verifications migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Verifications migrated: ${rows.length}`);
};

const migrateTests = async () => {
  const rows = await prisma.test.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Test", row.id, {
      title: row.title,
      description: row.description ?? null,
      tags: row.tags ?? [],
      pdfUrl: row.pdfUrl ?? null,
      visibility: row.visibility,
      hidden: row.hidden,
      isPyq: row.isPyq,
      exam: row.exam ?? null,
      examId: row.examId ?? null,
      year: row.year ?? null,
      shift: row.shift ?? null,
      stream: row.stream ?? null,
      accessCode: row.accessCode ?? null,
      durationMinutes: row.durationMinutes,
      markingCorrect: row.markingCorrect,
      markingIncorrect: row.markingIncorrect,
      lockNavigation: row.lockNavigation,
      ownerId: row.ownerId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Tests migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Tests migrated: ${rows.length}`);
};

const migrateQuestions = async () => {
  const skip = Number(process.env.MIGRATE_SKIP ?? 0);
  const take = process.env.MIGRATE_TAKE ? Number(process.env.MIGRATE_TAKE) : undefined;
  const rows = await prisma.question.findMany({
    skip: Number.isNaN(skip) ? 0 : skip,
    take: take && !Number.isNaN(take) ? take : undefined,
  });
  for (const [index, row] of rows.entries()) {
    const data = {
      correctOption: row.correctOption ?? null,
      correctNumeric: row.correctNumeric ?? null,
      marksCorrect: row.marksCorrect,
      marksIncorrect: row.marksIncorrect,
      cropX: row.cropX,
      cropY: row.cropY,
      cropW: row.cropW,
      cropH: row.cropH,
    };
    const prompt =
      typeof row.prompt === "string" ? row.prompt.slice(0, 4000) : null;
    const options = row.options ? safeStringify(row.options) : null;
    const trimmedOptions = options ? options.slice(0, 4000) : null;
    const imageUrl =
      typeof row.imageUrl === "string" && row.imageUrl.length <= 1024 ? row.imageUrl : null;
    const crop = JSON.stringify({
      x: row.cropX,
      y: row.cropY,
      w: row.cropW,
      h: row.cropH,
    });
    await upsertDoc("Question", row.id, {
      testId: row.testId,
      subject: row.subject,
      difficulty: row.difficulty,
      questionType: row.questionType,
      chapter: row.chapter ?? null,
      topic: row.topic ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    await upsertDoc("QuestionPayload", row.id, {
      prompt,
      options: trimmedOptions,
      imageUrl,
      crop,
      data: safeStringify(data)?.slice(0, 1000) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Questions migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Questions migrated: ${rows.length}`);
};

const migrateAttempts = async () => {
  const rows = await prisma.attempt.findMany();
  for (const [index, row] of rows.entries()) {
    const data = {
      candidateName: row.candidateName ?? null,
      batchCode: row.batchCode ?? null,
      answers: row.answers,
      timeSpent: row.timeSpent,
      events: row.events ?? null,
      performanceCredits: row.performanceCredits,
      streakMultiplier: row.streakMultiplier,
    };
    await upsertDoc("Attempt", row.id, {
      testId: row.testId,
      userId: row.userId,
      status: row.status,
      score: row.score,
      accuracy: row.accuracy,
      timeTaken: row.timeTaken,
      data: safeStringify(data),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Attempts migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Attempts migrated: ${rows.length}`);
};

const migratePercentileBands = async () => {
  const rows = await prisma.testPercentileBand.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("TestPercentileBand", row.id, {
      testId: row.testId,
      minScore: row.minScore,
      maxScore: row.maxScore ?? null,
      percentileLabel: row.percentileLabel,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`TestPercentileBands migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`TestPercentileBands migrated: ${rows.length}`);
};

const migrateBroadcasts = async () => {
  const rows = await prisma.broadcastMessage.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("BroadcastMessage", row.id, {
      title: row.title,
      body: row.body,
      active: row.active,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      createdById: row.createdById ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Broadcasts migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Broadcasts migrated: ${rows.length}`);
};

const migrateExams = async () => {
  const rows = await prisma.exam.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Exam", row.id, {
      name: row.name,
      shortCode: row.shortCode ?? null,
      order: row.order,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Exams migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Exams migrated: ${rows.length}`);
};

const migrateChapters = async () => {
  const rows = await prisma.chapter.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Chapter", row.id, {
      examId: row.examId ?? null,
      subject: row.subject,
      name: row.name,
      order: row.order,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Chapters migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Chapters migrated: ${rows.length}`);
};

const migrateTopics = async () => {
  const rows = await prisma.topic.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("Topic", row.id, {
      chapterId: row.chapterId,
      name: row.name,
      order: row.order,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`Topics migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`Topics migrated: ${rows.length}`);
};

const migrateExamPapers = async () => {
  const rows = await prisma.examPaper.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("ExamPaper", row.id, {
      examId: row.examId,
      year: row.year,
      shift: row.shift ?? null,
      pdfUrl: row.pdfUrl,
      testId: row.testId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`ExamPapers migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`ExamPapers migrated: ${rows.length}`);
};

const migrateSavedQuestions = async () => {
  const rows = await prisma.savedQuestion.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("SavedQuestion", row.id, {
      userId: row.userId,
      questionId: row.questionId,
      createdAt: row.createdAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`SavedQuestions migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`SavedQuestions migrated: ${rows.length}`);
};

const migrateAppConfig = async () => {
  const rows = await prisma.appConfig.findMany();
  for (const [index, row] of rows.entries()) {
    await upsertDoc("AppConfig", row.key, {
      key: row.key,
      maintenanceMode: row.maintenanceMode,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
    if ((index + 1) % 200 === 0) {
      console.log(`AppConfig migrated: ${index + 1}/${rows.length}`);
    }
  }
  console.log(`AppConfig migrated: ${rows.length}`);
};

const MIGRATION_STEPS = {
  users: migrateUsers,
  accounts: migrateAccounts,
  sessions: migrateSessions,
  verifications: migrateVerifications,
  exams: migrateExams,
  chapters: migrateChapters,
  topics: migrateTopics,
  tests: migrateTests,
  questions: migrateQuestions,
  attempts: migrateAttempts,
  percentileBands: migratePercentileBands,
  broadcasts: migrateBroadcasts,
  examPapers: migrateExamPapers,
  savedQuestions: migrateSavedQuestions,
  appConfig: migrateAppConfig,
};

const parseOnly = () =>
  (process.env.MIGRATE_ONLY || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const run = async () => {
  const only = parseOnly();
  const keys = only.length ? only : Object.keys(MIGRATION_STEPS);
  for (const key of keys) {
    const step = MIGRATION_STEPS[key];
    if (!step) {
      console.log(`Skipping unknown migration: ${key}`);
      continue;
    }
    console.log(`Starting migration: ${key}`);
    await step();
  }
  await prisma.$disconnect();
  console.log("Migration complete.");
};

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
