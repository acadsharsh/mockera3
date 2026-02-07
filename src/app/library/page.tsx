"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";
import { motion } from "framer-motion";

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
  userId?: string;
  userName?: string;
  userImage?: string | null;
};

const tabs = ["All Tests", "Public", "My Batches", "Starred"] as const;

const subjectStyles = {
  Physics: {
    border: "border-[#3b82f6]/60",
    glow: "shadow-[0_0_24px_rgba(59,130,246,0.25)]",
    chip: "bg-[#1d4ed8]/40 text-[#93c5fd]",
    label: "Physics",
  },
  Chemistry: {
    border: "border-[#22c55e]/60",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.25)]",
    chip: "bg-[#16a34a]/40 text-[#86efac]",
    label: "Chemistry",
  },
  Maths: {
    border: "border-[#a855f7]/60",
    glow: "shadow-[0_0_24px_rgba(168,85,247,0.25)]",
    chip: "bg-[#7e22ce]/40 text-[#e9d5ff]",
    label: "Mathematics",
  },
};

const fuzzyScore = (text: string, query: string) => {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  let ti = 0;
  for (let qi = 0; qi < q.length; qi += 1) {
    const ch = q[qi];
    const index = t.indexOf(ch, ti);
    if (index === -1) {
      return 0;
    }
    score += 2;
    if (index === ti) {
      score += 1;
    }
    ti = index + 1;
  }
  return score;
};

