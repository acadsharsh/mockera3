"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";

type Attempt = {
  id: string;
  testId: string;
  createdAt: string;
  batchCode?: string;
  score?: number;
  accuracy?: number;
  userId?: string;
  userName?: string;
};

const percentileFromAccuracy = (accuracy: number) => {
  const score = 5 + accuracy * 95;
  return Math.min(99.9, Math.max(1, Math.round(score * 10) / 10));
};

export default function BatchManagerPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeBatch, setActiveBatch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const attemptsResponse = await fetch("/api/attempts?scope=global");
      const attemptsData = await attemptsResponse.json();
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
      setLoading(false);
    };
    load();
  }, []);

  const batchCodes = useMemo(() => {
    const unique = new Set(
      attempts.map((attempt) => attempt.batchCode).filter(Boolean) as string[]
    );
    return Array.from(unique).sort();
  }, [attempts]);

  useEffect(() => {
    if (!activeBatch && batchCodes.length > 0) {
      setActiveBatch(batchCodes[0]);
    }
  }, [activeBatch, batchCodes]);

  const batchAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.batchCode === activeBatch),
    [attempts, activeBatch]
  );

  const batchAvgAccuracy = useMemo(() => {
    if (batchAttempts.length === 0) return 0;
    const total = batchAttempts.reduce((sum, attempt) => sum + (attempt.accuracy ?? 0), 0);
    return total / batchAttempts.length;
  }, [batchAttempts]);

  const globalAvgAccuracy = useMemo(() => {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((sum, attempt) => sum + (attempt.accuracy ?? 0), 0);
    return total / attempts.length;
  }, [attempts]);

  const livePulse = useMemo(() => {
    const buckets = Array.from({ length: 9 }, () => 0);
    if (batchAttempts.length === 0) return buckets;
    const now = Date.now();
    batchAttempts.forEach((attempt) => {
      const diffDays = Math.floor(
        (now - new Date(attempt.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 0 && diffDays < buckets.length) {
        buckets[buckets.length - diffDays - 1] += 1;
      }
    });
    return buckets;
  }, [batchAttempts]);

  const students = useMemo(() => {
    const map = new Map<
      string,
      { name: string; lastAttempt: number; accuracy: number; attempts: number }
    >();
    batchAttempts.forEach((attempt) => {
      if (!attempt.userId) return;
      const existing = map.get(attempt.userId);
      const lastAttempt = new Date(attempt.createdAt).getTime();
      if (!existing) {
        map.set(attempt.userId, {
          name: attempt.userName ?? "Anonymous",
          lastAttempt,
          accuracy: attempt.accuracy ?? 0,
          attempts: 1,
        });
        return;
      }
      map.set(attempt.userId, {
        name: existing.name,
        lastAttempt: Math.max(existing.lastAttempt, lastAttempt),
        accuracy: (existing.accuracy * existing.attempts + (attempt.accuracy ?? 0)) / (existing.attempts + 1),
        attempts: existing.attempts + 1,
      });
    });
    return Array.from(map.values())
      .map((student) => ({
        ...student,
        status:
          Date.now() - student.lastAttempt < 7 * 24 * 60 * 60 * 1000 ? "active" : "slacking",
      }))
      .sort((a, b) => b.attempts - a.attempts);
  }, [batchAttempts]);

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <GlassRail />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-20 pt-24 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Batch Manager</p>
            <h1 className="mt-3 text-3xl font-semibold">Elite Cohort Control</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Track batch accuracy, pulse, and active students using real attempts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeBatch}
              onChange={(event) => setActiveBatch(event.target.value)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white"
            >
              {batchCodes.length === 0 ? (
                <option value="">No batches</option>
              ) : (
                batchCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))
              )}
            </select>
            <a
              href="/studio"
              className="rounded-full bg-indigo-500/30 px-4 py-2 text-xs text-indigo-100 transition hover:bg-indigo-500/50"
            >
              Create Private Test
            </a>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-6">
            Loading batch intelligence...
          </div>
        ) : batchCodes.length === 0 ? (
          <div className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-6">
            No batch attempts yet. Add a batch code during CBT to begin tracking.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="glass-card col-span-2 rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Analytics Overview</p>
                <div className="mt-5 flex flex-wrap items-end gap-6">
                  <div>
                    <div className="text-3xl font-semibold text-emerald-300">
                      {percentileFromAccuracy(batchAvgAccuracy)}%
                    </div>
                    <p className="text-xs text-slate-400">Batch Avg Percentile</p>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-slate-200">
                      {percentileFromAccuracy(globalAvgAccuracy)}%
                    </div>
                    <p className="text-xs text-slate-400">Global Avg Percentile</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-4 py-2 text-xs text-emerald-100">
                    Gap {Math.round((batchAvgAccuracy - globalAvgAccuracy) * 1000) / 10}%
                  </div>
                </div>
                <div className="mt-6 h-28 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
                  <div className="text-white/70">{students.length} active students</div>
                  <div className="mt-3 flex h-12 items-end gap-1">
                    {livePulse.map((value, index) => (
                      <span
                        key={`pulse-${index}`}
                        className="w-3 rounded-full bg-indigo-400/60"
                        style={{ height: `${Math.max(6, value * 6)}px` }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="glass-card col-span-1 rounded-[28px] border border-white/10 bg-white/5 p-6"
              >
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Live Monitor</p>
                <div className="mt-5 h-32 rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-transparent p-4 text-xs text-slate-300">
                  <div className="text-white/70">Attempts in last 9 days</div>
                  <div className="mt-3 flex h-12 items-end gap-1">
                    {livePulse.slice(-6).map((value, index) => (
                      <span
                        key={`monitor-${index}`}
                        className="w-4 rounded-full bg-emerald-400/60"
                        style={{ height: `${Math.max(6, value * 6)}px` }}
                      />
                    ))}
                  </div>
                </div>
                <a
                  href="/library?tab=leaderboard"
                  className="mt-5 block w-full rounded-full bg-white/10 px-4 py-2 text-center text-xs text-white transition hover:bg-white/20"
                >
                  Open Live View
                </a>
              </motion.div>
            </div>

            <div className="glass-card rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Student Grid</p>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                {students.length === 0 ? (
                  <div className="col-span-full text-sm text-slate-400">
                    No students yet for this batch.
                  </div>
                ) : (
                  students.map((student) => (
                    <div
                      key={`${student.name}-${student.lastAttempt}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <div className="text-sm">{student.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {Math.round(student.accuracy * 100)}% accuracy
                        </div>
                      </div>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          student.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
