"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type UserAnalysis = {
  summary: {
    attempts: number;
    totalQuestions: number;
    attempted: number;
    correct: number;
    wrong: number;
    skipped: number;
    scoreSum: number;
    avgScore: number;
    accuracy: number;
    attemptRate: number;
    negativeMarks: number;
    percentile: number | null;
    rank: number | null;
    peerCount: number;
  };
  time: {
    bySubject: { subject: string; time: number }[];
    slowest: { id: string; avgTime: number; label: string }[];
    fastest: { id: string; avgTime: number; label: string }[];
    wastedOnWrong: number;
    fatigue: number[];
  };
  topics: {
    list: { topic: string; subject: string; attempted: number; correct: number; accuracy: number }[];
    strongest: { topic: string; subject: string; attempted: number; correct: number; accuracy: number } | null;
    weakest: { topic: string; subject: string; attempted: number; correct: number; accuracy: number } | null;
  };
  trend: { date: string; score: number; accuracy: number; timeTaken: number; label?: string }[];
  activity?: { date: string; count: number }[];
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
  const [userRange, setUserRange] = useState("30d");
  const [userAnalysis, setUserAnalysis] = useState<UserAnalysis | null>(null);
  const [userLoading, setUserLoading] = useState(false);

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
    setUserLoading(true);
    fetch(`/api/pyq/user-analysis?examId=${encodeURIComponent(selectedExamId)}&range=${userRange}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setUserAnalysis(data);
      })
      .catch(() => null)
      .finally(() => {
        if (active) setUserLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedExamId, userRange]);

  const examCards = examItems.length ? examItems : fallbackExams;
  const scoreTrend = useMemo(() => {
    return (userAnalysis?.trend ?? []).map((item, index) => ({
      name: item.label ?? `T${index + 1}`,
      score: item.score,
      accuracy: item.accuracy,
    }));
  }, [userAnalysis]);

  const subjectTimeData = useMemo(
    () =>
      (userAnalysis?.time.bySubject ?? []).map((item) => ({
        subject: item.subject,
        minutes: Math.round(item.time / 60),
      })),
    [userAnalysis]
  );

  const topicAccuracyData = useMemo(
    () =>
      (userAnalysis?.topics.list ?? [])
        .slice(0, 8)
        .map((item) => ({
          topic: item.topic,
          accuracy: item.accuracy,
        })),
    [userAnalysis]
  );

  const stackedAccuracy = useMemo(() => {
    if (!userAnalysis) return [];
    return [
      {
        name: "Total",
        correct: userAnalysis.summary.correct,
        wrong: userAnalysis.summary.wrong,
        skipped: userAnalysis.summary.skipped,
      },
    ];
  }, [userAnalysis]);

  const radarData = useMemo(() => {
    return (userAnalysis?.topics.list ?? []).slice(0, 6).map((item) => ({
      topic: item.topic,
      accuracy: item.accuracy,
    }));
  }, [userAnalysis]);

  const radialData = useMemo(() => {
    return [
      {
        name: "Accuracy",
        value: userAnalysis?.summary.accuracy ?? 0,
        fill: "#b28bff",
      },
    ];
  }, [userAnalysis]);

  const activityMap = useMemo(() => {
    const map = new Map<string, number>();
    (userAnalysis?.activity ?? []).forEach((item) => {
      map.set(item.date, item.count);
    });
    return map;
  }, [userAnalysis]);

  const activityDays = useMemo(() => {
    const days = 56;
    const out: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ date: key, count: activityMap.get(key) ?? 0 });
    }
    return out;
  }, [activityMap]);

  return (
    <div className="min-h-screen bg-[#222830] text-white font-neue">
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
                className={`group relative flex h-[86px] items-center justify-between rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)] ${
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

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3">
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
          <div className="rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Questions</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.questions)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Chapters</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.chapters)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Exams Covered</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatCount(stats.exams)}</p>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-[#222830] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Latest Year</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {stats.latestYear ? stats.latestYear : "-"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[6px] border border-white/10 bg-[#222830] px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Your PYQ Analytics</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Personal Performance Lens</h2>
              <p className="mt-1 text-sm text-white/60">
                Exam-specific stats from your attempts in the selected range.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <select
                value={userRange}
                onChange={(event) => setUserRange(event.target.value)}
                className="rounded-md border border-white/10 bg-[#0f141d] px-3 py-2 text-sm text-white"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {userLoading ? (
            <div className="mt-6 rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4 text-sm text-white/60 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
              Loading your analytics...
            </div>
          ) : userAnalysis ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Score Trend</p>
                  <div className="mt-3 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                        <Line type="monotone" dataKey="score" stroke="#6aa8ff" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Accuracy Trend</p>
                  <div className="mt-3 h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreTrend}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9aa4b2", fontSize: 10 }} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                        <Area type="monotone" dataKey="accuracy" stroke="#8be9fd" fill="rgba(139,233,253,0.2)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Score Avg</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.avgScore}</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Accuracy</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.accuracy}%</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Attempt Rate</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.attemptRate}%</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Attempts</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.attempts}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Correct</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.correct}</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Wrong</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.wrong}</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Skipped</p>
                  <p className="mt-2 text-lg font-semibold text-white">{userAnalysis.summary.skipped}</p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Negative Marks</p>
                  <p className="mt-2 text-lg font-semibold text-white">-{userAnalysis.summary.negativeMarks}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Percentile / Rank</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {userAnalysis.summary.percentile ?? "--"}%
                  </p>
                  <p className="text-xs text-white/60">
                    Rank {userAnalysis.summary.rank ?? "--"} / {userAnalysis.summary.peerCount}
                  </p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Time Wasted (Wrong)</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {Math.round(userAnalysis.time.wastedOnWrong / 60)} min
                  </p>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Fatigue (Q1-Q4)</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
                    {userAnalysis.time.fatigue.map((value, index) => (
                      <span key={`fat-${index}`} className="rounded-full border border-white/10 px-2 py-1">
                        {value}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Time by Subject</p>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectTimeData} layout="vertical">
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <YAxis dataKey="subject" type="category" tick={{ fill: "#9aa4b2", fontSize: 10 }} width={80} />
                        <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                        <Bar dataKey="minutes" fill="#b28bff" radius={[6, 6, 6, 6]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Strong / Weak Topics</p>
                  <div className="mt-3 space-y-3 text-xs text-white/70">
                    <div>
                      <p className="text-white/60">Strongest</p>
                      <p className="text-sm text-white">
                        {userAnalysis.topics.strongest?.topic ?? "--"} ({userAnalysis.topics.strongest?.accuracy ?? 0}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Weakest</p>
                      <p className="text-sm text-white">
                        {userAnalysis.topics.weakest?.topic ?? "--"} ({userAnalysis.topics.weakest?.accuracy ?? 0}%)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Accuracy Ring</p>
                  <div className="mt-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" cornerRadius={10} />
                        <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Correct / Wrong / Skipped</p>
                  <div className="mt-3 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedAccuracy}>
                        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                        <Bar dataKey="correct" stackId="a" fill="#8be9fd" />
                        <Bar dataKey="wrong" stackId="a" fill="#ff9bb3" />
                        <Bar dataKey="skipped" stackId="a" fill="#9aa4b2" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4 transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-[#2c333d] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(155,123,255,0.25)]">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Topic Radar</p>
                <div className="mt-3 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="topic" tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#9aa4b2", fontSize: 10 }} />
                      <Radar dataKey="accuracy" stroke="#b28bff" fill="rgba(178,139,255,0.35)" />
                      <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Slowest Questions</p>
                  <div className="mt-3 space-y-2 text-xs text-white/70">
                    {userAnalysis.time.slowest.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        <span>{item.avgTime}s</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Fastest Questions</p>
                  <div className="mt-3 space-y-2 text-xs text-white/70">
                    {userAnalysis.time.fastest.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        <span>{item.avgTime}s</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

                <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Topic Accuracy</p>
                <div className="mt-3 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicAccuracyData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="topic" tick={{ fill: "#9aa4b2", fontSize: 9 }} interval={0} angle={-20} height={50} />
                      <YAxis tick={{ fill: "#9aa4b2", fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip contentStyle={{ background: "#0f141d", border: "1px solid #1f2937", color: "#fff" }} />
                      <Bar dataKey="accuracy" fill="#9b7bff" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Practice Heatmap (8 weeks)</p>
                <div className="mt-3 grid grid-cols-8 gap-2">
                  {activityDays.map((item) => {
                    const intensity = Math.min(4, item.count);
                    const colors = ["#121722", "#c9b7ff", "#b28bff", "#9b7bff", "#815bff"];
                    return (
                      <div
                        key={item.date}
                        title={`${item.date}: ${item.count}`}
                        className="h-6 w-full rounded"
                        style={{ background: colors[intensity] }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[6px] border border-white/10 bg-[#222830] px-4 py-4 text-sm text-white/60">
              No attempts yet for this exam.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
