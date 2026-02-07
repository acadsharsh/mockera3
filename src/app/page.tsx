import Link from "next/link";

const glassCard =
  "rounded-3xl border border-[#1F1F22] bg-[#141415]/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)]";
const bentoCard = `${glassCard} p-6`;

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0F0F10] text-white">
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,91,255,0.28),rgba(15,15,16,0))]" />
      <div className="pointer-events-none absolute right-[-120px] top-[240px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(0,143,93,0.18),rgba(15,15,16,0))]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1F1F22] bg-[#141415] text-xs font-semibold">
            M
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">Mockera</p>
            <p className="text-sm text-white/90">PDF to Mocktest</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#workflow" className="hover:text-white">
            Workflow
          </a>
          <Link
            href="/login"
            className="rounded-full bg-[#2D5BFF] px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_30px_rgba(45,91,255,0.35)]"
          >
            Start Now
          </Link>
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <Link
            href="/login"
            className="rounded-full bg-[#2D5BFF] px-4 py-2 text-xs font-semibold text-white"
          >
            Start
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-6">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-[11px] uppercase tracking-[0.4em] text-white/50">
              The Processing Core
            </p>
            <h1 className="imperial-title text-4xl font-semibold leading-tight md:text-6xl">
              Turn any PDF into a Pro‑Grade Mocktest.
            </h1>
            <p className="text-base text-white/70 md:text-lg">
              Upload PDFs, auto‑structure questions, and publish CBT exams with precision tracking and
              elite analytics.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-[#2D5BFF] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(45,91,255,0.35)]"
              >
                Start Now
              </Link>
              <Link
                href="/library"
                className="rounded-full border border-[#1F1F22] px-5 py-2 text-sm text-white/70 hover:border-white/30 hover:text-white"
              >
                View Library
              </Link>
            </div>
          </div>

          <div className="relative">
            <Link
              href="/login"
              className={`${glassCard} group flex min-h-[260px] flex-col items-center justify-center gap-3 border border-[#1F1F22] bg-[#141415] p-6 text-center transition hover:border-[#2D5BFF]`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1F1F22] bg-[#0F0F10] text-2xl">
                ⬆
              </div>
              <p className="text-sm font-semibold">Drop PDF here</p>
              <p className="text-xs text-white/50">or click to open Creator Studio</p>
              <div className="absolute inset-0 rounded-3xl border border-transparent transition group-hover:border-[#2D5BFF]" />
              <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 rounded-3xl border border-[#2D5BFF] shadow-[0_0_30px_rgba(45,91,255,0.35)]" />
                <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-[#2D5BFF]">
                  Scanning...
                </p>
              </div>
            </Link>
          </div>
        </section>

        <section id="features" className="grid gap-6 lg:grid-cols-3">
          <div className={bentoCard}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Extraction Accuracy
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4 text-xs text-white/50">
                Messy PDF
                <div className="mt-3 h-16 rounded-xl bg-gradient-to-br from-white/10 to-white/5" />
              </div>
              <div className="rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4 text-xs text-white/50">
                Clean CBT
                <div className="mt-3 h-16 rounded-xl bg-gradient-to-br from-[#2D5BFF]/40 to-[#2D5BFF]/10" />
              </div>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Extract questions cleanly with precise crops and structured metadata.
            </p>
          </div>
          <div className={bentoCard}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Precision Index</p>
            <div className="mt-4 rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Accuracy</span>
                <span>Velocity</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 w-[68%] rounded-full bg-[#2D5BFF]" />
              </div>
              <p className="mt-4 text-sm text-white/60">
                Weighted scoring balances speed with correctness.
              </p>
            </div>
          </div>
          <div className={bentoCard}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">Social Proof</p>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4">
              <div className="h-2 w-2 rounded-full bg-[#2D5BFF]" />
              <p className="text-sm text-white/70">50,000+ Questions indexed today</p>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Built for large coaching inventories and daily publishing.
            </p>
          </div>
        </section>

        <section id="workflow" className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={`${glassCard} p-8`}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Workflow
            </p>
            <h2 className="mt-4 text-2xl font-semibold">From PDF to published CBT in 4 steps.</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "1. Upload",
                  copy: "Drop your PDF and auto-detect pages for cropping.",
                },
                {
                  title: "2. Crop & Tag",
                  copy: "Define question bounds and metadata in one pass.",
                },
                {
                  title: "3. Publish",
                  copy: "Generate a locked CBT with controlled navigation.",
                },
                {
                  title: "4. Analyze",
                  copy: "Review test analysis and overall insights instantly.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4"
                >
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{step.title}</p>
                  <p className="mt-2 text-sm text-white/70">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={`${glassCard} p-8`}>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Control Panel
            </p>
            <div className="mt-6 space-y-4">
              {[
                "Precision cropping with instant preview.",
                "Role-based admin controls for percentile mapping.",
                "Locked exam flow with attempt telemetry.",
                "Export-ready analytics for institutes.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#1F1F22] bg-[#0F0F10] p-4 text-sm text-white/70"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1F1F22] bg-[#0B0B0C] py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 text-xs text-white/50 md:flex-row md:items-center md:justify-between">
          <p>Mockera — PDF to CBT Mocktest Studio</p>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-white" href="#features">
              Features
            </a>
            <a className="hover:text-white" href="#workflow">
              Workflow
            </a>
            <Link className="hover:text-white" href="/login">
              Start
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
