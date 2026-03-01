"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type ExamItem = { id: string; name: string; shortCode?: string | null };

type Paper = {
  id: string;
  year: number;
  shift?: string | null;
  pdfUrl: string;
  exam?: { id?: string; name: string } | null;
  test?: { id: string; title: string } | null;
};

type ExamGroup = {
  examId: string;
  examName: string;
  papers: Paper[];
};

const logoTints = [
  "from-emerald-400/80 to-emerald-200/80",
  "from-blue-400/80 to-blue-200/80",
  "from-orange-400/80 to-orange-200/80",
  "from-violet-400/80 to-violet-200/80",
  "from-sky-400/80 to-sky-200/80",
  "from-rose-400/80 to-rose-200/80",
];

export default function PyqPapersPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filters, setFilters] = useState({
    examId: "",
    year: "",
    shift: "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/pyq/exams")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        setExams(Array.isArray(data) ? data : []);
      })
      .catch(() => null);

    fetch("/api/pyq/papers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return;
        setPapers(Array.isArray(data) ? data : []);
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    papers.forEach((p) => set.add(p.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [papers]);

  const filtered = useMemo(() => {
    return papers.filter((paper) => {
      if (filters.examId && paper.exam?.id !== filters.examId) return false;
      if (filters.year && String(paper.year) !== filters.year) return false;
      if (filters.shift && (paper.shift ?? "") !== filters.shift) return false;
      return true;
    });
  }, [papers, filters]);

  const grouped = useMemo<ExamGroup[]>(() => {
    const map = new Map<string, ExamGroup>();
    filtered.forEach((paper) => {
      const examId = paper.exam?.id ?? "unknown";
      const examName = paper.exam?.name ?? "Exam";
      if (!map.has(examId)) {
        map.set(examId, { examId, examName, papers: [] });
      }
      map.get(examId)!.papers.push(paper);
    });
    return Array.from(map.values()).map((group) => ({
      ...group,
      papers: group.papers.sort((a, b) => b.year - a.year),
    }));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#222830] text-white font-neue">
      <div className="mx-auto w-full max-w-[1240px] px-6 pb-10 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">PYQ Bank</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight font-everett">
              Year-wise Question Papers
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Exam-wise year cards. Open the PDF or jump into the attached CBT test.
            </p>
          </div>
          <Link
            className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100"
            href="/pyq"
          >
            Back to PYQ Bank
          </Link>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <select
            value={filters.examId}
            onChange={(e) => setFilters((prev) => ({ ...prev, examId: e.target.value }))}
            className="rounded-[4px] border border-white/10 bg-[#171c24] px-3 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            <option value="">All Exams</option>
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
          <select
            value={filters.year}
            onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
            className="rounded-[4px] border border-white/10 bg-[#171c24] px-3 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={filters.shift}
            onChange={(e) => setFilters((prev) => ({ ...prev, shift: e.target.value }))}
            className="rounded-[4px] border border-white/10 bg-[#171c24] px-3 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          >
            <option value="">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Shift 1">Shift 1</option>
            <option value="Shift 2">Shift 2</option>
            <option value="Shift 3">Shift 3</option>
          </select>
        </div>

        <div className="mt-6 space-y-6">
          {grouped.length === 0 ? (
            <div className="rounded-[4px] border border-white/10 bg-[#171c24] px-4 py-6 text-sm text-white/60">
              No papers match the filters yet.
            </div>
          ) : (
            grouped.map((group, index) => {
              const tint = logoTints[index % logoTints.length];
              return (
                <div key={group.examId} className="rounded-[4px] border border-white/10 bg-[#161b22] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${tint} text-xs font-bold text-[#0f1218]`}>
                        {group.examName.split(" ")[0].slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{group.examName}</div>
                        <div className="text-xs text-white/60">{group.papers.length} papers</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {group.papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="flex flex-col justify-between rounded-[4px] border border-white/10 bg-[#171c24] px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-[#2a3038] hover:shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      >
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-white/50">{paper.year}</div>
                          <div className="mt-2 text-sm font-semibold">
                            {paper.shift ? paper.shift : "Full Paper"}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                          {paper.test?.id ? (
                            <a
                              className="rounded-full border border-cyan-300/25 bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-100"
                              href={`/cbt?testId=${paper.test.id}`}
                            >
                              Open Test
                            </a>
                          ) : null}
                          <a
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80"
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
