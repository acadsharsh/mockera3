"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const fallbackExams = [
  { name: "JEE Main", badge: "2026 QS ADDED" },
  { name: "NTA Abhyas (JEE Main)" },
  { name: "BITSAT" },
  { name: "IAT (IISER)" },
  { name: "VITEEE" },
  { name: "AP EAMCET" },
  { name: "JEE Advanced" },
  { name: "MHT CET" },
  { name: "NDA" },
  { name: "WBJEE" },
  { name: "TS EAMCET" },
  { name: "COMEDK" },
  { name: "KCET" },
  { name: "MET" },
  { name: "KVPY" },
];

const logoTints = [
  "from-emerald-400/80 to-emerald-200/80",
  "from-blue-400/80 to-blue-200/80",
  "from-orange-400/80 to-orange-200/80",
  "from-violet-400/80 to-violet-200/80",
  "from-sky-400/80 to-sky-200/80",
  "from-rose-400/80 to-rose-200/80",
];

type PyqStats = {
  questions: number;
  chapters: number;
  exams: number;
  latestYear: number | null;
};

type ExamItem = {
  id: string;
  name: string;
  shortCode?: string | null;
};

type AnalysisDistribution = {
  key: string;
  count: number;
};

type AnalysisYear = {
  year: number;
  count: number;
};

type AnalysisShift = {
  shift: string;
  count: number;
};

type PyqAnalysis = {
  exam: { id: string; name: string };
  totals: {
    questions: number;
    chapters: number;
    topics: number;
    papers: number;
    avgQuestionsPerPaper: number;
  };
  coverage: {
    chapterTagged: number;
    topicTagged: number;
  };
  distribution: {
    subjects: AnalysisDistribution[];
    difficulty: AnalysisDistribution[];
    types: AnalysisDistribution[];
    years: AnalysisYear[];
    shifts: AnalysisShift[];
  };
  years: {
    earliest: number | null;
    latest: number | null;
    span: number;
  };
};

