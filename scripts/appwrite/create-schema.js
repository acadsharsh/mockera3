/* eslint-disable no-console */
const { Client, Databases } = require("node-appwrite");

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDatabase = async () => {
  try {
    await databases.get(databaseId);
    console.log(`Database exists: ${databaseId}`);
  } catch {
    console.log(`Creating database: ${databaseId}`);
    await databases.create(databaseId, "Main");
    await sleep(500);
  }
};

const parseResetCollections = () =>
  (process.env.APPWRITE_RESET_COLLECTIONS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const ensureCollection = async (collectionId, name) => {
  const resetList = parseResetCollections();
  if (resetList.includes(collectionId)) {
    try {
      await databases.deleteCollection(databaseId, collectionId);
      console.log(`Deleted collection: ${collectionId}`);
      await sleep(500);
    } catch {}
  }

  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`Collection exists: ${collectionId}`);
  } catch {
    console.log(`Creating collection: ${collectionId}`);
    await databases.createCollection(databaseId, collectionId, name, [], true);
    await sleep(500);
  }
};

const listAttributes = async (collectionId) => {
  const { attributes } = await databases.listAttributes(databaseId, collectionId);
  return new Set(attributes.map((attr) => attr.key));
};

const createAttributeIfMissing = async (collectionId, key, createFn) => {
  const existing = await listAttributes(collectionId);
  if (existing.has(key)) {
    return;
  }
  await createFn();
  await sleep(400);
};

const createIndexIfMissing = async (collectionId, key, type, attributes) => {
  const { indexes } = await databases.listIndexes(databaseId, collectionId);
  if (indexes.some((index) => index.key === key)) return;
  await databases.createIndex(databaseId, collectionId, key, type, attributes);
  await sleep(300);
};

const createString = (collectionId, key, size, required, array = false, defaultValue) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue, array)
  );

const createEmail = (collectionId, key, required) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createEmailAttribute(databaseId, collectionId, key, required)
  );

const createUrl = (collectionId, key, required) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createUrlAttribute(databaseId, collectionId, key, required)
  );

const normalizeDefault = (required, value) => (required ? undefined : value);

const createBoolean = (collectionId, key, required, defaultValue) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createBooleanAttribute(
      databaseId,
      collectionId,
      key,
      required,
      normalizeDefault(required, defaultValue)
    )
  );

const createInteger = (collectionId, key, required, min, max, defaultValue, array = false) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createIntegerAttribute(
      databaseId,
      collectionId,
      key,
      required,
      min,
      max,
      normalizeDefault(required, defaultValue),
      array
    )
  );

const createFloat = (collectionId, key, required, min, max, defaultValue, array = false) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createFloatAttribute(
      databaseId,
      collectionId,
      key,
      required,
      min,
      max,
      normalizeDefault(required, defaultValue),
      array
    )
  );

const createDatetime = (collectionId, key, required, defaultValue, array = false) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      key,
      required,
      normalizeDefault(required, defaultValue),
      array
    )
  );

const createEnum = (collectionId, key, elements, required, array = false, defaultValue) =>
  createAttributeIfMissing(collectionId, key, () =>
    databases.createEnumAttribute(
      databaseId,
      collectionId,
      key,
      elements,
      required,
      array,
      normalizeDefault(required, defaultValue) ?? (required ? elements[0] : null)
    )
  );

const ensureCollections = async () => {
  await ensureCollection("User", "User");
  await ensureCollection("Account", "Account");
  await ensureCollection("Session", "Session");
  await ensureCollection("Verification", "Verification");
  await ensureCollection("Test", "Test");
  await ensureCollection("Question", "Question");
  await ensureCollection("QuestionPayload", "QuestionPayload");
  await ensureCollection("Attempt", "Attempt");
  await ensureCollection("TestPercentileBand", "TestPercentileBand");
  await ensureCollection("BroadcastMessage", "BroadcastMessage");
  await ensureCollection("Exam", "Exam");
  await ensureCollection("Chapter", "Chapter");
  await ensureCollection("Topic", "Topic");
  await ensureCollection("ExamPaper", "ExamPaper");
  await ensureCollection("SavedQuestion", "SavedQuestion");
  await ensureCollection("AppConfig", "AppConfig");
};

