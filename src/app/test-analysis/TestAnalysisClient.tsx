"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassRail from "@/components/GlassRail";
import { safeJson } from "@/lib/safe-json";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption: string;
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  marks: "+4/-1";
  difficulty: "Easy" | "Moderate" | "Tough";
  imageDataUrl: string;
};

type Test = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  visibility: "Public" | "Private";
  accessCode?: string;
  durationMinutes?: number;
  markingCorrect?: number;
  markingIncorrect?: number;
  ownerId?: string;
  crops: Crop[];
};

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  score?: number;
  accuracy?: number;
  timeTaken?: number;
  answers: Record<string, string>;
  timeSpent: Record<string, number>;
  events?: {
    answerChanges?: Record<string, number>;
    rapidChanges?: Record<string, number>;
    firstAnsweredAt?: Record<string, number>;
    tabSwitches?: number;
    idleGaps?: number;
    idleSeconds?: number;
    sectionOrder?: Array<"Physics" | "Chemistry" | "Maths">;
    questionOrder?: string[];
    questionFirstSeen?: Record<string, number>;
    questionTimeline?: Array<{ id: string; enteredAt: number; exitedAt: number }>;
  };
};

type PercentileBand = {
  minScore: number;
  maxScore?: number | null;
  percentileLabel: string;
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance Analysis" },
  { id: "time", label: "Time Analysis" },
  { id: "attempt", label: "Attempt Analysis" },
  { id: "difficulty", label: "Difficulty Analysis" },
  { id: "movement", label: "Subject Movement" },
  { id: "journey", label: "Question Journey" },
  { id: "qs", label: "Qs by Qs Analysis" },
];

const SUBJECT_META: Record<
  "Physics" | "Chemistry" | "Maths",
  { badge: string; short: string }
> = {
  Physics: { badge: "bg-emerald-500/20 text-emerald-200", short: "P" },
  Chemistry: { badge: "bg-orange-500/20 text-orange-200", short: "C" },
  Maths: { badge: "bg-sky-500/20 text-sky-200", short: "M" },
};

const formatMinutes = (seconds: number) => Math.round(seconds / 60);
const cardClass =
  "rounded-3xl border border-white/10 bg-[#121826] p-6 shadow-[0_8px_30px_rgba(8,12,20,0.45)]";
const softCardClass = "rounded-2xl border border-white/10 bg-[#101624] p-4";
const isCorrectAnswer = (crop: Crop, selected?: string) => {
  if (!selected) return false;
  if (crop.questionType === "NUM") {
    const normalized = selected.trim();
    return normalized !== "" && normalized === (crop.correctNumeric ?? "").trim();
  }
  if (crop.questionType === "MSQ") {
    const expected = (crop.correctOptions ?? []).slice().sort().join(",");
    const got = selected
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return got !== "" && got === expected;
  }
  return selected === crop.correctOption;
};

const normalizeAnswer = (raw: string) => raw.trim().toUpperCase();

const parseAnswerKeyText = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const parsed: Array<{ index?: number; value: string }> = [];
  for (const line of lines) {
    const cleaned = line.replace(/\t+/g, " ").trim();
    const match = cleaned.match(
      /^(?:Q\s*)?(\d{1,4})[\)\.\-: ]+\s*([A-Da-d, ]+|[0-9.+-]+)$/i
    );
    if (match) {
      const idx = Number(match[1]);
      const value = normalizeAnswer(match[2].replace(/\s+/g, ""));
      parsed.push({ index: Number.isFinite(idx) ? idx : undefined, value });
      continue;
    }
    parsed.push({ value: normalizeAnswer(cleaned.replace(/\s+/g, "")) });
  }
  return parsed;
};

