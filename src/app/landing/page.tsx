"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          CBTCORE
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link className="rounded-full border border-white/15 px-4 py-2 text-white/80 hover:border-white/30" href="/login">
            Sign in
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-full bg-[#58a6ff] px-4 py-2 text-[#0d1117] hover:bg-[#74b7ff]" href="/studio">
            Open Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col items-center px-6 pb-20 pt-16 text-center">
        <p className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Trusted by teachers, tutors, and self-prep students
        </p>
        <h1 className="mt-8 text-balance text-[clamp(2.4rem,6.5vw,5.6rem)] font-black leading-[0.9] tracking-tight">
          Got a PDF?
          <span className="block text-[#58a6ff]">Turn it into a real mock test in minutes</span>
        </h1>
        <p className="mt-5 max-w-3xl text-balance text-lg text-white/70">
          No training needed. Upload a paper, build chapter-wise PYQs or full previous-year mocks, set answers, share, and analyze.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link className="rounded-full bg-[#58a6ff] px-6 py-3 text-sm font-semibold text-[#0d1117]" href="/studio">
            Start Building
          </Link>
          <Link className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80" href="/library">
            Explore Tests
          </Link>
        </div>
      </main>
    </div>
  );
}
