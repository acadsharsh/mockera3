"use client";

import { useEffect, useMemo, useState } from "react";

type Test = {
  id: string;
  title: string;
  visibility: "Public" | "Private";
  accessCode?: string;
  durationMinutes: number;
  markingCorrect: number;
  markingIncorrect: number;
};

export default function TestCreated() {
  const [testId, setTestId] = useState("");
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setTestId(params.get("testId") ?? "");
  }, []);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/tests?testId=${testId}`);
      const data = await response.json();
      setTest(data ?? null);
    };
    if (testId) {
      load();
    }
  }, [testId]);

  const link = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/cbt?testId=${testId}`;
  }, [testId]);

  const copyLink = async () => {
    if (!link) {
      return;
    }
    await navigator.clipboard.writeText(link);
    alert("Test link copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-[#0d0f13] text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-24 pb-20">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <p className="text-xs uppercase text-white/60">Test Created</p>
          <h1 className="mt-2 text-3xl font-semibold">Your test is live.</h1>
          <p className="mt-2 text-sm text-white/60">Share this link with students.</p>

          <div className="mt-6 rounded-xl border border-white/10 bg-[#11131a] p-4 text-sm text-white/80">
            {link || "Link will appear after save."}
          </div>

          {test?.visibility === "Private" && (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#11131a] p-4 text-sm text-white/80">
              Access Code: <span className="font-semibold text-white">{test.accessCode}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-[#4f46e5] px-4 py-2 text-sm font-semibold"
              onClick={copyLink}
            >
              Copy Link
            </button>
            <a className="rounded-full border border-white/10 px-4 py-2 text-sm" href={`/library?tab=leaderboard&testId=${testId}`}>
              Live Batch Leaderboard
            </a>
            <a className="rounded-full border border-white/10 px-4 py-2 text-sm" href="/library">
              Go to Library
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
