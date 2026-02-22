"use client";

import Link from "next/link";

const tagItems = ["CBT", "Test Analysis", "Leaderboard"];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <div className="text-xs tracking-[0.4em] text-white/70">CBT CORE</div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-4 py-2 transition hover:border-white/40"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16">
        <section className="max-w-3xl">
          <h1 className="text-3xl font-semibold md:text-5xl">Create CBT tests from PDFs.</h1>
          <p className="mt-4 text-sm text-white/70 md:text-base">
            Upload a PDF, crop questions, and run a clean CBT session with analysis.
          </p>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-white/60">
            <li>CBT interface with timer</li>
            <li>Answer key support</li>
            <li>Test analysis after submission</li>
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/login" className="rounded-md border border-white/20 bg-black px-5 py-3 text-xs font-semibold text-white">
              Create Mock Test
            </Link>
            <Link href="/guide" className="rounded-md border border-white/20 px-4 py-2 text-xs text-white/80">
              Guide
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 text-xs text-white/50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <span>Disclaimer: We do not own any tests. All tests are created by users.</span>
          <span>Support: acads.harsh@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}
