"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GlassRail from "@/components/GlassRail";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  correctOption: "A" | "B" | "C" | "D";
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

const formatMinutes = (seconds: number) => Math.round(seconds / 60);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatBucketLabel = (index: number, bucketMinutes: number) => {
  const start = index * bucketMinutes;
  const end = start + bucketMinutes;
  return `${start}-${end} min`;
};

export default function Analytics() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [retestWrongOnly, setRetestWrongOnly] = useState(true);
  const [retestTimeMin, setRetestTimeMin] = useState(2);
  const [retestToughIncorrect, setRetestToughIncorrect] = useState(false);
  const [retestLastTests, setRetestLastTests] = useState(3);
  const [isBuildingRetest, setIsBuildingRetest] = useState(false);
  const [retestError, setRetestError] = useState("");

  useEffect(() => {
    const load = async () => {
      const testsResponse = await fetch("/api/tests");
      const testsData = await testsResponse.json();
      setTests(testsData);

      const attemptsResponse = await fetch("/api/attempts");
      const attemptsData = await attemptsResponse.json();
      setAttempts(attemptsData);
    };
    load();
  }, []);

  const testMap = useMemo(() => {
    return tests.reduce((acc, test) => {
      acc[test.id] = test;
      return acc;
    }, {} as Record<string, Test>);
  }, [tests]);

  const latestTest = useMemo(() => tests[0] ?? null, [tests]);

  const overall = useMemo(() => {
    let correct = 0;
    let attempted = 0;
    let totalScore = 0;
    let totalTime = 0;
    const subjectSummary = {
      Physics: { correct: 0, total: 0 },
      Chemistry: { correct: 0, total: 0 },
      Maths: { correct: 0, total: 0 },
    };

    const scoreTrend = attempts
      .map((attempt) => {
        const test = testMap[attempt.testId];
        if (!test) return null;
        let score = 0;
        test.crops.forEach((crop) => {
          const selected = attempt.answers[crop.id];
          if (!selected) return;
          score += selected === crop.correctOption ? test.markingCorrect ?? 4 : test.markingIncorrect ?? -1;
        });
        const time = Object.values(attempt.timeSpent).reduce((a, b) => a + b, 0);
        return { score, time, createdAt: attempt.createdAt };
      })
      .filter(Boolean) as Array<{ score: number; time: number; createdAt: string }>;

    attempts.forEach((attempt) => {
      const test = testMap[attempt.testId];
      if (!test) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        attempted += 1;
        if (selected === crop.correctOption) {
          correct += 1;
          totalScore += test.markingCorrect ?? 4;
        } else {
          totalScore += test.markingIncorrect ?? -1;
        }
        subjectSummary[crop.subject].total += 1;
        if (selected === crop.correctOption) {
          subjectSummary[crop.subject].correct += 1;
        }
      });
      totalTime += Object.values(attempt.timeSpent).reduce((a, b) => a + b, 0);
    });

    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
    const percentile = clamp(5 + accuracy * 0.95, 1, 99.9);
    const avgTime = attempted ? totalTime / attempted : 0;

    return {
      correct,
      attempted,
      totalScore,
      accuracy,
      percentile,
      totalTime,
      avgTime,
      subjectSummary,
      scoreTrend,
    };
  }, [attempts, testMap]);

  const strategyConsistency = useMemo(() => {
    if (attempts.length === 0) {
      return { label: "Low", ratio: 0 };
    }
    const orders = attempts
      .map((attempt) => {
        if (attempt.events?.sectionOrder && attempt.events.sectionOrder.length > 0) {
          return attempt.events.sectionOrder.join("-");
        }
        if (!attempt.events?.firstAnsweredAt) return null;
        const buckets: Record<string, number> = {};
        Object.entries(attempt.events.firstAnsweredAt).forEach(([id, time]) => {
          const test = testMap[attempt.testId];
          const crop = test?.crops.find((item) => item.id === id);
          if (!crop) return;
          if (buckets[crop.subject] === undefined) {
            buckets[crop.subject] = time;
          } else {
            buckets[crop.subject] = Math.min(buckets[crop.subject], time);
          }
        });
        const order = Object.entries(buckets)
          .sort((a, b) => a[1] - b[1])
          .map((entry) => entry[0]);
        return order.length ? order.join("-") : null;
      })
      .filter(Boolean) as string[];
    if (orders.length === 0) {
      return { label: "Low", ratio: 0 };
    }
    const counts = orders.reduce((acc, order) => {
      acc[order] = (acc[order] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const top = Object.values(counts).sort((a, b) => b - a)[0] ?? 0;
    const ratio = top / orders.length;
    const label = ratio >= 0.7 ? "High" : ratio >= 0.4 ? "Medium" : "Low";
    return { label, ratio };
  }, [attempts, testMap]);

  const attemptInsights = useMemo(() => {
    if (attempts.length === 0) return null;
    const allQuestions = attempts.flatMap((attempt) => {
      const test = testMap[attempt.testId];
      if (!test) return [];
      return test.crops.map((crop) => {
        const selected = attempt.answers[crop.id];
        const attempted = Boolean(selected);
        const time = attempt.timeSpent[crop.id] ?? 0;
        const changes = attempt.events?.answerChanges?.[crop.id] ?? (attempted ? 1 : 0);
        const rapid = attempt.events?.rapidChanges?.[crop.id] ?? 0;
        const firstAt = attempt.events?.firstAnsweredAt?.[crop.id];
        return {
          id: crop.id,
          subject: crop.subject,
          difficulty: crop.difficulty,
          correctOption: crop.correctOption,
          selected,
          attempted,
          correct: attempted && selected === crop.correctOption,
          time,
          changes,
          rapid,
          firstAt,
        };
      });
    });

    const attemptedCount = allQuestions.filter((q) => q.attempted).length;
    const correctCount = allQuestions.filter((q) => q.correct).length;
    const totalTime = allQuestions.reduce((acc, q) => acc + q.time, 0);
    const avgTime = attemptedCount ? totalTime / attemptedCount : 0;

    const subjectStats = allQuestions.reduce((acc, q) => {
      if (!acc[q.subject]) {
        acc[q.subject] = { time: 0, attempted: 0, correct: 0 };
      }
      if (q.attempted) {
        acc[q.subject].attempted += 1;
        acc[q.subject].time += q.time;
        if (q.correct) acc[q.subject].correct += 1;
      }
      return acc;
    }, {} as Record<string, { time: number; attempted: number; correct: number }>);

    const orders = attempts
      .map((attempt) => attempt.events?.sectionOrder?.join("-"))
      .filter(Boolean) as string[];
    const orderCounts = orders.reduce((acc, order) => {
      acc[order] = (acc[order] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topOrder = Object.entries(orderCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const sectionOrder = topOrder ? topOrder.split("-") : [];

    const totalChanges = allQuestions.reduce((acc, q) => acc + q.changes, 0);
    const rapidChangesTotal = allQuestions.reduce((acc, q) => acc + q.rapid, 0);
    const dvi = attemptedCount ? totalChanges / attemptedCount : 0;
    const timeJumpCount = allQuestions.filter((q) => q.attempted && q.time > avgTime * 2.5).length;
    const avgTabSwitches =
      attempts.reduce((acc, a) => acc + (a.events?.tabSwitches ?? 0), 0) /
      Math.max(1, attempts.length);
    const avgIdleGaps =
      attempts.reduce((acc, a) => acc + (a.events?.idleGaps ?? 0), 0) /
      Math.max(1, attempts.length);
    const avgIdleSeconds =
      attempts.reduce((acc, a) => acc + (a.events?.idleSeconds ?? 0), 0) /
      Math.max(1, attempts.length);
    const integrityScore = clamp(
      Math.round(100 - avgTabSwitches * 4 - avgIdleGaps * 5 - Math.floor(avgIdleSeconds / 60) * 2 - rapidChangesTotal * 0.5 - timeJumpCount),
      0,
      100
    );
    const integrityLabel =
      integrityScore >= 90 ? "Clean Attempt" : integrityScore >= 75 ? "Minor Noise" : "Noisy Attempt";

    const firstTouchAttempted = allQuestions.filter((q) => q.attempted && q.changes <= 1).length;
    const firstTouchCorrect = allQuestions.filter((q) => q.correct && q.changes <= 1).length;
    const revisitAttempted = allQuestions.filter((q) => q.attempted && q.changes > 1).length;
    const revisitCorrect = allQuestions.filter((q) => q.correct && q.changes > 1).length;

    const durationMinutes = Math.max(
      180,
      ...attempts.map((attempt) => testMap[attempt.testId]?.durationMinutes ?? 180)
    );
    const durationSeconds = durationMinutes * 60;
    const bucketMinutes = 60;
    const buckets = Math.max(1, Math.ceil(durationMinutes / bucketMinutes));
    const fatigue = Array.from({ length: buckets }, (_, index) => {
      const start = index * bucketMinutes * 60;
      const end = (index + 1) * bucketMinutes * 60;
      const attemptedBucket = allQuestions.filter(
        (q) => q.attempted && q.firstAt !== undefined && q.firstAt >= start && q.firstAt < end
      );
      const correctBucket = attemptedBucket.filter((q) => q.correct).length;
      return {
        label: formatBucketLabel(index, bucketMinutes),
        attempted: attemptedBucket.length,
        accuracy: attemptedBucket.length
          ? Math.round((correctBucket / attemptedBucket.length) * 100)
          : 0,
      };
    });

    const timeRisk = allQuestions.reduce(
      (acc, q) => {
        if (!q.attempted) return acc;
        const subjectAvg =
          subjectStats[q.subject]?.attempted
            ? subjectStats[q.subject].time / subjectStats[q.subject].attempted
            : avgTime;
        const base =
          q.difficulty === "Tough" ? subjectAvg * 1.2 : q.difficulty === "Easy" ? subjectAvg * 0.85 : subjectAvg;
        if (q.time <= base * 1.15) {
          acc.green += 1;
        } else if (q.time <= base * 1.6) {
          acc.amber += 1;
        } else {
          acc.red += 1;
        }
        return acc;
      },
      { green: 0, amber: 0, red: 0 }
    );

    const mistakeTaxonomy = allQuestions.reduce(
      (acc, q) => {
        if (!q.attempted || q.correct) return acc;
        const subjectAvg =
          subjectStats[q.subject]?.attempted
            ? subjectStats[q.subject].time / subjectStats[q.subject].attempted
            : avgTime;
        const base =
          q.difficulty === "Tough" ? subjectAvg * 1.2 : q.difficulty === "Easy" ? subjectAvg * 0.85 : subjectAvg;
        const lateStage = q.firstAt !== undefined && q.firstAt > durationSeconds * 0.7;
        if (lateStage) {
          acc.timePressure += 1;
        } else if (q.time <= base * 0.6) {
          acc.silly += 1;
        } else {
          acc.conceptual += 1;
        }
        return acc;
      },
      { conceptual: 0, silly: 0, timePressure: 0 }
    );

    const completionRate = allQuestions.length ? attemptedCount / allQuestions.length : 0;
    const timeEfficiency = avgTime && allQuestions.length
      ? clamp((durationSeconds / allQuestions.length) / avgTime, 0, 1)
      : 0;
    const consistencyScore =
      strategyConsistency.label === "High" ? 0.9 : strategyConsistency.label === "Medium" ? 0.7 : 0.5;
    const readiness = Math.round(
      ((overall.accuracy / 100) * 0.4 +
        completionRate * 0.2 +
        timeEfficiency * 0.2 +
        consistencyScore * 0.2) *
        100
    );

    const attemptScores = attempts.map((attempt) => {
      const test = testMap[attempt.testId];
      if (!test) return 0;
      let score = 0;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        score += selected === crop.correctOption ? test.markingCorrect ?? 4 : test.markingIncorrect ?? -1;
      });
      return score;
    });
    const avgScore =
      attemptScores.length ? attemptScores.reduce((a, b) => a + b, 0) / attemptScores.length : 0;
    const safeLow = Math.round(avgScore * 0.85);
    const safeHigh = Math.round(avgScore * 1.05);

    return {
      integrityScore,
      integrityLabel,
      sectionOrder,
      subjectStats,
      dvi,
      firstTouchAttempted,
      firstTouchCorrect,
      revisitAttempted,
      revisitCorrect,
      fatigue,
      timeRisk,
      mistakeTaxonomy,
      attemptedCount,
      correctCount,
      completionRate,
      readiness,
      safeLow,
      safeHigh,
    };
  }, [attempts, overall.accuracy, strategyConsistency.label, testMap]);

  const retestPreview = useMemo(() => {
    const pool = [...attempts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const limited = retestLastTests > 0 ? pool.slice(0, retestLastTests) : pool;
    const subjectCounts: Record<string, number> = { Physics: 0, Chemistry: 0, Maths: 0 };
    const unique = new Set<string>();

    limited.forEach((attempt) => {
      const test = testMap[attempt.testId];
      if (!test) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        const attempted = Boolean(selected);
        const isWrong = attempted && selected !== crop.correctOption;
        const time = attempt.timeSpent[crop.id] ?? 0;

        if (retestWrongOnly && !isWrong) return;
        if (retestToughIncorrect && !(isWrong && crop.difficulty === "Tough")) return;
        if (retestTimeMin > 0 && time < retestTimeMin * 60) return;

        if (!unique.has(crop.id)) {
          unique.add(crop.id);
          subjectCounts[crop.subject] = (subjectCounts[crop.subject] || 0) + 1;
        }
      });
    });

    return {
      count: unique.size,
      subjectCounts,
    };
  }, [attempts, retestLastTests, retestToughIncorrect, retestTimeMin, retestWrongOnly, testMap]);

  const buildRetest = async () => {
    if (retestPreview.count === 0 || isBuildingRetest) return;
    setIsBuildingRetest(true);
    setRetestError("");
    try {
      const pool = [...attempts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const limited = retestLastTests > 0 ? pool.slice(0, retestLastTests) : pool;
      const unique = new Map<string, Crop>();

      limited.forEach((attempt) => {
        const test = testMap[attempt.testId];
        if (!test) return;
        test.crops.forEach((crop) => {
          const selected = attempt.answers[crop.id];
          const attempted = Boolean(selected);
          const isWrong = attempted && selected !== crop.correctOption;
          const time = attempt.timeSpent[crop.id] ?? 0;

          if (retestWrongOnly && !isWrong) return;
          if (retestToughIncorrect && !(isWrong && crop.difficulty === "Tough")) return;
          if (retestTimeMin > 0 && time < retestTimeMin * 60) return;

          if (!unique.has(crop.id)) {
            unique.set(crop.id, crop);
          }
        });
      });

      const crops = Array.from(unique.values());
      const base = latestTest ?? tests[0];
      const payload = {
        title: `Smart Retest - ${new Date().toLocaleDateString()}`,
        visibility: "Public" as const,
        durationMinutes: base?.durationMinutes ?? 180,
        markingCorrect: base?.markingCorrect ?? 4,
        markingIncorrect: base?.markingIncorrect ?? -1,
        crops,
      };

      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to build retest.");
      }
      const saved = await response.json();
      router.push(`/test-created?testId=${saved.id}`);
    } catch (error) {
      setRetestError(error instanceof Error ? error.message : "Failed to build retest.");
    } finally {
      setIsBuildingRetest(false);
    }
  };

  const scoreSparkline = useMemo(() => {
    if (overall.scoreTrend.length === 0) return "";
    const values = overall.scoreTrend.map((entry) => entry.score);
    const width = 140;
    const height = 40;
    const maxValue = Math.max(1, ...values);
    return `M${values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        return `${x},${y}`;
      })
      .join(" L")}`;
  }, [overall.scoreTrend]);

  const timeSparkline = useMemo(() => {
    if (overall.scoreTrend.length === 0) return "";
    const values = overall.scoreTrend.map((entry) => entry.time);
    const width = 140;
    const height = 40;
    const maxValue = Math.max(1, ...values);
    return `M${values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width;
        const y = height - (value / maxValue) * height;
        return `${x},${y}`;
      })
      .join(" L")}`;
  }, [overall.scoreTrend]);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <GlassRail />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-24 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Performance Overview</p>
            <h1 className="mt-2 text-3xl font-semibold">Analytics</h1>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
            Overall Analytics
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-indigo-600/60 via-indigo-700/40 to-[#120f2c] p-6">
            <p className="text-xs uppercase text-white/60">Overall Accuracy</p>
            <p className="display-font mt-6 text-5xl font-semibold text-white">{overall.accuracy}%</p>
            <p className="mt-2 text-xs text-white/70">
              {overall.attempted} total attempted questions
            </p>
            <svg viewBox="0 0 140 40" className="mt-4 h-8 w-32">
              <path d={scoreSparkline} fill="none" stroke="#38bdf8" strokeWidth="2" />
            </svg>
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Overall Percentile</p>
            <p className="mt-6 text-3xl font-semibold">{overall.percentile.toFixed(1)}</p>
            <p className="mt-2 text-xs text-white/60">Based on overall accuracy</p>
            <svg viewBox="0 0 140 40" className="mt-4 h-8 w-32">
              <path d={scoreSparkline} fill="none" stroke="#22c55e" strokeWidth="2" />
            </svg>
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Time Efficiency</p>
            <p className="mt-6 text-3xl font-semibold">{formatMinutes(overall.avgTime)}m</p>
            <p className="mt-2 text-xs text-white/60">Avg time per question</p>
            <svg viewBox="0 0 140 40" className="mt-4 h-8 w-32">
              <path d={timeSparkline} fill="none" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Subject-wise Performance</p>
            <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
              {Object.entries(overall.subjectSummary).map(([subject, values]) => (
                <div key={subject} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/60">{subject}</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {values.total ? Math.round((values.correct / values.total) * 100) : 0}%
                  </div>
                  <div className="text-xs text-white/40">
                    {values.correct}/{values.total} correct
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Time Trend</p>
            <div className="mt-4 h-32 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              Avg time per attempt trend
              <svg viewBox="0 0 140 40" className="mt-4 h-8 w-32">
                <path d={timeSparkline} fill="none" stroke="#e879f9" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-white/60">Attempt Integrity Score</p>
                <p className="text-sm text-white/70">Rule-based, no AI.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
                Overall
              </span>
            </div>
            {attemptInsights ? (
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="text-4xl font-semibold">
                  {attemptInsights.integrityScore} / 100
                </div>
                <div className="text-sm text-white/70">{attemptInsights.integrityLabel}</div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Decision Volatility Index</p>
            {attemptInsights ? (
              <div className="mt-5 text-3xl font-semibold">{attemptInsights.dvi.toFixed(2)}</div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
            <p className="mt-2 text-xs text-white/50">Total option changes / attempted questions</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">First-Touch Accuracy</p>
            {attemptInsights ? (
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>First-touch</span>
                  <span className="font-semibold">
                    {attemptInsights.firstTouchAttempted
                      ? Math.round(
                          (attemptInsights.firstTouchCorrect / attemptInsights.firstTouchAttempted) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between text-white/70">
                  <span>Revisit accuracy</span>
                  <span>
                    {attemptInsights.revisitAttempted
                      ? Math.round(
                          (attemptInsights.revisitCorrect / attemptInsights.revisitAttempted) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Section Strategy Breakdown</p>
            {attemptInsights ? (
              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(attemptInsights.subjectStats).map(([subject, stats]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span>{subject}</span>
                    <span className="text-white/70">
                      {formatMinutes(stats.time)} min ·{" "}
                      {stats.attempted
                        ? Math.round((stats.correct / stats.attempted) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
                <div className="text-[11px] text-white/50">
                  Order: {attemptInsights.sectionOrder.join(" -> ") || "-"}
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Question Fatigue Curve</p>
            {attemptInsights ? (
              <div className="mt-4 space-y-2 text-sm">
                {attemptInsights.fatigue.map((bucket) => (
                  <div key={bucket.label} className="flex items-center justify-between">
                    <span>{bucket.label}</span>
                    <span className="text-white/70">{bucket.accuracy}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Time Risk Indicator</p>
            {attemptInsights ? (
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300">Optimal</span>
                  <span>{attemptInsights.timeRisk.green}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-300">Slightly High</span>
                  <span>{attemptInsights.timeRisk.amber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-300">Time Sink</span>
                  <span>{attemptInsights.timeRisk.red}</span>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Mistake Taxonomy</p>
            {attemptInsights ? (
              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Conceptual</span>
                  <span>{attemptInsights.mistakeTaxonomy.conceptual}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Silly</span>
                  <span>{attemptInsights.mistakeTaxonomy.silly}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time-pressure</span>
                  <span>{attemptInsights.mistakeTaxonomy.timePressure}</span>
                </div>
              </div>
            ) : (
              <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
            )}
          </div>
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Strategy Consistency</p>
            <div className="mt-5 text-3xl font-semibold">{strategyConsistency.label}</div>
            <p className="mt-2 text-xs text-white/60">
              {Math.round(strategyConsistency.ratio * 100)}% of attempts follow the same section order.
            </p>
          </div>
        </section>

        <section className="glass-card p-6">
          <p className="text-xs uppercase text-white/60">Exam Readiness Meter</p>
          {attemptInsights ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold">{attemptInsights.readiness}%</div>
                <p className="mt-1 text-xs text-white/60">Rule-based readiness score</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Projected Safe Range: {attemptInsights.safeLow}-{attemptInsights.safeHigh} marks
              </div>
            </div>
          ) : (
            <div className="mt-5 text-sm text-white/60">No attempt data yet.</div>
          )}
        </section>

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-white/60">Smart Retest Builder</p>
              <p className="text-sm text-white/70">Rules only. Reuse existing questions.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/70">
              Preview: {retestPreview.count} questions
            </span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span>Wrong questions only</span>
              <input
                type="checkbox"
                checked={retestWrongOnly}
                onChange={(event) => setRetestWrongOnly(event.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span>Tough + incorrect only</span>
              <input
                type="checkbox"
                checked={retestToughIncorrect}
                onChange={(event) => setRetestToughIncorrect(event.target.checked)}
              />
            </label>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Questions &gt; minutes</span>
                <input
                  type="number"
                  min={0}
                  value={retestTimeMin}
                  onChange={(event) => setRetestTimeMin(Number(event.target.value))}
                  className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                />
              </div>
              <p className="mt-2 text-[11px] text-white/50">0 disables this filter.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Last N tests</span>
                <select
                  value={retestLastTests}
                  onChange={(event) => setRetestLastTests(Number(event.target.value))}
                  className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={0}>All</option>
                </select>
              </div>
              <p className="mt-2 text-[11px] text-white/50">Counts attempts in filter scope.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            <div className="flex items-center gap-3">
              <span>Physics: {retestPreview.subjectCounts.Physics}</span>
              <span className="text-white/30">•</span>
              <span>Chemistry: {retestPreview.subjectCounts.Chemistry}</span>
              <span className="text-white/30">•</span>
              <span>Maths: {retestPreview.subjectCounts.Maths}</span>
            </div>
            <button
              className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={retestPreview.count === 0 || isBuildingRetest}
              onClick={buildRetest}
            >
              {isBuildingRetest ? "Building..." : "Build Retest"}
            </button>
          </div>
          {retestError && (
            <div className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
              {retestError}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
