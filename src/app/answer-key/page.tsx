"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import GlassRail from "@/components/GlassRail";
import { safeJson } from "@/lib/safe-json";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption?: string;
  correctOptions?: string[];
  correctNumeric?: string;
};

type Test = {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  crops: Crop[];
};

const normalizeAnswer = (raw: string) => raw.trim().toUpperCase();

export default function AnswerKeyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const testId = searchParams.get("testId") ?? "";
  const attemptId = searchParams.get("attemptId") ?? "";

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!testId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/tests?testId=${testId}`);
      const data = await safeJson<Test | null>(response, null);
      if (!cancelled) {
        setTest(data);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const orderedCrops = useMemo(() => {
    if (!test) return [];
    return test.crops.map((crop, index) => ({
      ...crop,
      index: index + 1,
    }));
  }, [test]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof orderedCrops> = {};
    orderedCrops.forEach((crop) => {
      const key = crop.subject;
      if (!groups[key]) groups[key] = [];
      groups[key].push(crop);
    });
    return groups;
  }, [orderedCrops]);

  const missingBySubject = useMemo(() => {
    const isMissing = (crop: Crop) => {
      if (crop.questionType === "NUM") {
        return !(crop.correctNumeric ?? "").trim();
      }
      const raw = crop.correctOption ?? "";
      return raw.trim().length === 0;
    };
    const entries: Record<string, typeof orderedCrops> = {};
    Object.entries(grouped).forEach(([subject, crops]) => {
      const missing = crops.filter((crop) => isMissing(crop));
      if (missing.length) {
        entries[subject] = missing;
      }
    });
    return entries;
  }, [grouped]);

  const missingCount = useMemo(
    () => Object.values(missingBySubject).reduce((acc, crops) => acc + crops.length, 0),
    [missingBySubject]
  );

  const applyAnswerKey = async () => {
    if (!test) return;
    const entries = orderedCrops
      .map((crop) => ({
        index: crop.index,
        value: answers[crop.id] ?? "",
      }))
      .filter((entry) => entry.value.trim().length > 0);

    if (entries.length === 0) {
      setStatus("Enter at least one answer.");
      return;
    }

    setStatus("Saving answer key...");
    const response = await fetch("/api/tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: test.id, entries }),
    });
    const updated = await safeJson<{ id?: string; error?: string } | null>(response, null);
    if (!response.ok || !updated?.id) {
      setStatus(updated?.error ?? "Failed to update answer key.");
      return;
    }
    const qs = new URLSearchParams({ testId: test.id });
    if (attemptId) qs.set("attemptId", attemptId);
    router.push(`/test-analysis?${qs.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white">
        <GlassRail />
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 pt-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Loading answer key setup...
          </div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-[#0b0f1a] text-white">
        <GlassRail />
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 pt-24">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Test not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      <GlassRail />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 pt-24 pb-16">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Answer Key</p>
          <h1 className="text-3xl font-semibold">{test.title}</h1>
          <p className="text-sm text-white/60">
            Add answers now to generate accurate analysis. You can skip and add later.
          </p>
        </header>

        {missingCount === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            All answers are already filled for this test.
          </div>
        )}

        {Object.entries(missingBySubject).map(([subject, crops], groupIndex) => (
          <section
            key={subject}
            className="rounded-3xl border border-white/10 bg-[#0f172a] p-6 shadow-[0_20px_40px_rgba(5,10,20,0.5)]"
          >
            <div className="text-center">
              <p className="text-2xl font-semibold">{subject}</p>
              <p className="mt-1 text-sm text-white/60">Section {groupIndex + 1}</p>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[110px_120px_1fr_140px] bg-white/5 text-xs uppercase tracking-[0.2em] text-white/70">
                <div className="px-4 py-3">Q. No</div>
                <div className="px-4 py-3">Q. Type</div>
                <div className="px-4 py-3">Input Answer</div>
                <div className="px-4 py-3">Parsed</div>
              </div>
              {crops.map((crop) => {
                const inputValue = answers[crop.id] ?? "";
                const parsed = inputValue ? normalizeAnswer(inputValue) : "";
                return (
                  <div
                    key={crop.id}
                    className="grid grid-cols-[110px_120px_1fr_140px] border-t border-white/10 text-sm"
                  >
                    <div className="px-4 py-3 text-white/80">Q{crop.index}</div>
                    <div className="px-4 py-3 text-white/70">
                      {crop.questionType ?? "MCQ"}
                    </div>
                    <div className="px-4 py-2">
                      <input
                        value={inputValue}
                        onChange={(event) =>
                          setAnswers((prev) => ({ ...prev, [crop.id]: event.target.value }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-white"
                        placeholder={crop.questionType === "NUM" ? "e.g. 2.5" : "A / B,C"}
                      />
                    </div>
                    <div className="px-4 py-3 text-right font-semibold text-emerald-200">
                      {parsed || "--"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {status && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
            {status}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-white"
            onClick={applyAnswerKey}
            disabled={missingCount === 0}
          >
            Generate Answer Key
          </button>
          <button
            className="rounded-full border border-white/10 px-5 py-3 text-sm text-white/70"
            onClick={() => {
              const qs = new URLSearchParams({ testId: test.id });
              if (attemptId) qs.set("attemptId", attemptId);
              router.push(`/test-analysis?${qs.toString()}`);
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
