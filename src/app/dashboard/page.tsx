"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GlassRail from "@/components/GlassRail";
import BroadcastPopup from "@/components/BroadcastPopup";
import LottieLoader from "@/components/LottieLoader";
import { safeJson } from "@/lib/safe-json";

type RecentAttempt = {
  id: string;
  testId: string;
  score: number;
  createdAt: string;
  testTitle: string;
};

type TrendingTest = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  attempts: number;
  avgMinutes: number;
};

type MyTest = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  attempts: number;
  lastScore: number;
  bestScore: number;
  lastAttemptAt: string | null;
};

type DashboardSummary = {
  user: { name: string };
  stats: {
    attemptsCount: number;
    lastScore: number;
    avgScore: number;
  };
  recentAttempts: RecentAttempt[];
  trending: TrendingTest[];
  myTests: MyTest[];
};

type PyqStats = {
  questions: number;
  chapters: number;
  exams: number;
  latestYear: number | null;
};

const CACHE_KEY = "dashboard-summary-v1";

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return `${value}`;
};

const formatDate = (value: string | null) => {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function Dashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pyqStats, setPyqStats] = useState<PyqStats | null>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as DashboardSummary;
        setSummary(parsed);
        setLoading(false);
      }
    } catch {
      // ignore cache failures
    }

    const load = async () => {
      const response = await fetch("/api/dashboard-summary");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await safeJson<DashboardSummary | null>(response, null);
      if (data) {
        setSummary(data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // ignore cache failures
        }
      }
      setLoading(false);
    };

    load();
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch("/api/pyq/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setPyqStats({
          questions: Number(data.questions) || 0,
          chapters: Number(data.chapters) || 0,
          exams: Number(data.exams) || 0,
          latestYear: data.latestYear ? Number(data.latestYear) : null,
        });
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const stats = summary?.stats;

  const recentAttempts = useMemo(() => summary?.recentAttempts ?? [], [summary]);
  const trending = useMemo(() => summary?.trending ?? [], [summary]);
  const myTests = useMemo(() => summary?.myTests ?? [], [summary]);

  if (loading && !summary) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0f0f10] text-white">
        <LottieLoader message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white font-neue">
      <GlassRail />
      <BroadcastPopup />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pt-24 pb-12">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold font-everett">
              Welcome back{summary?.user?.name ? `, ${summary.user.name}` : ""}.
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Pick up where you left off or start a new practice run.
            </p>
          </div>
        </header>

        
        <section className="rounded-3xl border border-white/10 bg-[#101624] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">PYQ Bank</p>
              <h2 className="mt-2 text-2xl font-semibold font-everett">Chapter-wise PYQs</h2>
              <p className="mt-2 text-sm text-white/60">Filter by exam, year, shift, and difficulty. Build a mock in seconds.</p>
            </div>
            <a href="/pyq" className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/80">Open PYQ</a>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/50">Questions</p>
              <p className="mt-2 text-lg font-semibold">{pyqStats ? formatCount(pyqStats.questions) : "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/50">Chapters</p>
              <p className="mt-2 text-lg font-semibold">{pyqStats ? formatCount(pyqStats.chapters) : "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/50">Exams</p>
              <p className="mt-2 text-lg font-semibold">{pyqStats ? formatCount(pyqStats.exams) : "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase text-white/50">Latest Year</p>
              <p className="mt-2 text-lg font-semibold">{pyqStats?.latestYear ?? "-"}</p>
            </div>
          </div>
        </section>

<section className="grid gap-4 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f1624] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)] lg:col-span-2">
            <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.35),transparent_70%)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.25),transparent_70%)] blur-3xl" />
            <p className="relative text-xs uppercase text-white/60">Average Score</p>
            <p className="mt-5 text-5xl font-semibold">
              {stats ? stats.avgScore : 0}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70">
              <span>Attempts: {stats ? stats.attemptsCount : 0}</span>
              <span className="text-white/40">•</span>
              <span>Last Score: {stats ? stats.lastScore : 0}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#1a1f27] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase text-white/60">Recent Attempts</p>
            <div className="mt-4 space-y-3 text-sm">
              {recentAttempts.slice(0, 4).map((attempt) => (
                <div key={attempt.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                  <p className="text-white/90">{attempt.testTitle}</p>
                  <p className="text-xs text-white/50">
                    Score {attempt.score} · {formatDate(attempt.createdAt)}
                  </p>
                </div>
              ))}
              {recentAttempts.length === 0 && <p className="text-white/50">No attempts yet.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="glass-card p-6">
            <p className="text-xs uppercase text-white/60">Trending Tests / Topics</p>
            <div className="mt-5 space-y-4 text-sm">
              {trending.length === 0 ? (
                <p className="text-white/50">No public tests yet.</p>
              ) : (
                trending.map((testItem, index) => (
                  <div
                    key={testItem.id}
                    className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/95">{testItem.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">
                          {index === 0 ? "Most attempted" : "Trending"}
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
                      <span>Global attempts: {formatCount(testItem.attempts)}</span>
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
                myTests.map((testItem) => (
                  <div
                    key={testItem.id}
                    className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/95">{testItem.title}</p>
                        <p className="mt-1 text-xs text-white/55">
                          Last: {testItem.lastScore} | Best: {testItem.bestScore} · {formatDate(testItem.lastAttemptAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/50">
                        {formatCount(testItem.attempts)} attempts
                      </span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <a className="rounded-full bg-white/10 px-3 py-1 text-xs" href={`/cbt?testId=${testItem.id}`}>
                        Start
                      </a>
                      <a
                        className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80"
                        href={`/test-created?testId=${testItem.id}`}
                      >
                        Share
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
