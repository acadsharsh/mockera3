"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/get-session");
      const data = await safeJson<{ user?: { name?: string | null } } | null>(response, null);
      if (!data?.user) {
        router.push("/login");
      } else {
        setProfileName(data.user.name ?? "");
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      const [testResponse, attemptsResponse] = await Promise.all([
        fetch("/api/tests"),
        fetch("/api/attempts"),
      ]);

      const [testData, attemptsData] = await Promise.all([
        safeJson<Test[]>(testResponse, []),
        safeJson<Attempt[]>(attemptsResponse, []),
      ]);

      setTests(Array.isArray(testData) ? testData : []);
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
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

  const trendingStats = useMemo(() => {
    const publicTests = tests.filter((test) => test.visibility === "Public");
    return publicTests.slice(0, 3).map((test) => {
      const testAttempts = attemptsByTest[test.id] ?? [];
      const totalMinutes = testAttempts.reduce((acc, attempt) => {
        const secs = Object.values(attempt.timeSpent || {}).reduce((sum, value) => sum + value, 0);
        return acc + secs / 60;
      }, 0);
      const avgMinutes = testAttempts.length ? Math.round(totalMinutes / testAttempts.length) : 0;
      return {
        id: test.id,
        title: test.title,
        attempts: testAttempts.length,
        avgMinutes,
      };
    });
  }, [tests, attemptsByTest]);

  const myTests = useMemo(() => tests.slice(0, 4), [tests]);

  if (!authChecked) {
    return <div className="min-h-screen bg-[#0f0f10]" />;
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <GlassRail />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-24 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">
              Welcome back{profileName ? `, ${profileName}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Pick up where you left off or start a new practice run.
            </p>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#1d2233] via-[#1b1f2b] to-[#0d111a] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)] lg:col-span-2">
            <p className="text-xs uppercase text-white/60">Current Percentile</p>
            <p className="mt-5 text-5xl font-semibold">
              {analytics ? analytics.percentile.toFixed(1) : "0.0"}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
              <span>Accuracy: {analytics ? `${analytics.accuracy}%` : "0%"}</span>
              <span>Score: {analytics ? analytics.score : 0}</span>
              <span>Attempts: {attempts.length}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202124] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase text-white/60">Recent Attempts</p>
            <div className="mt-4 space-y-3 text-sm">
              {sortedAttempts.slice(0, 4).map((attempt) => {
                const test = testsById[attempt.testId];
                return (
                  <div key={attempt.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-white/90">{test?.title ?? "Untitled Test"}</p>
                    <p className="text-xs text-white/50">
                      Score {computeScore(attempt)} ·{" "}
                      {new Date(attempt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                );
              })}
              {sortedAttempts.length === 0 && <p className="text-white/50">No attempts yet.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
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
    </div>
  );
}
