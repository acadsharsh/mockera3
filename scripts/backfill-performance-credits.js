const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const dayMs = 24 * 60 * 60 * 1000;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const isCorrectAnswer = (question, selected) => {
  if (!selected) return false;
  if (question.questionType === "NUM") {
    const normalized = selected.trim();
    return normalized !== "" && normalized === (question.correctNumeric ?? "").trim();
  }
  if (question.questionType === "MSQ") {
    const expected = (question.correctOption ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    const got = selected
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return got !== "" && got === expected;
  }
  return selected === question.correctOption;
};

const streakMultiplier = (streakDays) => {
  if (streakDays >= 4) return 2.0;
  if (streakDays === 3) return 1.5;
  if (streakDays === 2) return 1.2;
  return 1.0;
};

async function main() {
  const tests = await prisma.test.findMany({
    include: { questions: true },
  });

  const attempts = await prisma.attempt.findMany({
    where: { status: "SUBMITTED" },
    select: { id: true, testId: true, userId: true, createdAt: true, answers: true, timeSpent: true },
  });

  const testMap = new Map(tests.map((test) => [test.id, test]));
  const attemptsByTest = new Map();
  attempts.forEach((attempt) => {
    if (!attemptsByTest.has(attempt.testId)) {
      attemptsByTest.set(attempt.testId, []);
    }
    attemptsByTest.get(attempt.testId).push(attempt);
  });

  const statsByTest = new Map();
  for (const test of tests) {
    const stats = new Map();
    test.questions.forEach((question) => {
      stats.set(question.id, { attempted: 0, correct: 0, totalTime: 0 });
    });
    const testAttempts = attemptsByTest.get(test.id) || [];
    testAttempts.forEach((attempt) => {
      const answers = attempt.answers || {};
      const timeSpent = attempt.timeSpent || {};
      test.questions.forEach((question) => {
        const selected = answers[question.id];
        if (!selected) return;
        const entry = stats.get(question.id);
        if (!entry) return;
        entry.attempted += 1;
        if (isCorrectAnswer(question, selected)) {
          entry.correct += 1;
        }
        const seconds = timeSpent[question.id] || 0;
        if (seconds > 0) {
          entry.totalTime += seconds;
        }
      });
    });
    statsByTest.set(test.id, stats);
  }

  const baseCreditsByAttempt = new Map();

  attempts.forEach((attempt) => {
    const test = testMap.get(attempt.testId);
    if (!test) return;
    const stats = statsByTest.get(test.id);
    if (!stats) return;
    let baseCredits = 0;
    const answers = attempt.answers || {};
    const timeSpent = attempt.timeSpent || {};
    test.questions.forEach((question) => {
      const selected = answers[question.id];
      const entry = stats.get(question.id) || { attempted: 0, correct: 0, totalTime: 0 };
      const attemptedCount = entry.attempted || 0;
      const accuracyRate = attemptedCount ? entry.correct / attemptedCount : 0;
      const avgTime = attemptedCount ? entry.totalTime / attemptedCount : 0;
      const correctNow = isCorrectAnswer(question, selected);

      if (correctNow && question.difficulty === "Tough") {
        baseCredits += 20;
      }
      if (correctNow && avgTime > 0) {
        const time = timeSpent[question.id] || 0;
        if (time > 0 && time <= avgTime * 0.7) {
          baseCredits += 50;
        }
      }
      if (!selected && accuracyRate > 0 && accuracyRate < 0.1) {
        baseCredits += 10;
      }
    });

    baseCreditsByAttempt.set(attempt.id, baseCredits);
  });

  const attemptsByUser = new Map();
  attempts.forEach((attempt) => {
    if (!attemptsByUser.has(attempt.userId)) {
      attemptsByUser.set(attempt.userId, []);
    }
    attemptsByUser.get(attempt.userId).push(attempt);
  });

  const attemptUpdates = [];
  const userUpdates = [];

  for (const [userId, userAttempts] of attemptsByUser.entries()) {
    const sorted = userAttempts
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let streakDays = 0;
    let lastDay = null;
    let totalCredits = 0;

    sorted.forEach((attempt) => {
      const attemptDay = startOfDay(new Date(attempt.createdAt));
      if (lastDay === null) {
        streakDays = 1;
      } else {
        const diffDays = Math.floor((attemptDay - lastDay) / dayMs);
        if (diffDays === 0) {
          // same day, keep streak
        } else if (diffDays === 1) {
          streakDays += 1;
        } else {
          streakDays = 1;
        }
      }
      lastDay = attemptDay;
      const base = baseCreditsByAttempt.get(attempt.id) || 0;
      const multiplier = streakMultiplier(streakDays);
      const performanceCredits = Math.round(base * multiplier);
      totalCredits += performanceCredits;
      attemptUpdates.push({
        id: attempt.id,
        performanceCredits,
        streakMultiplier: multiplier,
      });
    });

    const lastAttempt = sorted[sorted.length - 1];
    if (lastAttempt) {
      userUpdates.push({
        id: userId,
        performanceCredits: totalCredits,
        streakDays,
        lastAttemptAt: new Date(lastAttempt.createdAt),
        lastDecayAt: new Date(lastAttempt.createdAt),
      });
    }
  }

  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  };

  for (const slice of chunk(attemptUpdates, 50)) {
    await prisma.$transaction(
      slice.map((item) =>
        prisma.attempt.update({
          where: { id: item.id },
          data: {
            performanceCredits: item.performanceCredits,
            streakMultiplier: item.streakMultiplier,
          },
        })
      )
    );
  }

  for (const slice of chunk(userUpdates, 50)) {
    await prisma.$transaction(
      slice.map((item) =>
        prisma.user.update({
          where: { id: item.id },
          data: {
            performanceCredits: item.performanceCredits,
            streakDays: item.streakDays,
            lastAttemptAt: item.lastAttemptAt,
            lastDecayAt: item.lastDecayAt,
          },
        })
      )
    );
  }

  console.log(`Updated ${attemptUpdates.length} attempts and ${userUpdates.length} users.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