const ensureAttributes = async () => {
  // User
  await createString("User", "username", 128, false);
  await createString("User", "displayUsername", 128, false);
  await createString("User", "name", 256, true);
  await createEmail("User", "email", true);
  await createBoolean("User", "emailVerified", true, false);
  await createString("User", "image", 2048, false);
  await createString("User", "role", 32, true);
  await createBoolean("User", "banned", false, false);
  await createString("User", "banReason", 512, false);
  await createDatetime("User", "banExpires", false);
  await createInteger("User", "performanceCredits", true, null, null, 0);
  await createInteger("User", "streakDays", true, null, null, 0);
  await createDatetime("User", "lastAttemptAt", false);
  await createDatetime("User", "lastDecayAt", false);
  await createDatetime("User", "rankShieldUntil", false);
  await createDatetime("User", "createdAt", true);
  await createDatetime("User", "updatedAt", true);
  await createIndexIfMissing("User", "User_email_unique", "unique", ["email"]);
  await createIndexIfMissing("User", "User_username_unique", "unique", ["username"]);
  await createIndexIfMissing("User", "User_displayUsername_unique", "unique", ["displayUsername"]);

  // Account
  await createString("Account", "providerId", 64, true);
  await createString("Account", "accountId", 256, true);
  await createString("Account", "userId", 128, true);
  await createString("Account", "accessToken", 2048, false);
  await createString("Account", "refreshToken", 2048, false);
  await createString("Account", "idToken", 4096, false);
  await createDatetime("Account", "accessTokenExpiresAt", false);
  await createDatetime("Account", "refreshTokenExpiresAt", false);
  await createString("Account", "scope", 512, false);
  await createString("Account", "password", 512, false);
  await createDatetime("Account", "createdAt", true);
  await createDatetime("Account", "updatedAt", true);
  await createIndexIfMissing("Account", "Account_provider_account_unique", "unique", [
    "providerId",
    "accountId",
  ]);
  await createIndexIfMissing("Account", "Account_user_idx", "key", ["userId"]);

  // Session
  await createString("Session", "userId", 128, true);
  await createDatetime("Session", "expiresAt", true);
  await createString("Session", "token", 512, true);
  await createString("Session", "ipAddress", 64, false);
  await createString("Session", "userAgent", 1024, false);
  await createString("Session", "impersonatedBy", 128, false);
  await createDatetime("Session", "createdAt", true);
  await createDatetime("Session", "updatedAt", true);
  await createIndexIfMissing("Session", "Session_token_unique", "unique", ["token"]);
  await createIndexIfMissing("Session", "Session_user_idx", "key", ["userId"]);

  // Verification
  await createString("Verification", "value", 512, true);
  await createDatetime("Verification", "expiresAt", true);
  await createString("Verification", "identifier", 256, true);
  await createDatetime("Verification", "createdAt", true);
  await createDatetime("Verification", "updatedAt", true);
  await createIndexIfMissing("Verification", "Verification_identifier_idx", "key", ["identifier"]);

  // Test
  await createString("Test", "title", 512, true);
  await createString("Test", "description", 10000, false);
  await createString("Test", "tags", 64, false, true);
  await createUrl("Test", "pdfUrl", false);
  await createString("Test", "visibility", 16, true);
  await createBoolean("Test", "hidden", true, false);
  await createBoolean("Test", "isPyq", true, false);
  await createString("Test", "exam", 128, false);
  await createString("Test", "examId", 128, false);
  await createInteger("Test", "year", false);
  await createString("Test", "shift", 64, false);
  await createString("Test", "stream", 64, false);
  await createString("Test", "accessCode", 64, false);
  await createInteger("Test", "durationMinutes", true);
  await createInteger("Test", "markingCorrect", true);
  await createInteger("Test", "markingIncorrect", true);
  await createBoolean("Test", "lockNavigation", true, false);
  await createString("Test", "ownerId", 128, true);
  await createDatetime("Test", "createdAt", true);
  await createDatetime("Test", "updatedAt", true);
  await createIndexIfMissing("Test", "Test_owner_idx", "key", ["ownerId"]);
  await createIndexIfMissing("Test", "Test_exam_idx", "key", ["examId"]);

  // Question (compact schema to fit Appwrite attribute limits)
  await createString("Question", "testId", 128, true);
  await createString("Question", "subject", 64, true);
  await createString("Question", "difficulty", 32, true);
  await createString("Question", "questionType", 16, true);
  await createString("Question", "chapter", 256, false);
  await createString("Question", "topic", 256, false);
  await createDatetime("Question", "createdAt", true);
  await createDatetime("Question", "updatedAt", true);
  await createIndexIfMissing("Question", "Question_test_idx", "key", ["testId"]);

  // QuestionPayload (stores long text + crop + grading fields)
  await createString("QuestionPayload", "prompt", 4000, false);
  await createString("QuestionPayload", "options", 4000, false);
  await createString("QuestionPayload", "imageUrl", 1024, false);
  await createString("QuestionPayload", "crop", 256, false);
  await createString("QuestionPayload", "data", 1000, false);
  await createDatetime("QuestionPayload", "createdAt", true);
  await createDatetime("QuestionPayload", "updatedAt", true);

  // Attempt (compact schema)
  await createString("Attempt", "testId", 128, true);
  await createString("Attempt", "userId", 128, true);
  await createString("Attempt", "status", 32, true);
  await createInteger("Attempt", "score", true, null, null, 0);
  await createFloat("Attempt", "accuracy", true, null, null, 0);
  await createInteger("Attempt", "timeTaken", true, null, null, 0);
  await createString("Attempt", "data", 10000, false);
  await createDatetime("Attempt", "createdAt", true);
  await createDatetime("Attempt", "updatedAt", true);
  await createIndexIfMissing("Attempt", "Attempt_test_idx", "key", ["testId"]);
  await createIndexIfMissing("Attempt", "Attempt_user_idx", "key", ["userId"]);

  // TestPercentileBand
  await createString("TestPercentileBand", "testId", 128, true);
  await createInteger("TestPercentileBand", "minScore", true);
  await createInteger("TestPercentileBand", "maxScore", false);
  await createString("TestPercentileBand", "percentileLabel", 64, true);
  await createDatetime("TestPercentileBand", "createdAt", true);
  await createDatetime("TestPercentileBand", "updatedAt", true);
  await createIndexIfMissing("TestPercentileBand", "TestPercentileBand_test_idx", "key", ["testId"]);
  await createIndexIfMissing("TestPercentileBand", "TestPercentileBand_unique", "unique", ["testId", "minScore"]);

  // BroadcastMessage
  await createString("BroadcastMessage", "title", 256, true);
  await createString("BroadcastMessage", "body", 10000, true);
  await createBoolean("BroadcastMessage", "active", true, true);
  await createDatetime("BroadcastMessage", "startsAt", false);
  await createDatetime("BroadcastMessage", "endsAt", false);
  await createString("BroadcastMessage", "createdById", 128, false);
  await createDatetime("BroadcastMessage", "createdAt", true);
  await createDatetime("BroadcastMessage", "updatedAt", true);

  // Exam
  await createString("Exam", "name", 128, true);
  await createString("Exam", "shortCode", 32, false);
  await createInteger("Exam", "order", true, null, null, 0);
  await createBoolean("Exam", "active", true, true);
  await createDatetime("Exam", "createdAt", true);
  await createDatetime("Exam", "updatedAt", true);
  await createIndexIfMissing("Exam", "Exam_name_unique", "unique", ["name"]);

  // Chapter
  await createString("Chapter", "examId", 128, false);
  await createString("Chapter", "subject", 64, true);
  await createString("Chapter", "name", 256, true);
  await createInteger("Chapter", "order", true, null, null, 0);
  await createDatetime("Chapter", "createdAt", true);
  await createDatetime("Chapter", "updatedAt", true);
  await createIndexIfMissing("Chapter", "Chapter_exam_subject_name_unique", "unique", [
    "examId",
    "subject",
    "name",
  ]);

  // Topic
  await createString("Topic", "chapterId", 128, true);
  await createString("Topic", "name", 256, true);
  await createInteger("Topic", "order", true, null, null, 0);
  await createDatetime("Topic", "createdAt", true);
  await createDatetime("Topic", "updatedAt", true);
  await createIndexIfMissing("Topic", "Topic_chapter_name_unique", "unique", ["chapterId", "name"]);

  // ExamPaper
  await createString("ExamPaper", "examId", 128, true);
  await createInteger("ExamPaper", "year", true);
  await createString("ExamPaper", "shift", 64, false);
  await createUrl("ExamPaper", "pdfUrl", true);
  await createString("ExamPaper", "testId", 128, false);
  await createDatetime("ExamPaper", "createdAt", true);
  await createDatetime("ExamPaper", "updatedAt", true);
  await createIndexIfMissing("ExamPaper", "ExamPaper_exam_year_idx", "key", ["examId", "year"]);

  // SavedQuestion
  await createString("SavedQuestion", "userId", 128, true);
  await createString("SavedQuestion", "questionId", 128, true);
  await createDatetime("SavedQuestion", "createdAt", true);
  await createIndexIfMissing("SavedQuestion", "SavedQuestion_unique", "unique", ["userId", "questionId"]);

  // AppConfig
  await createString("AppConfig", "key", 128, true);
  await createBoolean("AppConfig", "maintenanceMode", true, false);
  await createDatetime("AppConfig", "createdAt", true);
  await createDatetime("AppConfig", "updatedAt", true);
  await createIndexIfMissing("AppConfig", "AppConfig_key_unique", "unique", ["key"]);
};

const run = async () => {
  await ensureDatabase();
  await ensureCollections();
  await ensureAttributes();
  console.log("Appwrite schema created.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