const parseAnswerKeyTokens = (text: string) => {
  const rawTokens = text
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");
  const markerSet = new Set(["Q", "Q.", "QUE", "QUE.", "QUESTION", "A", "A.", "ANS", "ANS.", "ANSWER"]);
  const upperTokens = rawTokens.map((token) => token.toUpperCase());
  const aIndex = upperTokens.findIndex((token) => markerSet.has(token) && token.startsWith("A"));
  if (aIndex > 0) {
    const qIndex = upperTokens.findIndex((token) => markerSet.has(token) && token.startsWith("Q"));
    const start = qIndex >= 0 ? qIndex + 1 : 0;
    const numTokens = rawTokens.slice(start, aIndex).filter((token) => /^\d{1,4}$/.test(token));
    const ansTokens = rawTokens
      .slice(aIndex + 1)
      .filter(
        (token) =>
          /^[A-Da-d]+$/.test(token) ||
          /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token) ||
          /^[0-9.+-]+$/.test(token)
      )
      .map((token) => normalizeAnswer(token));
    if (numTokens.length >= 3 && ansTokens.length >= numTokens.length) {
      return numTokens.map((num, idx) => ({ index: Number(num), value: ansTokens[idx] }));
    }
  }
  const tokens = rawTokens.filter((token) => {
    const upper = token.toUpperCase();
    if (["Q", "Q.", "QUE", "QUE.", "QUESTION", "ANS", "ANS.", "A", "A."].includes(upper)) {
      return false;
    }
    if (["SECTION", "PART", "PHYSICS", "CHEMISTRY", "MATHS"].includes(upper)) {
      return false;
    }
    return true;
  });
  const entries: Array<{ index?: number; value: string }> = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const indexToken = tokens[i];
    const valueToken = tokens[i + 1];
    if (!/^\d{1,4}$/.test(indexToken)) {
      continue;
    }
    if (
      !/^[A-Da-d]+$/.test(valueToken) &&
      !/^[A-Da-d](?:[,A-Da-d]+)+$/.test(valueToken) &&
      !/^[0-9.+-]+$/.test(valueToken)
    ) {
      continue;
    }
    entries.push({ index: Number(indexToken), value: normalizeAnswer(valueToken) });
  }
  return entries;
};

const parseAnswerKeyRows = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const entries: Array<{ index?: number; value: string }> = [];
  const qRegex = /\bQ(?:UE|UESTION)?\.?\b/i;
  const aRegex = /\bA(?:NS|NSWER)?\.?\b/i;
  const extractNums = (line: string) => line.match(/\b\d{1,4}\b/g)?.map(Number) ?? [];
  const extractAns = (line: string) =>
    line
      .replace(qRegex, " ")
      .replace(aRegex, " ")
      .replace(/[^A-Da-d0-9.+-,]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter(
        (token) =>
          /^[A-Da-d]+$/.test(token) ||
          /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token) ||
          /^[0-9.+-]+$/.test(token)
      )
      .map((token) => normalizeAnswer(token));

  for (let i = 0; i < lines.length - 1; i += 1) {
    if (!qRegex.test(lines[i])) continue;
    const nums = extractNums(lines[i]);
    if (nums.length < 3) continue;
    const ansLine = lines[i + 1];
    if (!aRegex.test(ansLine)) continue;
    const ans = extractAns(ansLine);
    if (ans.length >= nums.length) {
      nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
      return entries;
    }
  }
  return entries;
};

const parseAnswerKeyGrid = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const entries: Array<{ index?: number; value: string }> = [];
  const qRegex = /\bQ(?:UE|UESTION)?\.?\b/i;
  const aRegex = /\bA(?:NS|NSWER)?\.?\b/i;
  const extractNums = (line: string) => line.match(/\b\d{1,4}\b/g)?.map(Number) ?? [];
  const extractAns = (line: string, allowNumeric: boolean) =>
    line
      .replace(qRegex, " ")
      .replace(aRegex, " ")
      .replace(/[^A-Da-d0-9.+-,]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => {
        if (/^[A-Da-d]+$/.test(token) || /^[A-Da-d](?:[,A-Da-d]+)+$/.test(token)) {
          return true;
        }
        if (allowNumeric && /^[0-9.+-]+$/.test(token)) {
          return true;
        }
        return false;
      })
      .map((token) => normalizeAnswer(token.replace(/;+/, ",")));

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const hasQ = qRegex.test(line);
    const hasA = aRegex.test(line);
    if (hasQ && hasA) {
      const splitIdx = line.search(aRegex);
      if (splitIdx >= 0) {
        const qPart = line.slice(0, splitIdx);
        const aPart = line.slice(splitIdx);
        const nums = extractNums(qPart);
        const ans = extractAns(aPart, true);
        if (nums.length >= 1 && ans.length >= nums.length) {
          nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
          continue;
        }
      }
    }

    if (hasQ) {
      const nums = extractNums(line);
      if (nums.length >= 3) {
        for (let j = i + 1; j < lines.length; j += 1) {
          const nextHasA = aRegex.test(lines[j]);
          const ans = extractAns(lines[j], nextHasA);
          if (ans.length >= nums.length) {
            nums.forEach((num, idx) => entries.push({ index: num, value: ans[idx] }));
            i = j;
            break;
          }
          if (nextHasA && ans.length > 0) {
            break;
          }
        }
      }
      continue;
    }

    const nums = extractNums(line);
    if (nums.length >= 3) {
      const ansSameLine = extractAns(line, hasA);
      if (hasA && ansSameLine.length >= nums.length) {
        nums.forEach((num, idx) => entries.push({ index: num, value: ansSameLine[idx] }));
        continue;
      }
      const nextLine = lines[i + 1];
      if (!nextLine) continue;
      const nextHasA = aRegex.test(nextLine);
      const ansNext = extractAns(nextLine, nextHasA);
      if (ansNext.length >= nums.length) {
        nums.forEach((num, idx) => entries.push({ index: num, value: ansNext[idx] }));
        i += 1;
      }
    }
  }

  return entries;
};

