"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassRail from "@/components/GlassRail";

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
};

type Test = {
  id: string;
  title: string;
  visibility: "Public" | "Private";
  accessCode?: string;
  durationMinutes?: number;
  markingCorrect?: number;
  markingIncorrect?: number;
  crops: Crop[];
};

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  score?: number;
  accuracy?: number;
  timeTaken?: number;
  answers: Record<string, "A" | "B" | "C" | "D" | "">;
  timeSpent: Record<string, number>;
  events?: {
    answerChanges?: Record<string, number>;
    rapidChanges?: Record<string, number>;
    firstAnsweredAt?: Record<string, number>;
    tabSwitches?: number;
    idleGaps?: number;
    idleSeconds?: number;
    sectionOrder?: Array<"Physics" | "Chemistry" | "Maths">;
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

export default function TestAnalysisClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [globalAttempts, setGlobalAttempts] = useState<Attempt[]>([]);
  const [percentileBands, setPercentileBands] = useState<PercentileBand[]>([]);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [activeTestId, setActiveTestId] = useState<string>("");
  const [activeAttemptId, setActiveAttemptId] = useState<string>("");
  const [learnings, setLearnings] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    const load = async () => {
      const testsResponse = await fetch("/api/tests");
      const testsData = await testsResponse.json();
      setTests(Array.isArray(testsData) ? testsData : []);

      const attemptsResponse = await fetch("/api/attempts");
      const attemptsData = await attemptsResponse.json();
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!activeTestId) return;
    const loadGlobal = async () => {
      const response = await fetch(`/api/attempts?testId=${activeTestId}&scope=global`);
      const data = await response.json();
      setGlobalAttempts(Array.isArray(data) ? data : []);
    };
    loadGlobal();
  }, [activeTestId]);

  useEffect(() => {
    if (!activeTestId) return;
    const loadBands = async () => {
      const response = await fetch(`/api/percentile-bands?testId=${activeTestId}`);
      const data = await response.json();
      setPercentileBands(
        Array.isArray(data)
          ? data.map((band) => ({
              minScore: Number(band.minScore),
              maxScore: band.maxScore === null ? null : Number(band.maxScore),
              percentileLabel: String(band.percentileLabel ?? ""),
            }))
          : []
      );
    };
    loadBands();
  }, [activeTestId]);

  useEffect(() => {
    const queryTestId = searchParams.get("testId");
    if (queryTestId) {
      setActiveTestId(queryTestId);
      return;
    }
    if (!activeTestId && tests.length > 0) {
      setActiveTestId(tests[0].id);
    }
  }, [activeTestId, searchParams, tests]);

  const activeTest = useMemo(
    () => tests.find((test) => test.id === activeTestId) ?? null,
    [activeTestId, tests]
  );

  const attemptsForTest = useMemo(() => {
    if (!activeTestId) return [];
    return attempts
      .filter((attempt) => attempt.testId === activeTestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeTestId, attempts]);

  useEffect(() => {
    if (attemptsForTest.length === 0) {
      setActiveAttemptId("");
      return;
    }
    setActiveAttemptId((prev) =>
      attemptsForTest.some((attempt) => attempt.id === prev) ? prev : attemptsForTest[0].id
    );
  }, [attemptsForTest]);

  const selectedAttempt = useMemo(() => {
    if (attemptsForTest.length === 0) return null;
    if (!activeAttemptId) return attemptsForTest[0];
    return attemptsForTest.find((attempt) => attempt.id === activeAttemptId) ?? attemptsForTest[0];
  }, [activeAttemptId, attemptsForTest]);

  const leaderboardRank = useMemo(() => {
    if (!selectedAttempt) return null;
    if (globalAttempts.length === 0) {
      return { rank: 1, total: 1 };
    }
    const sorted = [...globalAttempts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const index = sorted.findIndex((attempt) => attempt.id === selectedAttempt.id);
    if (index === -1) {
      return { rank: 1, total: sorted.length };
    }
    return { rank: index + 1, total: sorted.length };
  }, [globalAttempts, selectedAttempt]);

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
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Test Analysis</p>
              <h1 className="mt-2 text-2xl font-semibold">{activeSectionLabel}</h1>
              <p className="text-sm text-white/60">{activeTest?.title ?? "Pick a test"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={activeTestId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setActiveTestId(nextId);
                  router.push(`/test-analysis?testId=${nextId}`);
                }}
                className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-white"
              >
                {tests.map((test) => (
                  <option key={test.id} value={test.id}>
                    {test.title}
                  </option>
                ))}
              </select>
              <select
                value={activeAttemptId}
                onChange={(event) => setActiveAttemptId(event.target.value)}
                className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-white"
              >
                {attemptsForTest.map((attempt, index) => (
                  <option key={attempt.id} value={attempt.id}>
                    {index === 0 ? "Latest" : `Attempt ${attemptsForTest.length - index}`} -{" "}
                    {new Date(attempt.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
              <button
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/80 hover:border-white/30"
                onClick={handleDownload}
              >
                Download Analysis
              </button>
              <button
                className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                onClick={handleViewSolution}
              >
                View Solution &gt;
              </button>
            </div>
          </header>

          {!activeTest || !selectedAttempt ? (
            <div className={`${cardClass} text-sm text-white/70`}>
              No attempts found for this test yet.
            </div>
          ) : (
            <>
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

                  <section className="grid gap-4 lg:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
                      <p className="text-xs text-white/50">Leaderboard Rank</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {leaderboardRank ? `${leaderboardRank.rank}/${leaderboardRank.total}` : "1/1"}
                      </p>
                    </div>
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
                        )}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4">
                      <p className="text-xs text-white/50">Not Attempted</p>
                      <p className="mt-2 text-2xl font-semibold">{questionStats.notAttempted}</p>
                    </div>
                  </section>

                  <section className={cardClass}>
                    <p className="text-sm font-semibold">Note Down Your Learnings</p>
                    <p className="mt-1 text-xs text-white/50">
                      Add up to 3 things you learned in this test.
                    </p>
                    <div className="mt-4 space-y-2">
                      {learnings.map((value, index) => (
                        <div
                          key={`learning-${index}`}
                          className="flex items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#0f1422] px-4 py-3 text-xs text-white/60"
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-sm text-white/70">
                            {index + 1}
                          </span>
                          <input
                            value={value}
                            onChange={(event) => updateLearning(index, event.target.value)}
                            placeholder="Type your learning..."
                            className="w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/40"
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {activeSection === "performance" && questionStats && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Test Breakdown</p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm text-white/70">
                      <thead className="text-xs uppercase text-white/40">
                        <tr>
                          <th className="py-2">Subject</th>
                          <th>Total Score</th>
                          <th>Attempted Correct</th>
                          <th>Attempted Wrong</th>
                          <th>Not Attempted</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/80">
                        {Object.entries(questionStats.subjectStats).map(([subject, stats]) => (
                          <tr key={subject} className="border-t border-white/5">
                            <td className="py-3 font-semibold">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-[11px] font-semibold ${
                                    SUBJECT_META[subject as keyof typeof SUBJECT_META]?.badge ??
                                    "bg-white/10 text-white/70"
                                  }`}
                                >
                                  {SUBJECT_META[subject as keyof typeof SUBJECT_META]?.short ?? subject.charAt(0)}
                                </span>
                                {subject}
                              </div>
                            </td>
                            <td>{stats.score}</td>
                            <td>{stats.correct}</td>
                            <td>{stats.attempted - stats.correct}</td>
                            <td>{stats.total - stats.attempted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeSection === "time" && questionStats && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Time Breakdown</p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm text-white/70">
                      <thead className="text-xs uppercase text-white/40">
                        <tr>
                          <th className="py-2">Subject</th>
                          <th>Time Spent</th>
                          <th>Qs Attempted</th>
                          <th>Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="text-white/80">
                        {Object.entries(questionStats.subjectStats).map(([subject, stats]) => (
                          <tr key={subject} className="border-t border-white/5">
                            <td className="py-3 font-semibold">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`flex h-7 w-7 items-center justify-center rounded-xl text-[11px] font-semibold ${
                                    SUBJECT_META[subject as keyof typeof SUBJECT_META]?.badge ??
                                    "bg-white/10 text-white/70"
                                  }`}
                                >
                                  {SUBJECT_META[subject as keyof typeof SUBJECT_META]?.short ?? subject.charAt(0)}
                                </span>
                                {subject}
                              </div>
                            </td>
                            <td>{formatMinutes(stats.time)} min</td>
                            <td>{stats.attempted}</td>
                            <td>
                              {stats.attempted
                                ? Math.round((stats.correct / stats.attempted) * 100)
                                : 0}
                              %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <div className={softCardClass}>
                      <p className="text-xs text-white/60">Subject-wise</p>
                      <div className="mt-4 space-y-3">
                        {Object.entries(questionStats.subjectStats).map(([subject, stats]) => {
                          const maxTime = Math.max(
                            1,
                            ...Object.values(questionStats.subjectStats).map((entry) => entry.time)
                          );
                          const width = Math.round((stats.time / maxTime) * 100);
                          const barColor =
                            subject === "Physics"
                              ? "bg-emerald-500/70"
                              : subject === "Chemistry"
                              ? "bg-orange-500/70"
                              : "bg-sky-500/70";
                          return (
                            <div key={subject}>
                              <div className="flex items-center justify-between text-xs text-white/70">
                                <span>{subject}</span>
                                <span>{formatMinutes(stats.time)} min</span>
                              </div>
                              <div className="mt-2 h-2 rounded-full bg-white/10">
                                <div
                                  className={`h-2 rounded-full ${barColor}`}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={softCardClass}>
                      <p className="text-xs text-white/60">Quality of Time Spent</p>
                      {timeQuality ? (
                        <div className="mt-4 space-y-3 text-xs text-white/70">
                          <div className="flex items-center justify-between">
                            <span className="text-emerald-300">Time on Correct Qs</span>
                            <span>{formatMinutes(timeQuality.correctTime)} min</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-rose-300">Time on Incorrect Qs</span>
                            <span>{formatMinutes(timeQuality.wrongTime)} min</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Time on Unattempted Qs</span>
                            <span>{formatMinutes(timeQuality.unattemptedTime)} min</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-emerald-400/70"
                              style={{ width: `${timeQuality.correctPct}%` }}
                            />
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-rose-400/70"
                              style={{ width: `${timeQuality.wrongPct}%` }}
                            />
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-white/10">
                            <div
                              className="h-2 rounded-full bg-slate-400/70"
                              style={{ width: `${timeQuality.unattemptedPct}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 text-xs text-white/60">No time data yet.</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="text-xs text-white/60">Time Journey</p>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs text-white/70">
                        <thead className="text-[11px] uppercase text-white/40">
                          <tr>
                            <th className="py-2">Bucket</th>
                            <th>Correct</th>
                            <th>Incorrect</th>
                            <th>Overall</th>
                          </tr>
                        </thead>
                        <tbody className="text-white/80">
                          {timeJourney.map((row) => (
                            <tr key={row.label} className="border-t border-white/5">
                              <td className="py-2">{row.label}</td>
                              <td>{row.correct}</td>
                              <td>{row.wrong}</td>
                              <td>{row.overall}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "attempt" && attemptQuality && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Attempt Summary</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4 text-sm">
                      <p className="text-emerald-300">Perfect</p>
                      <p className="mt-2 text-2xl font-semibold">{attemptQuality.perfect}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4 text-sm">
                      <p className="text-rose-300">Wasted</p>
                      <p className="mt-2 text-2xl font-semibold">{attemptQuality.wasted}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4 text-sm">
                      <p className="text-amber-300">Overtime</p>
                      <p className="mt-2 text-2xl font-semibold">{attemptQuality.overtime}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#101624] p-4 text-sm">
                      <p className="text-indigo-200">Confused</p>
                      <p className="mt-2 text-2xl font-semibold">{attemptQuality.confused}</p>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "difficulty" && difficultyStats && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Difficulty Split (Correct)</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {Object.entries(difficultyStats).map(([level, count]) => (
                      <div key={level} className={softCardClass}>
                        <p className="text-xs text-white/60">{level}</p>
                        <p className="mt-2 text-3xl font-semibold">{count}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeSection === "movement" && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Subject Movement</p>
                  {subjectMovement.length === 0 ? (
                    <p className="mt-3 text-sm text-white/60">
                      No movement data captured yet for this attempt.
                    </p>
                  ) : (
                    <div className="mt-5 flex flex-wrap items-center gap-6">
                      {subjectMovement.map((item, index) => (
                        <div key={`${item.subject}-${index}`} className="flex items-center gap-4">
                          <div className="flex flex-col items-center gap-2">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-sm font-semibold ${
                                SUBJECT_META[item.subject as keyof typeof SUBJECT_META]?.badge ??
                                "bg-white/10 text-white/70"
                              }`}
                            >
                              {SUBJECT_META[item.subject as keyof typeof SUBJECT_META]?.short ??
                                item.subject.slice(0, 1)}
                            </div>
                            <div className="text-[11px] text-white/60">{item.subject}</div>
                            <div className="text-[11px] text-white/40">{item.attempted} Qs</div>
                            <div className="text-[11px] text-white/40">
                              {formatMinutes(item.time)} min
                            </div>
                          </div>
                          {index < subjectMovement.length - 1 && (
                            <div className="h-[2px] w-12 bg-white/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeSection === "journey" && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">Question Journey</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Correct
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      Wrong
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-slate-400" />
                      Not Attempted
                    </span>
                  </div>
                  <div className="mt-4 space-y-4">
                    {journeyBuckets.length === 0 ? (
                      <div className="text-sm text-white/60">No journey data captured yet.</div>
                    ) : (
                      journeyBuckets.map((bucket) => (
                        <div key={bucket.label}>
                          <p className="text-xs text-white/50">{bucket.label}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {bucket.items.length === 0 ? (
                              <span className="text-xs text-white/40">-</span>
                            ) : (
                              bucket.items.map((item) => (
                                <span
                                  key={`${bucket.label}-${item}`}
                                  className={`rounded-full border px-3 py-1 text-xs ${
                                    questionStatusMap[item] === "correct"
                                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                                      : questionStatusMap[item] === "wrong"
                                      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                                      : "border-white/10 bg-[#101624] text-white/60"
                                  }`}
                                >
                                  {item}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeSection === "qs" && questionStats && activeTest && selectedAttempt && (
                <section className={cardClass}>
                  <p className="text-sm font-semibold">All Question Analysis</p>
                  <div className="mt-4 space-y-6">
                    {Object.entries(questionsBySubject).map(([subject, items]) => (
                      <div key={subject}>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] uppercase ${
                              SUBJECT_META[subject as keyof typeof SUBJECT_META]?.badge ??
                              "bg-white/10 text-white/70"
                            }`}
                          >
                            {SUBJECT_META[subject as keyof typeof SUBJECT_META]?.short ??
                              subject.slice(0, 1)}
                          </span>
                          {subject}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {items.map((item) => {
                            const statusClass =
                              item.status === "correct"
                                ? "border-emerald-400/50 text-emerald-200"
                                : item.status === "wrong"
                                ? "border-rose-400/50 text-rose-200"
                                : "border-white/10 text-white/40";
                            return (
                              <span
                                key={item.id}
                                className={`h-8 w-8 rounded-lg border bg-[#0f1422] text-center text-xs leading-8 ${statusClass}`}
                              >
                                {item.number}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