const formatCount = (value: number) => {
  if (value >= 1000000) {
    return `${Math.round(value / 100000) / 10}M`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }
  return `${value}`;
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

export default function TestLibrary() {
  const [subjectParam, setSubjectParam] = useState<string | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All Tests");
  const [leaderboardTestId, setLeaderboardTestId] = useState<string | null>(null);
  const [leaderboardRows, setLeaderboardRows] = useState<
    Array<{ name: string; score: number; accuracy: number; attempts: number; userId: string }>
  >([]);
  const [leaderboardTest, setLeaderboardTest] = useState<Test | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [search, setSearch] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [offlineReadyId, setOfflineReadyId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSubjectParam(params.get("subject"));
    if (params.get("tab") === "leaderboard") {
      setLeaderboardTestId(params.get("testId"));
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const testsResponse = await fetch("/api/tests");
      if (testsResponse.status === 401) {
        setAuthError(true);
        setTests([]);
        setAttempts([]);
        return;
      }
      const testsData = await testsResponse.json();
      setTests(Array.isArray(testsData) ? testsData : []);

      const attemptsResponse = await fetch("/api/attempts");
      if (attemptsResponse.status === 401) {
        setAuthError(true);
        setAttempts([]);
        return;
      }
      const attemptsData = await attemptsResponse.json();
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
    };
    load();
  }, []);

  useEffect(() => {
    const loadLeaderboard = async () => {
      if (!leaderboardTestId) return;
      setLoadingLeaderboard(true);
      const testResponse = await fetch(`/api/tests?testId=${leaderboardTestId}`);
      const testData = await testResponse.json();
      setLeaderboardTest(testData ?? null);

      const attemptsResponse = await fetch(`/api/attempts?testId=${leaderboardTestId}&scope=global`);
      const attemptsData = await attemptsResponse.json();
      const list = Array.isArray(attemptsData) ? attemptsData : [];
      const map = new Map<string, { name: string; score: number; accuracy: number; attempts: number }>();

      list.forEach((attempt) => {
        const test = testData;
        if (!test) return;
        let score = 0;
        let attempted = 0;
        let correct = 0;
        test.crops?.forEach((crop: Crop) => {
          const selected = attempt.answers?.[crop.id];
          if (!selected) return;
          attempted += 1;
          if (selected === crop.correctOption) {
            score += test.markingCorrect ?? 4;
            correct += 1;
          } else {
            score += test.markingIncorrect ?? -1;
          }
        });
        const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
        const userId = attempt.userId ?? "unknown";
        const current = map.get(userId);
        if (!current) {
          map.set(userId, {
            name: attempt.userName ?? "Anonymous",
            score,
            accuracy,
            attempts: 1,
          });
        } else {
          const nextAttempts = current.attempts + 1;
          map.set(userId, {
            name: current.name,
            score: current.score + score,
            accuracy: Math.round((current.accuracy * current.attempts + accuracy) / nextAttempts),
            attempts: nextAttempts,
          });
        }
      });

      const rows = Array.from(map.entries())
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      setLeaderboardRows(rows);
      setLoadingLeaderboard(false);
    };
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [leaderboardTestId]);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      if (activeTab === "Public" && test.visibility !== "Public") {
        return false;
      }
      if (activeTab === "My Batches" && test.visibility !== "Private") {
        return false;
      }
      if (activeTab === "Starred" && !starred.has(test.id)) {
        return false;
      }
      if (subjectParam) {
        return test.crops?.some((crop) => crop.subject === subjectParam);
      }
      return true;
    });
  }, [tests, activeTab, starred, subjectParam]);

  const searchedTests = useMemo(() => {
    if (!search.trim()) {
      return filteredTests;
    }
    return filteredTests
      .map((test) => ({
        test,
        score: fuzzyScore(test.title, search),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.test);
  }, [filteredTests, search]);

  const recommendedTest = useMemo(() => searchedTests[0] ?? null, [searchedTests]);

  useEffect(() => {
    if (!recommendedTest?.crops?.length) return;
    let cancelled = false;
    const preload = async () => {
      const loaders = recommendedTest.crops!.map(
        (crop) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = crop.imageDataUrl;
          })
      );
      await Promise.all(loaders);
      if (!cancelled) {
        setOfflineReadyId(recommendedTest.id);
      }
    };
    preload();
    return () => {
      cancelled = true;
    };
  }, [recommendedTest]);

  const attemptsByTest = useMemo(() => {
    return attempts.reduce((acc, attempt) => {
      acc[attempt.testId] = acc[attempt.testId] || [];
      acc[attempt.testId].push(attempt);
      return acc;
    }, {} as Record<string, Attempt[]>);
  }, [attempts]);

  const privateBatches = useMemo(() => {
    return tests
      .filter((test) => test.visibility === "Private")
      .slice(0, 4)
      .map((test) => ({
        id: test.id,
        title: test.title,
        accessCode: test.accessCode ?? "",
        isNew: test.createdAt ? Date.now() - new Date(test.createdAt).getTime() < 1000 * 60 * 60 * 24 * 7 : false,
      }));
  }, [tests]);

  const handleStar = (id: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <GlassRail />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-24 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Digital Vault</p>
            <h1 className="mt-2 text-3xl font-semibold">Test Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60">Cmd + K</div>
            <a className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20" href="/studio">
              + Create Test
            </a>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="rounded-full border border-white/10 bg-white/5 p-1">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    activeTab === tab ? "bg-white text-black" : "text-white/60"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full max-w-md">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tests..."
              className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {leaderboardTestId ? (
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-white/60">Live Batch Leaderboard</p>
                <p className="mt-1 text-sm text-white/70">
                  {leaderboardTest?.title ?? "Loading test..."}
                </p>
              </div>
              <a
                className="rounded-full border border-white/10 px-4 py-2 text-xs"
                href="/library"
              >
                Back to Library
              </a>
            </div>

            {loadingLeaderboard ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                Loading leaderboard...
              </div>
            ) : leaderboardRows.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                No attempts yet. The leaderboard will appear after the first attempt.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {leaderboardRows.map((row, index) => (
                  <div
                    key={row.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/50">#{index + 1}</span>
                      <span className="font-semibold">{row.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-white/70">
                      <span>Score: {row.score}</span>
                      <span>Accuracy: {row.accuracy}%</span>
                      <span>Attempts: {row.attempts}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div>
            {authError ? (
              <div className="flex h-[360px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="h-24 w-24 rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-white/5" />
                <h3 className="mt-4 text-lg font-semibold">Please sign in</h3>
                <p className="mt-2 text-sm text-white/60">
                  Your session has expired. Sign in again to access your test library.
                </p>
                <a className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20" href="/login">
                  Go to Login
                </a>
              </div>
            ) : searchedTests.length === 0 ? (
              <div className="flex h-[360px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                <div className="h-24 w-24 rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-white/5" />
                <h3 className="mt-4 text-lg font-semibold">Space Explorer</h3>
                <p className="mt-2 text-sm text-white/60">No tests found. Create your first test from a PDF.</p>
                <a className="mt-4 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20" href="/studio">
                  Create Test
                </a>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {searchedTests.map((test, index) => {
                  const subject = test.crops?.[0]?.subject ?? "Physics";
                  const style = subjectStyles[subject];
                  const attemptsCount = attemptsByTest[test.id]?.length ?? 0;
                  const totalQuestions = test.crops?.length ?? 0;
                  const latestAttempt = attemptsByTest[test.id]?.[0];
                  const attemptedCount = latestAttempt
                    ? Object.values(latestAttempt.answers).filter(Boolean).length
                    : 0;
                  const isCompleted = attemptedCount > 0 && attemptedCount === totalQuestions;
                  const isInProgress = attemptedCount > 0 && attemptedCount < totalQuestions;
                  let statusLabel = "Not Started";
                  if (isCompleted) {
                    let score = 0;
                    test.crops?.forEach((crop) => {
                      const selected = latestAttempt?.answers[crop.id];
                      if (!selected) return;
                      score += selected === crop.correctOption ? (test.markingCorrect ?? 4) : (test.markingIncorrect ?? -1);
                    });
                    statusLabel = `Completed (Score: ${score}/${(test.markingCorrect ?? 4) * totalQuestions})`;
                  } else if (isInProgress) {
                    statusLabel = "In Progress";
                  }

                  return (
                    <motion.div
                      key={test.id}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                      className={`group relative overflow-hidden rounded-[28px] border bg-white/5 p-5 backdrop-blur transition hover:-translate-y-1 ${style.border} ${style.glow}`}
                    >
                      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent blur-2xl" />
                        <div className="absolute inset-0 flex items-end justify-end p-4 text-[11px] text-white/70">
                          Marking: +{test.markingCorrect ?? 4} / {test.markingIncorrect ?? -1}
                        </div>
                      </div>

                      <div className="relative">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleStar(test.id)}
                            className={`text-xs ${starred.has(test.id) ? "text-white" : "text-white/30"}`}
                          >
                            ★
                          </button>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">{test.title}</h3>
                        <p className="mt-2 text-xs text-white/60">{statusLabel}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                          <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="8" />
                              <path d="M12 8v5l3 2" />
                            </svg>
                            {test.durationMinutes ?? 180}m
                          </span>
                          <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            {totalQuestions} Qs
                          </span>
                          <span>• Attempted by {formatCount(attemptsCount || 12000)} students</span>
                        </div>
                        <a
                          className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100"
                          href={
                            isCompleted ? `/test-analysis?testId=${test.id}` : `/cbt?testId=${test.id}`
                          }
                        >
                          {isCompleted ? "View Insights" : "Enter Arena"}
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="glass-card p-5">
            <h3 className="text-sm font-semibold">Private Batches</h3>
            <p className="mt-1 text-xs text-white/50">Enter a 6-digit access code to unlock</p>
            <div className="mt-4 flex gap-2">
              <input
                placeholder="Access Code"
                className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/40"
              />
              <button className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20">Unlock</button>
            </div>
            <div className="mt-5 space-y-3">
              {privateBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">{batch.title}</p>
                    <p className="text-xs text-white/50">Code: {batch.accessCode || "Private"}</p>
                  </div>
                  {batch.isNew && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
                </div>
              ))}
              {privateBatches.length === 0 && (
                <p className="text-xs text-white/50">No private batches yet.</p>
              )}
            </div>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
