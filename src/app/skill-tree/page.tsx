"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import GlassRail from "@/components/GlassRail";

type Crop = {
  id: string;
  subject: "Physics" | "Chemistry" | "Maths";
  questionType?: "MCQ" | "MSQ" | "NUM";
  correctOption: "A" | "B" | "C" | "D";
  correctOptions?: Array<"A" | "B" | "C" | "D">;
  correctNumeric?: string;
};

type Test = {
  id: string;
  title: string;
  crops: Crop[];
};

type Attempt = {
  id: string;
  testId: string;
  answers: Record<string, string>;
};

const SUBJECTS: Array<Crop["subject"]> = ["Physics", "Chemistry", "Maths"];

const isCorrectAnswer = (crop: Crop, selected?: string) => {
  if (!selected) return false;
  if (crop.questionType === "NUM") {
    const normalized = selected.trim();
    return normalized !== "" && normalized === (crop.correctNumeric ?? "").trim();
  }
  if (crop.questionType === "MSQ") {
    const expected = (crop.correctOptions ?? []).slice().sort().join(",");
    const got = selected
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(",");
    return got !== "" && got === expected;
  }
  return selected === crop.correctOption;
};

export default function SkillTreePage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/session");
      const data = await response.json();
      if (!data?.user) {
        router.push("/login");
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      const testsResponse = await fetch("/api/tests");
      const testsData = await testsResponse.json();
      setTests(Array.isArray(testsData) ? testsData : []);

      const attemptsResponse = await fetch("/api/attempts");
      const attemptsData = await attemptsResponse.json();
      setAttempts(Array.isArray(attemptsData) ? attemptsData : []);
    };
    load();
  }, []);

  const testMap = useMemo(() => {
    return tests.reduce((acc, test) => {
      acc[test.id] = test;
      return acc;
    }, {} as Record<string, Test>);
  }, [tests]);

  const subjectStats = useMemo(() => {
    const stats = SUBJECTS.reduce(
      (acc, subject) => {
        acc[subject] = { attempted: 0, correct: 0 };
        return acc;
      },
      {} as Record<Crop["subject"], { attempted: number; correct: number }>
    );

    attempts.forEach((attempt) => {
      const test = testMap[attempt.testId];
      if (!test) return;
      test.crops.forEach((crop) => {
        const selected = attempt.answers[crop.id];
        if (!selected) return;
        stats[crop.subject].attempted += 1;
        if (isCorrectAnswer(crop, selected)) {
          stats[crop.subject].correct += 1;
        }
      });
    });

    return stats;
  }, [attempts, testMap]);

  const nodes = useMemo(() => {
    return SUBJECTS.map((subject) => {
      const data = subjectStats[subject];
      const accuracy = data.attempted
        ? Math.round((data.correct / data.attempted) * 100)
        : 0;
      return {
        subject,
        accuracy,
        attempted: data.attempted,
      };
    });
  }, [subjectStats]);

  const weakest = useMemo(() => {
    const withAttempts = nodes.filter((node) => node.attempted > 0);
    if (withAttempts.length === 0) return null;
    return withAttempts.sort((a, b) => a.accuracy - b.accuracy)[0];
  }, [nodes]);

  if (!authChecked) {
    return <div className="min-h-screen bg-[#0F0F10]" />;
  }

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white">
      <GlassRail />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-20 pt-24 md:px-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skill Tree</p>
            <h1 className="mt-3 text-3xl font-semibold">Mastery Constellation</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Accuracy-driven mastery nodes built from your attempts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-card relative col-span-3 min-h-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.2),_transparent_60%)]" />
            <div className="relative grid h-full w-full place-items-center">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {nodes.map((node) => (
                  <div
                    key={node.subject}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-6 py-5 text-center"
                  >
                    <div className="text-sm text-slate-300">{node.subject}</div>
                    <div className="text-3xl font-semibold">{node.accuracy}%</div>
                    <div className="text-xs text-slate-400">
                      {node.attempted} attempted
                    </div>
                  </div>
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
            <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Knowledge Gap</p>
            {weakest ? (
              <>
                <h2 className="mt-4 text-xl font-semibold">{weakest.subject}</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Accuracy {weakest.accuracy}% across {weakest.attempted} attempted questions.
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-4 text-xl font-semibold">No attempts yet</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Attempt a test to unlock your weakest topic.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

