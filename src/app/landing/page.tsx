"use client";

import Link from "next/link";

const tagItems = ["CBT", "Test Analysis", "Leaderboard"];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 top-[-160px] h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.35),transparent_65%)] blur-3xl" />
        <div className="absolute right-20 top-40 h-48 w-48 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.28),transparent_70%)] blur-3xl" />
      </div>

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

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-24 pt-20">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
              Turn PDFs into Practice Tests.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-white/65 md:text-base">
              A simple tool to extract questions and create a clean CBT environment.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {tagItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/60"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-4 rounded-full bg-[#1f1f1f] px-10 py-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
              >
                Create Mock Test
              </Link>
              <Link
                href="/guide"
                className="rounded-full border border-white/15 px-6 py-3 text-xs font-semibold text-white/80 transition hover:border-white/40"
              >
                Guide
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.22),transparent_70%)] blur-3xl" />
            <div className="relative space-y-4">
              <div className="rounded-[32px] bg-[#bfeff0] p-6 text-black shadow-[0_0_60px_rgba(45,212,191,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-black/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                    Global Status
                  </span>
                  <span className="h-2.5 w-2.5 rounded-full bg-black/80" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold">PDF to CBT Engine</h3>
                <p className="mt-3 text-sm text-black/70">
                  Simple tool to convert study material into mock tests.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] bg-[#cfe9ff] p-5 text-black shadow-[0_0_50px_rgba(125,211,252,0.18)]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                      Precision
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold">Time Distribution</p>
                  <p className="mt-2 text-xs text-black/70">Measured from actual test sessions.</p>
                </div>

                <div className="rounded-[28px] bg-[#c6f6d5] p-5 text-black shadow-[0_0_50px_rgba(74,222,128,0.18)]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                      Performance
                    </span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold">Post-Test Analytics</p>
                  <p className="mt-2 text-xs text-black/70">
                    Detailed breakdown of time spent per question, accuracy by topic, and percentile ranking - all generated instantly after submission.
                  </p>
                </div>
              </div>
            </div>
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