const fallbackStats: PyqStats = {
  questions: 0,
  chapters: 0,
  exams: 0,
  latestYear: null,
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function PyqPage() {
  const [stats, setStats] = useState<PyqStats>(fallbackStats);
  const [examItems, setExamItems] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [analysis, setAnalysis] = useState<PyqAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/pyq/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setStats({
            questions: Number(data.questions) || 0,
            chapters: Number(data.chapters) || 0,
            exams: Number(data.exams) || 0,
            latestYear: data.latestYear ? Number(data.latestYear) : null,
          });
        }
      })
      .catch(() => null);

    fetch("/api/pyq/exams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setExamItems(data);
          if (!selectedExamId && data.length) {
            setSelectedExamId(data[0].id);
          }
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedExamId) return;
    let active = true;
    setAnalysisLoading(true);
    fetch(`/api/pyq/analysis?examId=${encodeURIComponent(selectedExamId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setAnalysis(data);
      })
      .catch(() => null)
      .finally(() => {
        if (active) setAnalysisLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedExamId]);

  const examCards = examItems.length ? examItems : fallbackExams;
  const totalFor = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  const topWithOther = (items: AnalysisDistribution[], limit: number) => {
    if (items.length <= limit) return items;
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const top = sorted.slice(0, limit);
    const other = sorted.slice(limit).reduce((sum, item) => sum + item.count, 0);
    return other > 0 ? [...top, { key: "Other", count: other }] : top;
  };

  return (
    <div className="min-h-screen bg-[#0f1218] text-white font-neue">
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">PYQ Bank</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight font-everett">
              Chapter wise PYQ Bank
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Select your target exam and start practicing chapter-wise previous year questions.
            </p>
          </div>
          <Link
            className="text-sm font-semibold uppercase tracking-wider text-[#6aa8ff] hover:text-white"
            href="/pyq/papers"
          >
            View All
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {examCards.map((exam, index) => {
            const tint = logoTints[index % logoTints.length];
            const showBadge = (exam as any).badge ?? (!examItems.length && index === 0 ? "2026 QS ADDED" : null);
            const examId = (exam as ExamItem).id;
            return (
              <Link
                key={exam.name}
                href={examId ? `/pyq/${examId}` : "#"}
                className={`group relative flex h-[86px] items-center justify-between rounded-[4px] border border-white/10 bg-[#171c24] px-4 py-3 transition-all duration-150 hover:border-white/30 hover:bg-[#1a2030] ${
                  examId ? "" : "pointer-events-none opacity-60"
                }`}
              >
                <div className="pr-2">
                  <p className="text-sm font-semibold text-white">{exam.name}</p>
                  {showBadge ? (
                    <span className="mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#ff7b7b]">
                      {showBadge}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${tint} text-xs font-bold text-[#0f1218]`}
                >
                  {exam.name.split(" ")[0].slice(0, 2).toUpperCase()}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-white/10 bg-[#161b22] px-4 py-3">
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">Live PYQ Inventory</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/80">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{formatCount(stats.questions)} questions</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{formatCount(stats.chapters)} chapters</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{formatCount(stats.exams)} exams</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Latest {stats.latestYear ? stats.latestYear : "-"}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
              href="/pyq/papers"
            >
              Year-wise papers
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[4px] border border-white/10 bg-[#161b22] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Questions</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.questions)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#161b22] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Chapters</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.chapters)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#161b22] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Exams Covered</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.exams)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#161b22] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Latest Year</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {stats.latestYear ? stats.latestYear : "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[6px] border border-white/10 bg-[#161b22] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">PYQ Deep Analysis</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Exam Intelligence Console
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Select exam to see coverage, difficulty mix, and year/shift trends.
              </p>
            </div>
            <select
              value={selectedExamId}
              onChange={(event) => setSelectedExamId(event.target.value)}
              className="rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-sm text-white"
            >
              <option value="" disabled>
                Select exam
              </option>
              {examItems.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {analysisLoading ? (
            <div className="mt-6 rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4 text-sm text-white/60">
              Loading analysis...
            </div>
          ) : analysis ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Questions</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCount(analysis.totals.questions)}
                    </p>
                  </div>
                  <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Chapters</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCount(analysis.totals.chapters)}
                    </p>
                  </div>
                  <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Topics</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCount(analysis.totals.topics)}
                    </p>
                  </div>
                  <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Papers</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {formatCount(analysis.totals.papers)}
                    </p>
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Coverage Health</p>
                  <div className="mt-3 space-y-3 text-sm text-white/70">
                    <div className="flex items-center justify-between">
                      <span>Chapter tagged</span>
                      <span>{totalFor(analysis.coverage.chapterTagged, analysis.totals.questions)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div
                        className="h-2 rounded-full bg-[#6aa8ff]"
                        style={{ width: `${totalFor(analysis.coverage.chapterTagged, analysis.totals.questions)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Topic tagged</span>
                      <span>{totalFor(analysis.coverage.topicTagged, analysis.totals.questions)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div
                        className="h-2 rounded-full bg-[#8be9fd]"
                        style={{ width: `${totalFor(analysis.coverage.topicTagged, analysis.totals.questions)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Year Coverage</p>
                  <div className="mt-2 text-sm text-white/70">
                    {analysis.years.earliest ? (
                      <>
                        {analysis.years.earliest} - {analysis.years.latest} ({analysis.years.span} yrs)
                      </>
                    ) : (
                      "No year data"
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {analysis.distribution.years.map((item) => (
                      <div key={item.year} className="flex items-center gap-3 text-xs text-white/70">
                        <span className="w-12">{item.year}</span>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-white/30"
                            style={{ width: `${totalFor(item.count, analysis.totals.questions)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Subject Balance</p>
                  <div className="mt-3 space-y-2">
                    {topWithOther(analysis.distribution.subjects, 5).map((item) => (
                      <div key={item.key} className="flex items-center gap-3 text-xs text-white/70">
                        <span className="w-20 truncate">{item.key}</span>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-emerald-400/70"
                            style={{ width: `${totalFor(item.count, analysis.totals.questions)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Difficulty Mix</p>
                  <div className="mt-3 space-y-2">
                    {analysis.distribution.difficulty.map((item) => (
                      <div key={item.key} className="flex items-center gap-3 text-xs text-white/70">
                        <span className="w-20">{item.key}</span>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-orange-300/70"
                            style={{ width: `${totalFor(item.count, analysis.totals.questions)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Question Types</p>
                  <div className="mt-3 space-y-2">
                    {analysis.distribution.types.map((item) => (
                      <div key={item.key} className="flex items-center gap-3 text-xs text-white/70">
                        <span className="w-20">{item.key}</span>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-purple-400/70"
                            style={{ width: `${totalFor(item.count, analysis.totals.questions)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Shift Heat</p>
                  <div className="mt-3 space-y-2">
                    {analysis.distribution.shifts.map((item) => (
                      <div key={item.shift} className="flex items-center gap-3 text-xs text-white/70">
                        <span className="w-24 truncate">{item.shift}</span>
                        <div className="h-2 flex-1 rounded-full bg-white/5">
                          <div
                            className="h-2 rounded-full bg-sky-400/70"
                            style={{ width: `${totalFor(item.count, analysis.totals.questions)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[6px] border border-white/10 bg-[#10141d] px-4 py-4 text-sm text-white/60">
              Select an exam to see detailed analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
