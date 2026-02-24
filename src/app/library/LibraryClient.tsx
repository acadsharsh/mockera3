"use client";

import { useEffect, useMemo, useState } from "react";
import GlassRail from "@/components/GlassRail";
import BroadcastPopup from "@/components/BroadcastPopup";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  correctOption: string;
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
  questionType?: "MCQ" | "MSQ" | "NUM";
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
  ownerId?: string;
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

type LibraryClientProps = {
  initialTests: Test[];
  initialAttempts: Attempt[];
  initialAuthError?: boolean;
};

const tabs = ["All Tests", "Public", "My Batches", "Starred"] as const;

const subjectStyles = {
  Physics: {
    border: "border-[#3b82f6]/60",
    glow: "",
    chip: "bg-[#1d4ed8]/40 text-[#93c5fd]",
    label: "Physics",
  },
  Chemistry: {
    border: "border-[#22c55e]/60",
    glow: "",
    chip: "bg-[#16a34a]/40 text-[#86efac]",
    label: "Chemistry",
  },
  Maths: {
    border: "border-[#a855f7]/60",
    glow: "",
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

export default function LibraryClient({
  initialTests,
  initialAttempts,
  initialAuthError = false,
}: LibraryClientProps) {
  const [subjectParam, setSubjectParam] = useState<string | null>(null);
  const [tests, setTests] = useState<Test[]>(initialTests);
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("All Tests");
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<"All" | "Physics" | "Chemistry" | "Maths">("All");
  const [filterDifficulty, setFilterDifficulty] = useState<"All" | "Easy" | "Moderate" | "Tough">("All");
  const [minAttempts, setMinAttempts] = useState(0);
  const [maxWrongRate, setMaxWrongRate] = useState(100);
  const [maxAvgMinutes, setMaxAvgMinutes] = useState(0);
  const [lastAttemptDays, setLastAttemptDays] = useState(0);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [authError, setAuthError] = useState(initialAuthError);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editTest, setEditTest] = useState<Test | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSubjectParam(params.get("subject"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/get-session");
        const sessionData = await sessionResponse.json();
        if (!cancelled) {
          setCurrentUserId(sessionData?.user?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUserId(null);
        }
      }

      try {
        const testsResponse = await fetch("/api/tests");
        if (testsResponse.status === 401) {
          if (!cancelled) {
            setAuthError(true);
            setTests([]);
            setAttempts([]);
          }
          return;
        }
        const testsData = await testsResponse.json();
        if (!cancelled) {
          setTests(Array.isArray(testsData) ? testsData : []);
        }

        const attemptsResponse = await fetch("/api/attempts");
        if (attemptsResponse.status === 401) {
          if (!cancelled) {
            setAuthError(true);
            setAttempts([]);
          }
          return;
        }
        const attemptsData = await attemptsResponse.json();
        if (!cancelled) {
          setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
        }
      } catch {
        if (!cancelled) {
          setAuthError(true);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const attemptsByTest = useMemo(() => {
    return attempts.reduce((acc, attempt) => {
      acc[attempt.testId] = acc[attempt.testId] || [];
      acc[attempt.testId].push(attempt);
      return acc;
    }, {} as Record<string, Attempt[]>);
  }, [attempts]);

  const testStats = useMemo(() => {
    const stats: Record<
      string,
      { attempts: number; lastAttemptAt?: number; wrongRate: number; avgTime: number }
    > = {};
    tests.forEach((test) => {
      const list = attemptsByTest[test.id] ?? [];
      const totalAttempts = list.length;
      const lastAttemptAt = list[0]?.createdAt ? new Date(list[0].createdAt).getTime() : undefined;
      let attempted = 0;
      let correct = 0;
      let totalTime = 0;
      list.forEach((attempt) => {
        const answers = attempt.answers ?? {};
        const timeSpent = attempt.timeSpent ?? {};
        Object.keys(answers).forEach((id) => {
          const selected = answers[id];
          if (!selected) return;
          attempted += 1;
          const crop = test.crops?.find((item) => item.id === id);
          if (crop && selected === crop.correctOption) {
            correct += 1;
          }
          totalTime += timeSpent[id] ?? 0;
        });
      });
      const wrongRate = attempted ? (1 - correct / attempted) * 100 : 0;
      const avgTime = attempted ? totalTime / attempted : 0;
      stats[test.id] = { attempts: totalAttempts, lastAttemptAt, wrongRate, avgTime };
    });
    return stats;
  }, [tests, attemptsByTest]);

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
      if (filterSubject !== "All") {
        if (!test.crops?.some((crop) => crop.subject === filterSubject)) {
          return false;
        }
      }
      if (filterDifficulty !== "All") {
        if (!test.crops?.some((crop) => crop.difficulty === filterDifficulty)) {
          return false;
        }
      }
      const stats = testStats[test.id];
      if (minAttempts > 0 && (stats?.attempts ?? 0) < minAttempts) {
        return false;
      }
      if (maxWrongRate < 100 && (stats?.wrongRate ?? 0) > maxWrongRate) {
        return false;
      }
      if (maxAvgMinutes > 0 && (stats?.avgTime ?? 0) > maxAvgMinutes * 60) {
        return false;
      }
      if (lastAttemptDays > 0) {
        const last = stats?.lastAttemptAt;
        if (!last) {
          return false;
        }
        const windowMs = lastAttemptDays * 24 * 60 * 60 * 1000;
        if (Date.now() - last > windowMs) {
          return false;
        }
      }
      return true;
    });
  }, [
    tests,
    activeTab,
    starred,
    subjectParam,
    filterSubject,
    filterDifficulty,
    minAttempts,
    maxWrongRate,
    maxAvgMinutes,
    lastAttemptDays,
    testStats,
  ]);

  const searchedTests = useMemo(() => {
    if (!search.trim()) {
      return filteredTests;
    }
    return filteredTests
      .map((test) => ({
        test,
        score: fuzzyScore(
          [test.title, test.description ?? "", (test.tags ?? []).join(" ")].join(" "),
          search
        ),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.test);
  }, [filteredTests, search]);


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

  const missingAnswerCount = (test: Test) => {
    if (!test.crops?.length) return 0;
    return test.crops.filter((crop) => {
      if (crop.questionType === "NUM") {
        return !crop.correctNumeric || String(crop.correctNumeric).trim() === "";
      }
      if (crop.questionType === "MSQ") {
        const raw = crop.correctOption ?? "";
        return raw.trim() === "";
      }
      return !crop.correctOption || String(crop.correctOption).trim() === "";
    }).length;
  };

  const openEdit = (test: Test) => {
    setEditTest(test);
    setEditTitle(test.title ?? "");
    setEditDescription(test.description ?? "");
    setEditTags((test.tags ?? []).join(", "));
  };

  const saveEdit = async () => {
    if (!editTest) return;
    setSavingEdit(true);
    try {
      const response = await fetch("/api/tests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: editTest.id,
          title: editTitle.trim(),
          description: editDescription.trim(),
          tags: editTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) {
        alert("Update failed. Please try again.");
        return;
      }
      const updated = await response.json();
      setTests((prev) => prev.map((t) => (t.id == updated.id ? updated : t)));
      setEditTest(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = window.confirm(`Delete "${title}"? This cannot be undone.`);
    if (!confirmed) return;
    const response = await fetch(`/api/tests?testId=${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Delete failed. Please try again.");
      return;
    }
    setTests((prev) => prev.filter((test) => test.id !== id));
    setAttempts((prev) => prev.filter((attempt) => attempt.testId !== id));
  };

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white">
      <GlassRail />
      <BroadcastPopup />


      {editTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f0f10] p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit test details</h2>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
                onClick={() => setEditTest(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block text-xs text-white/60">Title</label>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <label className="block text-xs text-white/60">Description</label>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <label className="block text-xs text-white/60">Tags (comma separated)</label>
              <input
                value={editTags}
                onChange={(event) => setEditTags(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/70"
                onClick={() => setEditTest(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pt-24 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">CBTCORE</h1>
          </div>
          <div className="flex items-center gap-3">
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

          <div className="flex w-full flex-wrap items-center gap-3">
            <select
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value as typeof filterSubject)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white"
            >
              <option value="All">All Subjects</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Maths">Maths</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={(event) => setFilterDifficulty(event.target.value as typeof filterDifficulty)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white"
            >
              <option value="All">All Difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Tough">Tough</option>
            </select>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              <span className="text-white/60">Min attempts</span>
              <input
                type="number"
                min={0}
                value={minAttempts}
                onChange={(event) => setMinAttempts(Number(event.target.value || 0))}
                className="w-16 bg-transparent text-right text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              <span className="text-white/60">Max wrong %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={maxWrongRate}
                onChange={(event) => setMaxWrongRate(Math.min(100, Math.max(0, Number(event.target.value || 0))))}
                className="w-16 bg-transparent text-right text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              <span className="text-white/60">Max avg min</span>
              <input
                type="number"
                min={0}
                value={maxAvgMinutes}
                onChange={(event) => setMaxAvgMinutes(Number(event.target.value || 0))}
                className="w-16 bg-transparent text-right text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
              <span className="text-white/60">Last active (days)</span>
              <input
                type="number"
                min={0}
                value={lastAttemptDays}
                onChange={(event) => setLastAttemptDays(Number(event.target.value || 0))}
                className="w-16 bg-transparent text-right text-white outline-none"
              />
            </div>
          </div>
        </div>

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
                  const style = subjectStyles[subject] ?? subjectStyles.Physics;
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
                    <div
                      key={test.id}
                                            className={`rounded-xl border border-white/10 bg-white/5 p-4 ${style.border} ${style.glow}`}
                    >
                      

                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleStar(test.id)}
                            className={`text-xs ${starred.has(test.id) ? "text-white" : "text-white/30"}`}
                          >
                            *
                          </button>
                          <details className="relative">
                            <summary className="cursor-pointer list-none text-white/60 hover:text-white">
                              ...
                            </summary>
                            <div className="absolute right-0 top-6 z-10 w-36 rounded-xl border border-white/10 bg-[#111318] p-2 text-xs text-white/80 shadow-xl">
                              <a className="block rounded-lg px-2 py-1 hover:bg-white/10" href={`/test-created?testId=${test.id}`}>
                                Share
                              </a>
                              <a className="block rounded-lg px-2 py-1 hover:bg-white/10" href={`/test-analysis?testId=${test.id}`}>
                                View Analysis
                              </a>
                              {test.ownerId && currentUserId && test.ownerId === currentUserId && (
                                <a
                                  className="mt-1 block w-full rounded-lg px-2 py-1 text-left text-white/80 hover:bg-white/10"
                                  href={`/studio?testId=${test.id}`}
                                >
                                  Edit in Studio
                                </a>
                              )}
                              <a className="block rounded-lg px-2 py-1 hover:bg-white/10" href={`/cbt?testId=${test.id}`}>
                                Start
                              </a>
                              <a className="block rounded-lg px-2 py-1 hover:bg-white/10" href={`/cbt?testId=${test.id}&mode=adaptive`}>
                                Adaptive Practice
                              </a>
                              {test.ownerId && currentUserId && test.ownerId === currentUserId && (
                                <button
                                  onClick={() => handleDelete(test.id, test.title)}
                                  className="mt-1 block w-full rounded-lg px-2 py-1 text-left text-red-300 hover:bg-red-500/10"
                                  type="button"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </details>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">{test.title}</h3>
                        <p className="mt-2 text-xs text-white/60">{statusLabel}</p>
                        {test.ownerId && currentUserId && test.ownerId === currentUserId && missingAnswerCount(test) > 0 && (
                          <p className="mt-2 text-xs text-amber-300">
                            Answer key missing: {missingAnswerCount(test)} questions.
                            <a className="underline" href={`/answer-key?testId=${test.id}`}>
                              Add answers
                            </a>
                          </p>
                        )}

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
                          <span className="flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M4 12h16" />
                              <path d="M12 4v16" />
                            </svg>
                            Marking: +{test.markingCorrect ?? 4} / {test.markingIncorrect ?? -1}
                          </span>
                          <span>Global attempts: {formatCount(attemptsCount)}</span>
                        </div>
                        <a
                          className="mt-6 inline-flex rounded-md border border-white/20 px-3 py-2 text-xs text-white/80"
                          href={
                            isCompleted ? `/test-analysis?testId=${test.id}` : `/cbt?testId=${test.id}`
                          }
                        >
                          {isCompleted ? "View Insights" : "Enter Arena"}
                        </a>
                      </div>
                    </div>
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
      </div>
    </div>
  );
}