const extractPdfText = async (file: File) => {
  const mod = await import("pdfjs-dist");
  mod.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const arrayBuffer = await file.arrayBuffer();
  const doc = await mod.getDocument({ data: arrayBuffer }).promise;
  let all = "";
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str || "").join(" ");
    all += `${text}\n`;
  }
  return all;
};

type TestAnalysisClientProps = {
  initialTests: Test[];
  initialAttempts: Attempt[];
};

export default function TestAnalysisClient({ initialTests, initialAttempts }: TestAnalysisClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tests, setTests] = useState<Test[]>(initialTests);
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [percentileBands, setPercentileBands] = useState<PercentileBand[]>([]);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [activeTestId, setActiveTestId] = useState<string>("");
  const [activeAttemptId, setActiveAttemptId] = useState<string>("");
  const [learnings, setLearnings] = useState<string[]>(["", "", ""]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [answerKeyStatus, setAnswerKeyStatus] = useState<{
    message: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [answerKeyPreview, setAnswerKeyPreview] = useState<
    Array<{ index: number; value: string }>
  >([]);
  const [answerKeyPending, setAnswerKeyPending] = useState<
    Array<{ index?: number; value: string }>
  >([]);
  const [answerKeyMode, setAnswerKeyMode] = useState<"manual" | "file">("file");
  const [manualAnswerKey, setManualAnswerKey] = useState("");


  const questionStats = useMemo(() => {
    if (!activeTest || !selectedAttempt) {
      return null;
    }
    let correct = 0;
    let attempted = 0;
    let score = 0;
    let time = 0;

    activeTest.crops.forEach((crop) => {
      const selected = selectedAttempt.answers[crop.id];
      if (!selected) return;
      attempted += 1;
      time += selectedAttempt.timeSpent[crop.id] ?? 0;
      if (isCorrectAnswer(crop, selected)) {
        correct += 1;
        score += activeTest.markingCorrect ?? 4;
      } else {
        score += activeTest.markingIncorrect ?? -1;
      }
    });

    const totalQuestions = activeTest.crops.length;
    const wrong = attempted - correct;
    const notAttempted = totalQuestions - attempted;
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
    const percentile = Math.min(99.9, Math.max(1, 5 + accuracy * 0.95));
    const sortedBands = percentileBands.slice().sort((a, b) => a.minScore - b.minScore);
    let percentileBand: PercentileBand | undefined;
    sortedBands.forEach((band) => {
      if (score < band.minScore) return;
      if (band.maxScore !== null && band.maxScore !== undefined && score > band.maxScore) return;
      percentileBand = band;
    });
    const percentileLabel = percentileBand?.percentileLabel?.trim() || "";

    const subjectStats = activeTest.crops.reduce(
      (acc, crop) => {
        if (!acc[crop.subject]) {
          acc[crop.subject] = { attempted: 0, correct: 0, time: 0, total: 0, score: 0 };
        }
        acc[crop.subject].total += 1;
        const selected = selectedAttempt.answers[crop.id];
        if (!selected) return acc;
        acc[crop.subject].attempted += 1;
        acc[crop.subject].time += selectedAttempt.timeSpent[crop.id] ?? 0;
        if (isCorrectAnswer(crop, selected)) {
          acc[crop.subject].correct += 1;
          acc[crop.subject].score += activeTest.markingCorrect ?? 4;
        } else {
          acc[crop.subject].score += activeTest.markingIncorrect ?? -1;
        }
        return acc;
      },
      {} as Record<string, { attempted: number; correct: number; time: number; total: number; score: number }>
    );

    return {
      score,
      attempted,
      correct,
      wrong,
      notAttempted,
      totalQuestions,
      accuracy,
      percentile,
      percentileLabel,
      time,
      subjectStats,
    };
  }, [activeTest, percentileBands, selectedAttempt]);

  const hasAnswerKey = useMemo(() => {
    if (!activeTest) return false;
    return activeTest.crops.some((crop) => {
      if (crop.questionType === "NUM") {
        return Boolean(crop.correctNumeric && crop.correctNumeric.trim().length > 0);
      }
      if (crop.questionType === "MSQ") {
        return Boolean(crop.correctOptions && crop.correctOptions.length > 0);
      }
      return Boolean(crop.correctOption && crop.correctOption.trim().length > 0);
    });
  }, [activeTest]);

  const scoreEntries = (entries: Array<{ index?: number; value: string }>) => {
    if (!entries.length) return -1;
    let letterLike = 0;
    let numericLike = 0;
    let shortNums = 0;
    let indexed = 0;
    entries.forEach((entry) => {
      const value = entry.value.trim();
      if (entry.index && entry.index > 0) {
        indexed += 1;
      }
      if (/^[A-D](,[A-D])*$/.test(value)) {
        letterLike += 1;
        return;
      }
      if (/^[0-9.+-]+$/.test(value)) {
        numericLike += 1;
        if (!value.includes(".") && value.length <= 2) shortNums += 1;
      }
    });
    return letterLike * 5 + numericLike * 2 + indexed * 2 - shortNums;
  };

  const pickBestEntries = (
    candidates: Array<Array<{ index?: number; value: string }>>
  ) => {
    const scored = candidates.map((entries) => ({
      entries,
      score: scoreEntries(entries),
      hasLetters: entries.some((entry) => /^[A-D](,[A-D])*$/.test(entry.value.trim())),
    }));
    const withLetters = scored.filter((item) => item.hasLetters);
    const pool = withLetters.length ? withLetters : scored;
    return pool.sort((a, b) => b.score - a.score || b.entries.length - a.entries.length)[0]
      ?.entries ?? [];
  };

  const handleAnswerKeyInput = (text: string) => {
    const rowEntries = parseAnswerKeyRows(text);
    const lineEntries = parseAnswerKeyText(text);
    const tokenEntries = parseAnswerKeyTokens(text);
    const gridEntries = parseAnswerKeyGrid(text);
    const entries =
      rowEntries.length > 0
        ? rowEntries
        : pickBestEntries([lineEntries, tokenEntries, gridEntries]);
    setAnswerKeyPending(entries);
    const preview = entries
      .map((entry, idx) => ({
        index: entry.index ?? idx + 1,
        value: entry.value,
      }))
      .slice(0, 10);
    setAnswerKeyPreview(preview);
    setAnswerKeyStatus({
      message: `Parsed ${entries.length} answers. Review and apply.`,
      tone: "info",
    });
  };

  const handleAnswerKeyUpload = async (file: File | null) => {
    if (!file) return;
    setAnswerKeyStatus({ message: "Parsing answer key...", tone: "info" });
    try {
      const text =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? await extractPdfText(file)
          : await file.text();
      handleAnswerKeyInput(text);
    } catch {
      setAnswerKeyStatus({
        message: "Failed to read answer key.",
        tone: "error",
      });
    }
  };

  const applyAnswerKey = async () => {
    if (!activeTest) return;
    if (!answerKeyPending.length) {
      setAnswerKeyStatus({ message: "No answers to apply.", tone: "error" });
      return;
    }
    const response = await fetch("/api/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: activeTest.id, entries: answerKeyPending }),
    });
    const updated = await safeJson<Test | null>(response, null);
    if (!response.ok || !updated?.id) {
      const message =
        (updated as { error?: string } | null)?.error ?? "Failed to update answer key.";
      setAnswerKeyStatus({ message, tone: "error" });
      return;
    }
    setTests((prev) => prev.map((test) => (test.id === updated.id ? updated : test)));
    setAnswerKeyStatus({ message: "Answer key updated.", tone: "success" });
    setAnswerKeyPreview([]);
    setAnswerKeyPending([]);
  };

  const attemptQuality = useMemo(() => {
    if (!activeTest || !selectedAttempt || !questionStats) return null;
    const avgTime =
      questionStats.attempted > 0 ? questionStats.time / questionStats.attempted : 0;
    const summary = { perfect: 0, wasted: 0, overtime: 0, confused: 0 };

    activeTest.crops.forEach((crop) => {
      const selected = selectedAttempt.answers[crop.id];
      const spent = selectedAttempt.timeSpent[crop.id] ?? 0;
      if (!selected && spent > avgTime * 0.6) {
        summary.confused += 1;
        return;
      }
      if (!selected) return;
      if (spent > avgTime * 1.5) {
        summary.overtime += 1;
      } else if (!isCorrectAnswer(crop, selected) && spent < avgTime * 0.6) {
        summary.wasted += 1;
      } else if (isCorrectAnswer(crop, selected)) {
        summary.perfect += 1;
      }
    });

    return summary;
  }, [activeTest, selectedAttempt, questionStats]);

  const difficultyStats = useMemo(() => {
    if (!activeTest || !selectedAttempt) return null;
    const stats = { Easy: 0, Moderate: 0, Tough: 0 };
    activeTest.crops.forEach((crop) => {
      const selected = selectedAttempt.answers[crop.id];
      if (!selected) return;
      if (isCorrectAnswer(crop, selected)) {
        stats[crop.difficulty] += 1;
      }
    });
    return stats;
  }, [activeTest, selectedAttempt]);

  const journeyBuckets = useMemo(() => {
    if (!activeTest || !selectedAttempt?.events?.firstAnsweredAt) return [];
    const buckets = [
      { label: "0-30 min", start: 0, end: 30 * 60 },
      { label: "30-60 min", start: 30 * 60, end: 60 * 60 },
      { label: "60-90 min", start: 60 * 60, end: 90 * 60 },
      { label: "90-120 min", start: 90 * 60, end: 120 * 60 },
      { label: "120-150 min", start: 120 * 60, end: 150 * 60 },
      { label: "150-180 min", start: 150 * 60, end: 180 * 60 },
    ];
    const entries = Object.entries(selectedAttempt.events.firstAnsweredAt);
    return buckets.map((bucket) => {
      const items = entries
        .filter(([, time]) => time >= bucket.start && time < bucket.end)
        .map(([id]) => {
          const index = activeTest.crops.findIndex((crop) => crop.id === id);
          return index >= 0 ? index + 1 : null;
        })
        .filter(Boolean) as number[];
      return { label: bucket.label, items };
    });
  }, [activeTest, selectedAttempt]);

  const questionMeta = useMemo(() => {
    if (!activeTest || !selectedAttempt) return [];
    return activeTest.crops.map((crop, index) => {
      const selected = selectedAttempt.answers[crop.id];
      const correct = isCorrectAnswer(crop, selected);
      const changes = selectedAttempt.events?.answerChanges?.[crop.id] ?? 0;
      const firstAt = selectedAttempt.events?.firstAnsweredAt?.[crop.id];
      const status = !selected ? "not-attempted" : correct ? "correct" : "wrong";
      return {
        id: crop.id,
        number: index + 1,
        subject: crop.subject,
        status,
        changes,
        firstAt,
      };
    });
  }, [activeTest, selectedAttempt]);

  const subjectMovement = useMemo(() => {
    if (!activeTest || !selectedAttempt) return [];
    const order =
      selectedAttempt.events?.sectionOrder?.length
        ? (selectedAttempt.events.sectionOrder as Array<"Physics" | "Chemistry" | "Maths">)
        : (() => {
            const first = selectedAttempt.events?.firstAnsweredAt ?? {};
            const subjectFirst: Record<string, number> = {};
            Object.entries(first).forEach(([id, time]) => {
              const crop = activeTest.crops.find((item) => item.id === id);
              if (!crop) return;
              if (subjectFirst[crop.subject] === undefined) {
                subjectFirst[crop.subject] = time as number;
              } else {
                subjectFirst[crop.subject] = Math.min(subjectFirst[crop.subject], time as number);
              }
            });
            return Object.entries(subjectFirst)
              .sort((a, b) => a[1] - b[1])
              .map(([subject]) => subject as "Physics" | "Chemistry" | "Maths");
          })();

    const timeBySubject = activeTest.crops.reduce(
      (acc, crop) => {
        const spent = selectedAttempt.timeSpent[crop.id] ?? 0;
        acc[crop.subject] = (acc[crop.subject] ?? 0) + spent;
        return acc;
      },
      {} as Record<string, number>
    );

    const attemptedBySubject = activeTest.crops.reduce(
      (acc, crop) => {
        const selected = selectedAttempt.answers[crop.id];
        if (selected) {
          acc[crop.subject] = (acc[crop.subject] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return order.map((subject) => ({
      subject,
      attempted: attemptedBySubject[subject] ?? 0,
      time: timeBySubject[subject] ?? 0,
    }));
  }, [activeTest, selectedAttempt]);

  const timeQuality = useMemo(() => {
    if (!activeTest || !selectedAttempt) return null;
    let correctTime = 0;
    let wrongTime = 0;
    let unattemptedTime = 0;
    activeTest.crops.forEach((crop) => {
      const selected = selectedAttempt.answers[crop.id];
      const spent = selectedAttempt.timeSpent[crop.id] ?? 0;
      if (!selected) {
        unattemptedTime += spent;
      } else if (isCorrectAnswer(crop, selected)) {
        correctTime += spent;
      } else {
        wrongTime += spent;
      }
    });
    const total = Math.max(1, correctTime + wrongTime + unattemptedTime);
    return {
      correctTime,
      wrongTime,
      unattemptedTime,
      correctPct: Math.round((correctTime / total) * 100),
      wrongPct: Math.round((wrongTime / total) * 100),
      unattemptedPct: Math.round((unattemptedTime / total) * 100),
      total,
    };
  }, [activeTest, selectedAttempt]);

  const timeJourney = useMemo(() => {
    if (!selectedAttempt) return [];
    const buckets = [
      { label: "0-30 min", start: 0, end: 30 * 60 },
      { label: "30-60 min", start: 30 * 60, end: 60 * 60 },
      { label: "60-90 min", start: 60 * 60, end: 90 * 60 },
      { label: "90-120 min", start: 90 * 60, end: 120 * 60 },
      { label: "120-150 min", start: 120 * 60, end: 150 * 60 },
      { label: "150-180 min", start: 150 * 60, end: 180 * 60 },
    ];
    return buckets.map((bucket) => {
      const items = questionMeta.filter(
        (q) => q.firstAt !== undefined && q.firstAt >= bucket.start && q.firstAt < bucket.end
      );
      const correct = items.filter((q) => q.status === "correct").length;
      const wrong = items.filter((q) => q.status === "wrong").length;
      return { label: bucket.label, correct, wrong, overall: items.length };
    });
  }, [questionMeta, selectedAttempt]);

  const totalQuestions = activeTest?.crops.length ?? 0;
  const maxScore = totalQuestions * (activeTest?.markingCorrect ?? 4);
  const activeSectionLabel = useMemo(
    () => SECTIONS.find((section) => section.id === activeSection)?.label ?? "Overview",
    [activeSection]
  );
  const questionStatusMap = useMemo(() => {
    const map: Record<number, string> = {};
    questionMeta.forEach((item) => {
      map[item.number] = item.status;
    });
    return map;
  }, [questionMeta]);

  useEffect(() => {
    if (!activeTestId || !selectedAttempt) return;
    if (typeof window === "undefined") return;
    const key = `learn-${activeTestId}-${selectedAttempt.id}`;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setLearnings([
          parsed[0] ?? "",
          parsed[1] ?? "",
          parsed[2] ?? "",
        ]);
        return;
      } catch {
        setLearnings(["", "", ""]);
      }
    } else {
      setLearnings(["", "", ""]);
    }
  }, [activeTestId, selectedAttempt]);

  const updateLearning = (index: number, value: string) => {
    setLearnings((prev) => {
      const next = [...prev];
      next[index] = value;
      if (activeTestId && selectedAttempt && typeof window !== "undefined") {
        const key = `learn-${activeTestId}-${selectedAttempt.id}`;
        window.localStorage.setItem(key, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleDownload = () => {
    if (!activeTest || !selectedAttempt || !questionStats) return;
    const payload = {
      test: { id: activeTest.id, title: activeTest.title },
      attempt: {
        id: selectedAttempt.id,
        createdAt: selectedAttempt.createdAt,
        score: questionStats.score,
        accuracy: questionStats.accuracy,
        percentile: questionStats.percentile,
        timeTaken: questionStats.time,
      },
      subjectSummary: questionStats.subjectStats,
      stats: {
        attempted: questionStats.attempted,
        correct: questionStats.correct,
        wrong: questionStats.wrong,
        notAttempted: questionStats.notAttempted,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTest.title.replace(/\\s+/g, "-").toLowerCase()}-analysis.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleViewSolution = () => {
    if (!activeTestId) return;
    router.push(`/cbt?testId=${activeTestId}&solution=1`);
  };

  const questionsBySubject = useMemo(() => {
    const grouped: Record<string, typeof questionMeta> = {};
    questionMeta.forEach((item) => {
      if (!grouped[item.subject]) grouped[item.subject] = [];
      grouped[item.subject].push(item);
    });
    return grouped;
  }, [questionMeta]);

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <GlassRail />
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-6 pt-24 pb-10">
        <aside className="hidden w-64 shrink-0 flex-col gap-4 lg:flex">
          <div className="rounded-3xl border border-white/10 bg-[#121826] p-4 shadow-[0_10px_30px_rgba(8,12,20,0.5)]">
            <p className="text-xs text-white/50">Test Analysis</p>
            <p className="mt-1 text-lg font-semibold">{activeTest?.title ?? "Select a test"}</p>
            <div className="mt-3 flex gap-2">
              <button className="rounded-full bg-indigo-500/90 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                Personal
              </button>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30">
                Comparative
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#111727] p-2 text-xs">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition ${
                  activeSection === section.id
                    ? "bg-white/15 text-white shadow-inner"
                    : "text-white/70 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[11px] font-semibold uppercase text-white/70">
                    {section.label.charAt(0)}
                  </span>
                  <span>{section.label}</span>
                </div>
                <span className="text-white/30">{">"}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 space-y-6">
{activeSection === "overview" && questionStats && (
                <>
                  <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                    <div className="rounded-[28px] border border-white/10 bg-[#121a2b] p-6 shadow-[0_20px_50px_rgba(7,10,18,0.5)]">
                      <p className="text-xs uppercase text-white/60">Overall Score</p>
                      <p className="mt-4 text-5xl font-semibold">
                        {questionStats.score}
                        <span className="text-base text-white/50"> / {maxScore}</span>
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-white/70">
                        {Object.entries(questionStats.subjectStats).map(([subject, stats]) => (
                          <div key={subject}>
                            <p className="text-white/50">{subject}</p>
                            <p
                              className={`text-lg font-semibold ${
                                subject === "Physics"
                                  ? "text-emerald-200"
                                  : subject === "Chemistry"
                                  ? "text-orange-200"
                                  : "text-sky-200"
                              }`}
                            >
                              {stats.score}/{stats.total * (activeTest?.markingCorrect ?? 4)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-[#0b0f1a] p-6 shadow-[0_20px_50px_rgba(22,24,38,0.6)]">
                      <p className="text-xs uppercase text-white/60">Predicted Percentile</p>
                      <p className="mt-5 text-5xl font-semibold">
                        {questionStats.percentileLabel
                          ? questionStats.percentileLabel
                          : questionStats.percentile.toFixed(1)}
                      </p>
                      <p className="mt-2 text-xs text-white/60">Based on this attempt</p>
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-[#121826] p-5">
                      <p className="text-xs text-white/60">Qs Attempted</p>
                      <p className="mt-3 text-3xl font-semibold">
                        {questionStats.attempted}/{questionStats.totalQuestions}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#121826] p-5">
                      <p className="text-xs text-white/60">Accuracy</p>
                      <p className="mt-3 text-3xl font-semibold">{questionStats.accuracy}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#121826] p-5">
                      <p className="text-xs text-white/60">Time Taken</p>
                      <p className="mt-3 text-3xl font-semibold">
                        {formatMinutes(questionStats.time)} min
                      </p>
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
                      <p className="text-xs text-white/50">Positive Score</p>
                      <p className="mt-2 text-2xl font-semibold">{questionStats.score}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
                      <p className="text-xs text-white/50">Marks Lost</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {Math.max(
                          0,
                          questionStats.wrong * Math.abs(activeTest?.markingIncorrect ?? -1)
              