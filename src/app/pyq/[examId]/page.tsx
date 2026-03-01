"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

const subjectBadges: Record<string, { label: string; accent: string; chip: string }> = {
  Physics: { label: "Physics", accent: "bg-amber-500", chip: "bg-amber-500/20 text-amber-200" },
  Chemistry: { label: "Chemistry", accent: "bg-emerald-500", chip: "bg-emerald-500/20 text-emerald-200" },
  Mathematics: { label: "Mathematics", accent: "bg-blue-500", chip: "bg-blue-500/20 text-blue-200" },
  Maths: { label: "Maths", accent: "bg-blue-500", chip: "bg-blue-500/20 text-blue-200" },
};

const fallbackSubjects = ["Physics", "Chemistry", "Mathematics"];

type ChapterRow = {
  name: string;
  total: number;
  byYear: Record<number, number>;
};

type SubjectRow = {
  name: string;
  total: number;
  chapters: ChapterRow[];
};

type ApiPayload = {
  exam: { id: string; name: string; shortCode?: string | null };
  summary: { papers: number; questions: number; yearMin: number | null; yearMax: number | null };
  years: number[];
  latestYears: number[];
  subjects: SubjectRow[];
};

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function PyqExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [activeSubject, setActiveSubject] = useState<string>("");

  useEffect(() => {
    let active = true;
    fetch(`/api/pyq/exams/${examId}/chapters`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setData(payload);
        if (payload.subjects.length) {
          setActiveSubject(payload.subjects[0].name);
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [examId]);

  const subjects = data?.subjects.length ? data.subjects : fallbackSubjects.map((name) => ({ name, total: 0, chapters: [] }));
  const currentSubject = subjects.find((subject) => subject.name === activeSubject) ?? subjects[0];

  const latestYears = data?.latestYears?.length ? data.latestYears : [];

  const summaryLine = useMemo(() => {
    if (!data) return "";
    const yearRange = data.summary.yearMax && data.summary.yearMin ? `${data.summary.yearMax} - ${data.summary.yearMin}` : "—";
    const papers = data.summary.papers ? `${formatCount(data.summary.papers)} Papers` : "0 Papers";
    const questions = data.summary.questions ? `${formatCount(data.summary.questions)} Qs` : "0 Qs";
    return `${yearRange} · ${papers} · ${questions}`;
  }, [data]);

  return (
    <div className="min-h-screen bg-[#222830] text-white font-neue">
      <div className="mx-auto w-full max-w-[1280px] px-6 pb-12 pt-6">
        <div className="mb-6 flex items-center gap-3 text-sm text-white/60">
          <Link className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:border-white/30" href="/pyq">
            ← Back
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white/80">{data?.exam.name ?? "Exam"}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-[6px] border border-white/10 bg-[#171c24] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                  {(data?.exam.shortCode ?? data?.exam.name?.slice(0, 2) ?? "EX").toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">{data?.exam.name ?? "Exam"}</p>
                  <p className="text-xs text-white/60">{summaryLine || "Loading..."}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {subjects.map((subject) => {
                const meta = subjectBadges[subject.name] ?? {
                  label: subject.name,
                  accent: "bg-slate-500",
                  chip: "bg-slate-500/20 text-slate-200",
                };
                const active = subject.name === currentSubject?.name;
                return (
                  <button
                    key={subject.name}
                    className={`flex w-full items-center justify-between rounded-[6px] border px-4 py-3 text-left transition ${
                      active
                        ? "border-white/30 bg-white text-[#0f1218]"
                        : "border-white/10 bg-[#171c24] text-white hover:border-white/30"
                    }`}
                    onClick={() => setActiveSubject(subject.name)}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold ${active ? "bg-[#0f1218] text-white" : meta.chip}`}>
                        {meta.label.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold">{meta.label}</span>
                    </span>
                    <span className={`text-xs ${active ? "text-[#0f1218]" : "text-white/50"}`}>
                      {subject.total ? formatCount(subject.total) : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-[6px] border border-white/10 bg-[#171c24] px-6 py-4">
              <p className="text-sm text-white/60">{currentSubject?.name ?? "Subject"} PYQs</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">
                Chapter-wise Collection of {currentSubject?.name ?? "Subject"} PYQs
              </h1>
            </div>

            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Showing all chapters ({currentSubject?.chapters?.length ?? 0})</span>
              <button className="text-xs uppercase tracking-[0.2em] text-[#6aa8ff]">Sort</button>
            </div>

            <div className="space-y-3">
              {(currentSubject?.chapters?.length ? currentSubject.chapters : []).map((chapter) => {
                const recentBits = latestYears
                  .map((year) => ({
                    year,
                    count: chapter.byYear?.[year] ?? 0,
                  }))
                  .filter((entry) => entry.count > 0);

                return (
                  <Link
                    key={chapter.name}
                    href={`/pyq/${examId}/questions?subject=${encodeURIComponent(currentSubject?.name ?? "")}&chapter=${encodeURIComponent(chapter.name)}`}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[6px] border border-white/10 bg-[#171c24] px-5 py-4 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white/70">
                        {chapter.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{chapter.name}</p>
                        <p className="text-xs text-white/50">Total {formatCount(chapter.total)} questions</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                      {recentBits.length ? (
                        recentBits.map((entry) => (
                          <span key={entry.year} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {entry.year}: {entry.count} Qs
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">No recent data</span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {!currentSubject?.chapters?.length && (
                <div className="rounded-[6px] border border-white/10 bg-[#171c24] px-5 py-6 text-sm text-white/60">
                  No chapters found yet for this subject.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
