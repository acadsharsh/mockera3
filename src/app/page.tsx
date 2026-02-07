"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [batchCode, setBatchCode] = useState("");
  const [batchUnlocked, setBatchUnlocked] = useState(false);
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

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!data?.user) {
        router.push("/login");
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      const testResponse = await fetch("/api/tests");
      const testData = await testResponse.json();
      setTests(Array.isArray(testData) ? testData : []);

      const attemptsResponse = await fetch("/api/attempts");
      const attemptsData = await attemptsResponse.json();
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);

      const profileResponse = await fetch("/api/profile");
      const profileData = await profileResponse.json();
      setProfileStats({
        performanceCredits: profileData?.stats?.performanceCredits ?? 0,
        streakDays: profileData?.stats?.streakDays ?? 0,
        userId: profileData?.user?.id,
      });
      setProfileName(profileData?.user?.name ?? "");

      const leaderboardResponse = await fetch("/api/leaderboard?scope=global");
      const leaderboardData = await leaderboardResponse.json();
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

  const trending = useMemo(() => tests.filter((test) => test.visibility === "Public").slice(0, 3), [tests]);
  const assigned = useMemo(() => tests.filter((test) => test.visibility === "Private").slice(0, 3), [tests]);
  const myTests = useMemo(() => tests.slice(0, 4), [tests]);

  const recommended = useMemo(() => {
    if (tests.length === 0) {
      return null;
    }
    const test = tests[0];
    const subject = test.crops?.[0]?.subject ?? "Physics";
    return { test, subject };
  }, [tests]);

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
        <div className="rounded-full bg-white/5 px-2 py-2">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400/30 via-blue-500/60 to-indigo-500/60"
              style={{ width: `${flowProgress}%` }}
            />
            <span
              className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.9)]"
              style={{ left: `calc(${flowProgress}% - 6px)` }}
            />
            <span className="flow-pulse" />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-white/60">
            <span>Performance Credits</span>
            <span>
              {profileStats ? profileStats.performanceCredits : 0} PC ·{" "}
              {nextTierTarget ? `Next tier at ${nextTierTarget} PC` : "Tier unlocked"}
            </span>
          </div>
        </div>

        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Command Center</p>
            <h1 className="mt-2 text-3xl font-semibold">
              Welcome back{profileName ? `, ${profileName}` : ""}.
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3l2.5 5 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8L12 3z"
                  stroke="rgba(255,255,255,0.7)"
                  strokeWidth="1.4"
                />
              </svg>
              <span>League</span>
            </div>
            <button
              onClick={() => setShowLeague(true)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 4h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V4z"
                  stroke="rgba(255,255,255,0.8)"
                  strokeWidth="1.4"
                />
                <path d="M8 20h8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" />
                <path d="M10 12v4h4v-4" stroke="rgba(255,255,255,0.5)" strokeWidth="1.4" />
              </svg>
              <span>{formatCount(profileStats?.performanceCredits ?? 0)}</span>
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-4 lg:auto-rows-[180px]">
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-indigo-600/60 via-indigo-700/40 to-[#120f2c] p-6 lg:col-span-2 lg:row-span-2">
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
          </div>

          <div className="glass-card flex flex-col justify-between p-5 lg:col-span-2">
            <div>
              <p className="text-xs uppercase text-white/60">Consistency Heatmap</p>
              <p className="mt-2 text-sm text-white/70">Daily activity in the last 12 weeks</p>
            </div>
            <div className="mt-4 overflow-x-auto">
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
            </div>
          </div>

          <div className="glass-card relative p-5 [perspective:1200px]">
            <div
              className={`h-full w-full transition-transform duration-700 [transform-style:preserve-3d] ${
                batchUnlocked ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              <div className="absolute inset-0 flex flex-col justify-between [backface-visibility:hidden]">
                <div>
                  <p className="text-xs uppercase text-white/60">Batch Portal</p>
                  <p className="mt-2 text-sm text-white/70">Enter your 6-digit code</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={batchCode}
                    onChange={(event) => setBatchCode(event.target.value)}
                    placeholder="Access Code"
                    className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40"
                  />
                  <button
                    className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black"
                    onClick={() => setBatchUnlocked(batchCode.length >= 6)}
                    type="button"
                  >
                    Unlock
                  </button>
                </div>
              </div>
              <div className="absolute inset-0 rounded-[24px] bg-white/5 p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <p className="text-xs uppercase text-white/60">Assigned Batches</p>
                <div className="mt-3 space-y-2 text-sm">
                  {assigned.length === 0 ? (
                    <p className="text-white/50">No batches yet.</p>
                  ) : (
                    assigned.map((testItem) => (
                      <div key={testItem.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                        <div>
                          <p className="font-semibold">{testItem.title}</p>
                          <p className="text-xs text-white/50">Code: {testItem.accessCode || "Private"}</p>
                        </div>
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {recommended && (
          <div className="glass-card rounded-[28px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-white/50">Recommended for you</p>
                <h2 className="mt-2 text-2xl font-semibold">{recommended.test.title}</h2>
                <p className="mt-2 text-sm text-white/60">Pick up where you left off.</p>
              </div>
              <a
                className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
                href={`/cbt?testId=${recommended.test.id}`}
              >
                Enter Arena
              </a>
            </div>
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Assigned to Me</p>
            <div className="mt-4 space-y-3 text-sm">
              {assigned.length === 0 ? (
                <p className="text-white/50">No private batches yet.</p>
              ) : (
                assigned.map((testItem) => (
                  <div key={testItem.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold">{testItem.title}</p>
                      <p className="text-xs text-white/50">Code: {testItem.accessCode || "Private"}</p>
                    </div>
                    <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/cbt?testId=${testItem.id}`}>
                      Start
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Global Trending</p>
            <div className="mt-4 space-y-3 text-sm">
              {trending.length === 0 ? (
                <p className="text-white/50">No public tests yet.</p>
              ) : (
                trending.map((testItem) => (
                  <div key={testItem.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-semibold">{testItem.title}</p>
                      <p className="text-xs text-white/50">{testItem.crops?.length ?? 0} questions</p>
                    </div>
                    <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/cbt?testId=${testItem.id}`}>
                      Enter
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">My Tests</p>
            <div className="mt-4 space-y-3 text-sm">
              {myTests.length === 0 ? (
                <p className="text-white/50">No tests created yet.</p>
              ) : (
                myTests.map((testItem) => {
                  const subject = testItem.crops?.[0]?.subject ?? "Physics";
                  const style = subjectStyles[subject];
                  const attemptsCount = attemptsByTest[testItem.id]?.length ?? 0;
                  return (
                    <div key={testItem.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div className="flex items-center justify-end">
                        <span className="text-[11px] text-white/40">{formatCount(attemptsCount)} attempts</span>
                      </div>
                      <p className="mt-2 font-semibold">{testItem.title}</p>
                      <div className="mt-3 flex gap-2">
                        <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/cbt?testId=${testItem.id}`}>
                          Start
                        </a>
                        <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/test-created?testId=${testItem.id}`}>
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
