"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GlassRail from "@/components/GlassRail";
import { safeJson } from "@/lib/safe-json";

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
  crops?: Crop[];
  createdAt?: string;
};

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  answers: Record<string, "A" | "B" | "C" | "D" | "">;
  timeSpent: Record<string, number>;
};

type LeaderRow = {
  userId: string;
  name: string;
  image?: string | null;
  performanceCredits: number;
};

type LeaderboardResponse = {
  rows: LeaderRow[];
  totalUsers: number;
};

const subjectStyles = {
  Physics: { chip: "bg-[#1d4ed8]/40 text-[#93c5fd]", label: "Physics" },
  Chemistry: { chip: "bg-[#16a34a]/40 text-[#86efac]", label: "Chemistry" },
  Maths: { chip: "bg-[#7e22ce]/40 text-[#e9d5ff]", label: "Mathematics" },
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return `${value}`;
};

export default function Dashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [profileStats, setProfileStats] = useState<{
    performanceCredits: number;
    streakDays: number;
    userId?: string;
  } | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>({ rows: [], totalUsers: 0 });
  const [showShatter, setShowShatter] = useState(false);
  const [showLeague, setShowLeague] = useState(false);
  const [leagueTab, setLeagueTab] = useState<"today" | "week">("today");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/get-session");
      const data = await safeJson<{ user?: unknown } | null>(response, null);
      if (!data?.user) {
        router.push("/login");
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      const [testResponse, attemptsResponse, profileResponse, leaderboardResponse] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/attempts"),
        fetch("/api/profile"),
        fetch("/api/leaderboard?scope=global"),
      ]);

      const [testData, attemptsData, profileData, leaderboardData] = await Promise.all([
        safeJson<Test[]>(testResponse, []),
        safeJson<Attempt[]>(attemptsResponse, []),
        safeJson<any>(profileResponse, null),
        safeJson<LeaderboardResponse | null>(leaderboardResponse, null),
      ]);

      setTests(Array.isArray(testData) ? testData : []);
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      setProfileStats({
        performanceCredits: profileData?.stats?.performanceCredits ?? 0,
        streakDays: profileData?.stats?.streakDays ?? 0,
        userId: profileData?.user?.id,
      });
      setProfileName(profileData?.user?.name ?? "");
      setLeaderboard({
        rows: Array.isArray(leaderboardData?.rows) ? leaderboardData.rows : [],
        totalUsers: typeof leaderboardData?.totalUsers === "number" ? leaderboardData.totalUsers : 0,
      });
    };
    load();
  }, []);

  const testsById = useMemo(() => {
    return tests.reduce((acc, test) => {
      acc[test.id] = test;
      return acc;
    }, {} as Record<string, Test>);
  }, [tests]);

  const computeScore = (attempt: Attempt) => {
    const test = testsById[attempt.testId];
    if (!test) {
      return 0;
    }
    let score = 0;
    test.crops?.forEach((crop) => {
      const selected = attempt.answers[crop.id];
      if (!selected) return;
      score += selected === crop.correctOption ? (test.markingCorrect ?? 4) : (test.markingIncorrect ?? -1);
    });
    return score;
  };

  const attemptsByTest = useMemo(() => {
    return attempts.reduce((acc, attempt) => {
      acc[attempt.testId] = acc[attempt.testId] || [];
      acc[attempt.testId].push(attempt);
      return acc;
    }, {} as Record<string, Attempt[]>);
  }, [attempts]);

  const sortedAttempts = useMemo(() => {
    return [...attempts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [attempts]);

  const recallStats = useMemo(() => {
    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const cropStats = new Map<
      string,
      {
        subject: Crop["subject"];
        testId: string;
        lastAttemptAt?: number;
        lastCorrectAt?: number;
        incorrectCount: number;
      }
    >();

    attempts.forEach((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops) return;
      const attemptTime = new Date(attempt.createdAt).getTime();
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        const stat = cropStats.get(crop.id) ?? {
          subject: crop.subject,
          testId: test.id,
          incorrectCount: 0,
        };
        stat.lastAttemptAt = Math.max(stat.lastAttemptAt ?? 0, attemptTime);
        if (selected === crop.correctOption) {
          stat.lastCorrectAt = Math.max(stat.lastCorrectAt ?? 0, attemptTime);
        } else {
          stat.incorrectCount += 1;
        }
        cropStats.set(crop.id, stat);
      });
    });

    const dueCrops = Array.from(cropStats.values()).filter((stat) => {
      if (stat.lastCorrectAt) {
        return now - stat.lastCorrectAt >= threeDaysMs;
      }
      if (stat.lastAttemptAt && stat.incorrectCount > 0) {
        return now - stat.lastAttemptAt >= threeDaysMs;
      }
      return false;
    });

    const topicSet = new Set(dueCrops.map((stat) => stat.subject));
    return {
      dueCount: dueCrops.length,
      topicCount: topicSet.size,
      hasDecay: dueCrops.length > 0,
    };
  }, [attempts, testsById]);

  const latestAttempt = sortedAttempts[0];
  const latestTest = latestAttempt ? testsById[latestAttempt.testId] : tests[0];

  const tierTargets = useMemo(() => {
    const rows = leaderboard.rows;
    const total = leaderboard.totalUsers || rows.length;
    if (rows.length === 0 || total === 0) {
      return { quantum: 0, elite: 0, core: 0, total };
    }
    const quantumIndex = Math.max(0, Math.ceil(total * 0.001) - 1);
    const eliteIndex = Math.max(0, Math.ceil(total * 0.01) - 1);
    const coreIndex = Math.max(0, Math.ceil(total * 0.1) - 1);
    return {
      quantum: rows[quantumIndex]?.performanceCredits ?? 0,
      elite: rows[eliteIndex]?.performanceCredits ?? 0,
      core: rows[coreIndex]?.performanceCredits ?? 0,
      total,
    };
  }, [leaderboard]);

  const nextTierTarget = useMemo(() => {
    const pc = profileStats?.performanceCredits ?? 0;
    if (pc >= tierTargets.quantum && tierTargets.quantum > 0) return tierTargets.quantum;
    if (pc >= tierTargets.elite && tierTargets.elite > 0) return tierTargets.quantum;
    if (pc >= tierTargets.core && tierTargets.core > 0) return tierTargets.elite;
    return tierTargets.core;
  }, [profileStats, tierTargets]);

  const flowProgress = useMemo(() => {
    if (!nextTierTarget || nextTierTarget <= 0) return 0;
    const pc = profileStats?.performanceCredits ?? 0;
    return Math.min(100, Math.round((pc / nextTierTarget) * 100));
  }, [profileStats, nextTierTarget]);

  const leagueName = "ENGINEERING LEAGUE";
  const leagueRows = useMemo(() => {
    const rows = leaderboard.rows;
    if (rows.length === 0) return [];
    const top = rows.slice(0, 5);
    const userId = profileStats?.userId;
    if (!userId) return top;
    if (top.some((row) => row.userId === userId)) return top;
    const youRow = rows.find((row) => row.userId === userId);
    return youRow ? [...top, youRow] : top;
  }, [leaderboard, profileStats]);

  const rankForUser = useMemo(() => {
    const map = new Map<string, number>();
    leaderboard.rows.forEach((row, index) => map.set(row.userId, index + 1));
    return map;
  }, [leaderboard]);

  const lastFlowRef = useRef(0);
  useEffect(() => {
    if (flowProgress >= 100 && lastFlowRef.current < 100) {
      setShowShatter(true);
      const timer = setTimeout(() => setShowShatter(false), 1200);
      return () => clearTimeout(timer);
    }
    lastFlowRef.current = flowProgress;
  }, [flowProgress]);

  const heatmapWeeks = useMemo(() => {
    const counts = new Map<string, number>();
    attempts.forEach((attempt) => {
      const date = new Date(attempt.createdAt);
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const totalWeeks = 12;
    const totalDays = totalWeeks * 7;
    const start = new Date(end);
    start.setDate(end.getDate() - (totalDays - 1) - end.getDay());
    const weeks: Array<Array<{ date: Date; count: number }>> = [];
    for (let i = 0; i < totalDays; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const key = current.toISOString().slice(0, 10);
      const count = counts.get(key) ?? 0;
      const weekIndex = Math.floor(i / 7);
      if (!weeks[weekIndex]) weeks[weekIndex] = [];
      weeks[weekIndex].push({ date: current, count });
    }
    return weeks;
  }, [attempts]);

  const heatmapMax = useMemo(() => {
    let max = 0;
    heatmapWeeks.forEach((week) => {
      week.forEach((day) => {
        if (day.count > max) max = day.count;
      });
    });
    return Math.max(1, max);
  }, [heatmapWeeks]);

  const monthLabels = useMemo(() => {
    return heatmapWeeks.map((week) => {
      const firstOfMonth = week.find((day) => day.date.getDate() === 1);
      return firstOfMonth
        ? firstOfMonth.date.toLocaleDateString("en-US", { month: "short" })
        : "";
    });
  }, [heatmapWeeks]);

  const analytics = useMemo(() => {
    if (!latestTest || !latestAttempt) {
      return null;
    }
    let score = 0;
    let correct = 0;
    let attempted = 0;
    latestTest.crops?.forEach((crop) => {
      const selected = latestAttempt.answers[crop.id];
      if (!selected) return;
      attempted += 1;
      if (selected === crop.correctOption) {
        score += latestTest.markingCorrect ?? 4;
        correct += 1;
      } else {
        score += latestTest.markingIncorrect ?? -1;
      }
    });
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
    const percentile = Math.min(99.9, Math.max(1, 5 + accuracy * 0.95));
    return { score, accuracy, percentile };
  }, [latestTest, latestAttempt]);

  const overallStats = useMemo(() => {
    if (attempts.length === 0) {
      return {
        bestScore: 0,
        avgAccuracy: 0,
        attemptsCount: 0,
        lastAttemptAgoDays: null as number | null,
        activeDays30: 0,
        longestStreak: 0,
      };
    }
    const scores = sortedAttempts.map((attempt) => computeScore(attempt));
    const accuracies = sortedAttempts.map((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops) return 0;
      let correct = 0;
      let attempted = 0;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        attempted += 1;
        if (selected === crop.correctOption) correct += 1;
      });
      return attempted ? (correct / attempted) * 100 : 0;
    });
    const bestScore = scores.length ? Math.max(...scores) : 0;
    const avgAccuracy = accuracies.length
      ? Math.round(accuracies.reduce((acc, val) => acc + val, 0) / accuracies.length)
      : 0;
    const attemptsCount = attempts.length;

    const lastAttempt = sortedAttempts[0];
    const lastAttemptAgoDays = lastAttempt
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(lastAttempt.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        )
      : null;

    const dayKeys = new Set<string>();
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(now.getDate() - 29);
    attempts.forEach((attempt) => {
      const day = new Date(attempt.createdAt);
      if (day >= start30) {
        dayKeys.add(day.toISOString().slice(0, 10));
      }
    });
    const activeDays30 = dayKeys.size;

    const sortedDays = Array.from(dayKeys).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let prev: Date | null = null;
    sortedDays.forEach((key) => {
      const day = new Date(key);
      if (!prev) {
        currentStreak = 1;
      } else {
        const diff = Math.floor((day.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      prev = day;
    });

    return {
      bestScore,
      avgAccuracy,
      attemptsCount,
      lastAttemptAgoDays,
      activeDays30,
      longestStreak,
    };
  }, [attempts, sortedAttempts, testsById]);

  const negativeMarksLost = useMemo(() => {
    let lost = 0;
    attempts.forEach((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        if (selected !== crop.correctOption) {
          const penalty = Math.abs(test.markingIncorrect ?? -1);
          lost += penalty;
        }
      });
    });
    return Math.round(lost);
  }, [attempts, testsById]);

  const avgTimePerQuestion = useMemo(() => {
    let totalSeconds = 0;
    let totalQuestions = 0;
    attempts.forEach((attempt) => {
      const times = Object.values(attempt.timeSpent || {});
      if (!times.length) return;
      totalSeconds += times.reduce((acc, val) => acc + val, 0);
      totalQuestions += times.length;
    });
    if (!totalQuestions) return null;
    const avgSec = Math.round(totalSeconds / totalQuestions);
    const minutes = Math.floor(avgSec / 60);
    const seconds = avgSec % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }, [attempts]);

  const subjectStrength = useMemo(() => {
    const subjectStats = new Map<Crop["subject"], { correct: number; attempted: number }>();
    attempts.forEach((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        const stat = subjectStats.get(crop.subject) ?? { correct: 0, attempted: 0 };
        stat.attempted += 1;
        if (selected === crop.correctOption) stat.correct += 1;
        subjectStats.set(crop.subject, stat);
      });
    });
    const entries = Array.from(subjectStats.entries()).map(([subject, stat]) => ({
      subject,
      accuracy: stat.attempted ? stat.correct / stat.attempted : 0,
    }));
    if (!entries.length) return { strongest: null, weakest: null };
    entries.sort((a, b) => b.accuracy - a.accuracy);
    return {
      strongest: entries[0].subject,
      weakest: entries[entries.length - 1].subject,
    };
  }, [attempts, testsById]);

  const subjectAttemptCounts = useMemo(() => {
    const counts = new Map<Crop["subject"], number>();
    attempts.forEach((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        counts.set(crop.subject, (counts.get(crop.subject) ?? 0) + 1);
      });
    });
    return counts;
  }, [attempts, testsById]);

  const donutSegments = useMemo(() => {
    const items: Array<{ label: string; value: number; color: string }> = [
      { label: "Physics", value: subjectAttemptCounts.get("Physics") ?? 0, color: "#38bdf8" },
      { label: "Chemistry", value: subjectAttemptCounts.get("Chemistry") ?? 0, color: "#22c55e" },
      { label: "Maths", value: subjectAttemptCounts.get("Maths") ?? 0, color: "#f59e0b" },
    ];
    const total = items.reduce((acc, item) => acc + item.value, 0) || 1;
    return { items, total };
  }, [subjectAttemptCounts]);

  const activityBars = useMemo(() => {
    const days = 14;
    const now = new Date();
    const counts = Array.from({ length: days }, () => 0);
    attempts.forEach((attempt) => {
      const date = new Date(attempt.createdAt);
      const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) {
        counts[days - diff - 1] += 1;
      }
    });
    return counts;
  }, [attempts]);

  const trendState = useMemo(() => {
    const recent = sortedAttempts.slice(0, 7);
    if (recent.length < 2) {
      return "stable";
    }
    const scores = recent.map((attempt) => computeScore(attempt));
    const delta = scores[0] - scores[scores.length - 1];
    if (delta > 8) return "up";
    if (delta < -8) return "down";
    return "stable";
  }, [sortedAttempts, testsById]);

  const auraColor = trendState === "up" ? "rgba(34,197,94,0.6)" : trendState === "down" ? "rgba(248,113,113,0.55)" : "rgba(245,158,11,0.6)";

  const momentum = useMemo(() => {
    const days = 21;
    const counts = Array.from({ length: days }, () => 0);
    const now = new Date();
    sortedAttempts.forEach((attempt) => {
      const attemptDate = new Date(attempt.createdAt);
      const diff = Math.floor((now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) {
        counts[days - diff - 1] += 1;
      }
    });
    const max = Math.max(1, ...counts);
    return counts.map((count) => count / max);
  }, [sortedAttempts]);

  const attemptSeries = useMemo(() => {
    return sortedAttempts
      .slice()
      .reverse()
      .map((attempt, index) => {
        const test = testsById[attempt.testId];
        if (!test?.crops) {
          return { index: index + 1, score: 0, scorePercent: 0, accuracy: 0, rank: 0 };
        }
        let score = 0;
        let correct = 0;
        let attempted = 0;
        test.crops.forEach((crop) => {
          const selected = attempt.answers[crop.id];
          if (!selected) return;
          attempted += 1;
          if (selected === crop.correctOption) {
            score += test.markingCorrect ?? 4;
            correct += 1;
          } else {
            score += test.markingIncorrect ?? -1;
          }
        });
        const maxPossible = (test.crops?.length ?? 0) * (test.markingCorrect ?? 4);
        const scorePercent = maxPossible > 0 ? Math.round((score / maxPossible) * 100) : 0;
        const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
        const rank = Math.min(99.9, Math.max(1, 5 + accuracy * 0.95));
        return { index: index + 1, score, scorePercent, accuracy, rank };
      });
  }, [sortedAttempts, testsById]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: Array<{
      key: string;
      label: string;
      tooltip: string;
      revenue: number;
      orders: number;
    }> = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        key,
        label: date.toLocaleDateString("en-US", { month: "short" }),
        tooltip: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: 0,
        orders: 0,
      });
    }

    const monthKeys = new Set(months.map((item) => item.key));
    const buckets = new Map<string, { total: number; count: number }>();

    attempts.forEach((attempt) => {
      const test = testsById[attempt.testId];
      if (!test?.crops?.length) return;
      const date = new Date(attempt.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthKeys.has(key)) return;

      const score = computeScore(attempt);
      const maxPossible = (test.crops?.length ?? 0) * (test.markingCorrect ?? 4);
      const scorePercent = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
      const revenue = Math.max(0, Math.round(scorePercent * 4));

      const bucket = buckets.get(key) ?? { total: 0, count: 0 };
      bucket.total += revenue;
      bucket.count += 1;
      buckets.set(key, bucket);
    });

    return months.map((month) => {
      const bucket = buckets.get(month.key);
      if (!bucket) return month;
      return {
        ...month,
        revenue: Math.round(bucket.total / bucket.count),
        orders: bucket.count,
      };
    });
  }, [attempts, testsById]);

  const longBarSeries = useMemo(() => {
    const slice = attemptSeries.slice(-24);
    return slice.map((row) => row.scorePercent);
  }, [attemptSeries]);

  const buildSmoothPath = (values: number[], width: number, height: number, min: number, max: number) => {
    if (values.length === 0) return "";
    if (values.length === 1) {
      const y = height - ((values[0] - min) / (max - min || 1)) * height;
      return `M 0 ${y} L ${width} ${y}`;
    }
    const points = values.map((value, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min || 1)) * height;
      return { x, y };
    });
    const smoothing = 0.2;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const dx = curr.x - prev.x;
      const cp1x = prev.x + dx * smoothing;
      const cp2x = curr.x - dx * smoothing;
      d += ` C ${cp1x} ${prev.y} ${cp2x} ${curr.y} ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const trending = useMemo(() => tests.filter((test) => test.visibility === "Public").slice(0, 3), [tests]);
  const assigned = useMemo(() => tests.filter((test) => test.visibility === "Private").slice(0, 3), [tests]);
  const myTests = useMemo(() => tests.slice(0, 4), [tests]);
  const trendingStats = useMemo(() => {
    const publicTests = tests.filter((test) => test.visibility === "Public");
    return publicTests
      .map((test) => {
        const testAttempts = attemptsByTest[test.id] ?? [];
        const totalAttempts = testAttempts.length;
        const avgTimeSeconds = totalAttempts
          ? Math.round(
              testAttempts.reduce((acc, attempt) => {
                const times = Object.values(attempt.timeSpent || {});
                return acc + times.reduce((a, b) => a + b, 0);
              }, 0) / totalAttempts
            )
          : 0;
        const avgMinutes = avgTimeSeconds ? Math.round(avgTimeSeconds / 60) : 0;
        return {
          id: test.id,
          title: test.title,
          attempts: totalAttempts,
          avgMinutes,
        };
      })
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 3);
  }, [tests, attemptsByTest]);

  if (!authChecked) {
    return <div className="min-h-screen bg-[#0f0f10]" />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <GlassRail />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-24 pb-10">
        {showShatter && (
          <div className="pointer-events-none fixed inset-0 z-50 glass-shatter" />
        )}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-semibold">
              Welcome back{profileName ? `, ${profileName}` : ""}.
            </h1>
          </div>
          <div />
        </header>

        <div className="grid gap-4 lg:grid-cols-4 lg:auto-rows-[180px]">
          <div className="glass-card relative overflow-hidden p-6 lg:col-span-2 lg:row-span-2">
            <div
              className="absolute -left-16 top-10 h-40 w-40 rounded-full blur-3xl"
              style={{ background: auraColor }}
              suppressHydrationWarning
            />
            <div
              className="absolute -right-10 bottom-10 h-40 w-40 rounded-full blur-3xl"
              style={{ background: auraColor }}
              suppressHydrationWarning
            />
            <p className="text-xs uppercase text-white/60">Current Percentile</p>
            <p className="display-font mt-6 text-6xl font-semibold">
              {analytics ? analytics.percentile.toFixed(1) : "0.0"}
            </p>
            <p className="mt-3 text-sm text-white/70">
              Accuracy: {analytics ? `${analytics.accuracy}%` : "0%"} · Trend:{" "}
              {trendState === "up" ? "Rising" : trendState === "down" ? "Cooling" : "Stable"}
            </p>
            <div className="mt-6 h-10 w-full rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/30"
                style={{ width: `${analytics ? Math.min(100, analytics.percentile) : 0}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-white/50">
              <span>Next milestone: Top 1%</span>
              <span>Target: 99.95</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] uppercase text-white/50">Best Score</p>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {overallStats.bestScore} / 300
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] uppercase text-white/50">Attempts</p>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {overallStats.attemptsCount} tests
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] uppercase text-white/50">Avg Accuracy</p>
                <p className="mt-1 text-sm font-semibold text-white/90">
                  {overallStats.avgAccuracy}%
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card flex flex-col justify-between p-5 lg:col-span-2 lg:row-span-2">
            <div>
              <p className="text-xs uppercase text-white/60">Consistency Heatmap</p>
              <p className="mt-2 text-sm text-white/70">Daily activity in the last 12 weeks</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 grid grid-cols-12 gap-1 text-[11px] text-white/50">
                {monthLabels.map((label, index) => (
                  <span key={`month-${index}`} className="text-center">
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid min-w-[420px] grid-flow-col grid-rows-7 gap-0.5">
                {heatmapWeeks.map((week, weekIndex) =>
                  week.map((day, dayIndex) => {
                    const intensity = Math.min(1, day.count / heatmapMax);
                    const color = `rgba(34,197,94,${0.15 + intensity * 0.85})`;
                    return (
                      <span
                        key={`cell-${weekIndex}-${dayIndex}`}
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: color }}
                        title={`${day.date.toDateString()} · ${day.count} attempts`}
                      />
                    );
                  })
                )}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-white/50">
                <span>Less</span>
                <span className="h-2 w-2 rounded-sm bg-emerald-900/40" />
                <span className="h-2 w-2 rounded-sm bg-emerald-700/50" />
                <span className="h-2 w-2 rounded-sm bg-emerald-500/70" />
                <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                <span>More</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
                <span>Longest streak: {overallStats.longestStreak} days</span>
                <span>Active days (30d): {overallStats.activeDays30} / 30</span>
                <span>
                  Last attempt:{" "}
                  {overallStats.lastAttemptAgoDays === null
                    ? "N/A"
                    : `${overallStats.lastAttemptAgoDays} days ago`}
                </span>
                <button
                  className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/70 transition hover:border-white/40"
                  type="button"
                  onClick={() => router.push("/test-analysis")}
                >
                  View Attempts
                </button>
              </div>
            </div>
          </div>

        </div>

        <section className="glass-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-white/60">Performance Trends</p>
              <p className="mt-2 text-sm text-white/70">Monthly score vs attempts over the last year.</p>
            </div>
            <span className="text-xs text-white/50">Last 12 months</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#202124] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-white/60">
                <span>Score vs Attempts</span>
                <div className="flex items-center gap-4 text-[11px] font-medium normal-case tracking-normal text-white/70">
                  {[
                    { label: "Score", color: "#38bdf8" },
                    { label: "Attempts", color: "#c7f04a" },
                  ].map((item) => (
                    <span key={item.label} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
              {monthlyTrend.every((row) => row.orders === 0) ? (
                <div className="flex h-[260px] items-center justify-center text-xs text-white/50">
                  No activity yet
                </div>
              ) : (
                <div className="relative mt-4 h-[260px] w-full rounded-2xl border border-white/10 bg-[#17181b] p-3">
                  <svg
                    viewBox="0 0 640 260"
                    className="h-full w-full"
                    onMouseLeave={() => setHoverIndex(null)}
                    onMouseMove={(event) => {
                      const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
                      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
                      const index = Math.round((x / rect.width) * (monthlyTrend.length - 1));
                      setHoverIndex(index);
                    }}
                  >
                    <defs>
                      <linearGradient id="chartPanel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
                      </linearGradient>
                      <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="rgba(56,189,248,0.5)" />
                      </filter>
                      <filter id="glowLime" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="rgba(199,240,74,0.45)" />
                      </filter>
                      <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(245,158,11,0.45)" />
                      </filter>
                    </defs>
                    <g transform="translate(56,20)">
                      <rect x="0" y="0" width="528" height="200" fill="url(#chartPanel)" rx="12" />
                      {[0, 100, 200, 300, 400].map((tick) => {
                        const y = 200 - (tick / 400) * 200;
                        return (
                          <g key={`y-${tick}`}>
                            <line x1="0" y1={y} x2="528" y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />
                            <text x="-12" y={y + 4} fontSize="10" fill="rgba(255,255,255,0.5)" textAnchor="end">
                              {tick}
                            </text>
                          </g>
                        );
                      })}
                      {monthlyTrend.map((row, idx) => {
                        const x = (idx / (monthlyTrend.length - 1)) * 528;
                        return (
                          <g key={`x-${row.label}-${idx}`}>
                            <text x={x} y="222" fontSize="10" fill="rgba(255,255,255,0.45)" textAnchor="middle">
                              {row.label}
                            </text>
                          </g>
                        );
                      })}
                    {(() => {
                      const chartMax = 400;
                      const revenues = monthlyTrend.map((row) => row.revenue);
                      const orders = monthlyTrend.map((row) => row.orders);
                      const ordersMax = Math.max(1, ...orders);
                      const ordersScaled = orders.map((value) => (value / ordersMax) * chartMax);
                      const revenuePath = buildSmoothPath(revenues, 528, 200, 0, chartMax);
                      const ordersPath = buildSmoothPath(ordersScaled, 528, 200, 0, chartMax);
                      return (
                        <>
                          <path
                            d={revenuePath}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#glowBlue)"
                          />
                          <path
                            d={ordersPath}
                            fill="none"
                            stroke="#c7f04a"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#glowLime)"
                          />
                          {hoverIndex !== null && monthlyTrend[hoverIndex] && (
                            <g>
                              <line
                                x1={(hoverIndex / (monthlyTrend.length - 1)) * 528}
                                y1="0"
                                x2={(hoverIndex / (monthlyTrend.length - 1)) * 528}
                                y2="200"
                                stroke="rgba(255,255,255,0.15)"
                              />
                              {[
                                {
                                  value: 200 - (revenues[hoverIndex] / chartMax) * 200,
                                  color: "#38bdf8",
                                },
                                {
                                  value: 200 - (ordersScaled[hoverIndex] / chartMax) * 200,
                                  color: "#c7f04a",
                                },
                              ].map((point, index) => (
                                <circle
                                  key={`dot-${index}`}
                                  cx={(hoverIndex / (monthlyTrend.length - 1)) * 528}
                                  cy={point.value}
                                  r="4.5"
                                  fill={point.color}
                                  stroke="rgba(255,255,255,0.95)"
                                  strokeWidth="1.4"
                                />
                              ))}
                            </g>
                          )}
                        </>
                      );
                    })()}
                  </g>
                </svg>
                {hoverIndex !== null && monthlyTrend[hoverIndex] && (
                  <div
                    className="pointer-events-none absolute rounded-2xl border border-white/10 bg-[#111214]/95 px-4 py-2 text-[11px] text-white/90 shadow-xl"
                    style={{
                      top: 18,
                      left: `${(hoverIndex / Math.max(1, monthlyTrend.length - 1)) * 85 + 5}%`,
                    }}
                  >
                    <div className="text-[10px] uppercase text-white/60">
                      {monthlyTrend[hoverIndex].tooltip}
                    </div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-400" />
                        Score: {monthlyTrend[hoverIndex].revenue}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-lime-300" />
                        Attempts: {formatCount(monthlyTrend[hoverIndex].orders)}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#202124] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <p className="text-xs uppercase text-white/60">Attempts by Subject</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-[#17181b] p-4">
                <div className="flex items-center justify-center">
                  <svg viewBox="0 0 140 140" className="h-[170px] w-[170px]">
                    {(() => {
                      const radius = 46;
                      const circumference = 2 * Math.PI * radius;
                      let offset = 0;
                      return (
                        <>
                          <circle
                            cx="70"
                            cy="70"
                            r={radius}
                            fill="transparent"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="12"
                          />
                          {donutSegments.items.map((seg) => {
                            const dash = (seg.value / donutSegments.total) * circumference;
                            const node = (
                              <circle
                                key={seg.label}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth="12"
                                strokeDasharray={`${dash} ${circumference}`}
                                strokeDashoffset={-offset}
                                strokeLinecap="round"
                              />
                            );
                            offset += dash;
                            return node;
                          })}
                        </>
                      );
                    })()}
                    <circle cx="70" cy="70" r="34" fill="#101114" />
                    <text x="70" y="64" textAnchor="middle" fontSize="16" fill="#f8fafc" fontWeight="600">
                      {formatCount(donutSegments.total)}
                    </text>
                    <text x="70" y="82" textAnchor="middle" fontSize="9" fill="rgba(248,250,252,0.6)">
                      total attempts
                    </text>
                  </svg>
                </div>
                <div className="mt-3 space-y-2 text-xs text-white/70">
                  {donutSegments.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                        <span>{item.label}</span>
                      </div>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#202124] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-white/60">Score Distribution</p>
                <span className="text-xs text-white/40">Last {longBarSeries.length} attempts</span>
              </div>
              <div className="mt-4 h-[140px] w-full rounded-2xl border border-white/10 bg-[#17181b] p-3">
                {longBarSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-white/50">
                    No attempts yet
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${longBarSeries.length * 8} 100`} className="h-full w-full">
                    <defs>
                      <linearGradient id="scoreBars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d9f99d" />
                        <stop offset="100%" stopColor="#65a30d" />
                      </linearGradient>
                    </defs>
                    {longBarSeries.map((value, index) => {
                      const height = Math.max(6, (value / 100) * 90);
                      return (
                        <rect
                          key={`bar-${index}`}
                          x={index * 8}
                          y={100 - height}
                          width="6"
                          height={height}
                          rx="2"
                          fill="url(#scoreBars)"
                          opacity="0.95"
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#202124] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-white/60">Activity Graph</p>
                <span className="text-xs text-white/40">Last 14 days</span>
              </div>
              <div className="mt-4 h-[140px] w-full rounded-2xl border border-white/10 bg-[#17181b] p-3">
                <svg viewBox={`0 0 ${activityBars.length * 8} 100`} className="h-full w-full">
                  <defs>
                    <linearGradient id="activityBars" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fdba74" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  {activityBars.map((value, index) => {
                    const max = Math.max(1, ...activityBars);
                    const height = Math.max(6, (value / max) * 90);
                    return (
                      <rect
                        key={`activity-${index}`}
                        x={index * 8}
                        y={100 - height}
                        width="6"
                        height={height}
                        rx="2"
                        fill="url(#activityBars)"
                        opacity="0.95"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Trending Tests / Topics</p>
            <div className="mt-5 space-y-4 text-sm">
              {trendingStats.length === 0 ? (
                <p className="text-white/50">No public tests yet.</p>
              ) : (
                trendingStats.map((testItem, index) => (
                  <div
                    key={testItem.id}
                    className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/95">{testItem.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
                          {index === 0 ? "Most attempted today" : "Trending"}
                        </p>
                      </div>
                      <a
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/80 transition hover:border-white/35"
                        href={`/cbt?testId=${testItem.id}`}
                      >
                        Enter
                      </a>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
                      <span>Avg time: {testItem.avgMinutes}m</span>
                      <span>Attempts: {formatCount(testItem.attempts)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">My Tests</p>
            <div className="mt-5 space-y-4 text-sm">
              {myTests.length === 0 ? (
                <p className="text-white/50">No tests created yet.</p>
              ) : (
                myTests.map((testItem) => {
                  const subject = testItem.crops?.[0]?.subject ?? "Physics";
                  const style = subjectStyles[subject];
                  const attemptsCount = attemptsByTest[testItem.id]?.length ?? 0;
                  const testAttempts = attemptsByTest[testItem.id] ?? [];
                  const scores = testAttempts.map((attempt) => computeScore(attempt));
                  const lastAttempt = testAttempts
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
                  const lastScore = lastAttempt ? computeScore(lastAttempt) : 0;
                  const bestScore = scores.length ? Math.max(...scores) : 0;
                  const lastAttemptDate = lastAttempt
                    ? new Date(lastAttempt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "N/A";
                  return (
                    <div
                      key={testItem.id}
                      className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white/95">{testItem.title}</p>
                          <p className="mt-1 text-xs text-white/55">
                            Last: {lastScore} | Best: {bestScore} · {lastAttemptDate}
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/50">
                          {formatCount(attemptsCount)} attempts
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/cbt?testId=${testItem.id}`}>
                          Start
                        </a>
                        <a className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80" href={`/test-created?testId=${testItem.id}`}>
                          Share
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

      </div>

      {showLeague && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowLeague(false)}
          />
          <aside
            className="absolute right-0 top-0 h-full w-[360px] bg-[#1b2440] text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3l2.5 5 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8L12 3z"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth="1.4"
                  />
                </svg>
                <span>League</span>
              </div>
              <button
                onClick={() => setShowLeague(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80"
                aria-label="Close leaderboard"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-2xl bg-gradient-to-b from-[#23316a] to-[#1b2440] p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3l2.5 5 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8L12 3z"
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth="1.4"
                    />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-semibold tracking-wide">{leagueName}</p>
                <p className="mt-1 text-xs text-white/70">
                  Your journey to the top percentile starts here.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-full bg-white/5 p-1 text-xs">
                <button
                  onClick={() => setLeagueTab("today")}
                  className={`flex-1 rounded-full px-3 py-1 ${
                    leagueTab === "today" ? "bg-white/10 text-white" : "text-white/60"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setLeagueTab("week")}
                  className={`flex-1 rounded-full px-3 py-1 ${
                    leagueTab === "week" ? "bg-white/10 text-white" : "text-white/60"
                  }`}
                >
                  This Week
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {leagueRows.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                    No leaderboard data yet.
                  </div>
                ) : (
                  leagueRows.map((row, index) => {
                    const rank = rankForUser.get(row.userId) ?? index + 1;
                    const isYou = row.userId === profileStats?.userId;
                    return (
                      <div
                        key={row.userId}
                        className={`flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 ${
                          isYou ? "bg-[#3a2c26]" : "bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="mono-font w-6 text-xs text-white/80">{rank}</span>
                          {row.image ? (
                            <img
                              src={row.image}
                              alt={row.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs">
                              {(row.name ?? "U").slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {isYou ? "You" : row.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-white/80">
                          <span className="text-yellow-400">●</span>
                          {row.performanceCredits}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
