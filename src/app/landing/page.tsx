"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  FileText,
  LayoutPanelLeft,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  WandSparkles,
} from "lucide-react";

type WorkflowBlock = {
  id: string;
  title: string;
  body: string;
  tint: string;
  align: "left" | "right";
};

type ToolCard = {
  title: string;
  body: string;
  icon: typeof UploadCloud;
};

const workflow: WorkflowBlock[] = [
  {
    id: "01",
    title: "Upload your paper PDF",
    body: "Drop a chapter test, full paper, or PYQ PDF. Select question regions quickly without reformatting the source file.",
    tint: "bg-gradient-to-br from-[#d8ccff] to-[#c8b8ff]",
    align: "left",
  },
  {
    id: "02",
    title: "Map answer key in minutes",
    body: "Paste key lines or upload key sheets, then map answers to question numbers with validation before publish.",
    tint: "bg-gradient-to-br from-[#dce9ff] to-[#c5ddff]",
    align: "right",
  },
  {
    id: "03",
    title: "Run in real exam interface",
    body: "Students attempt in CBT mode with timer, section palette, mark-for-review flow, and navigation lock settings.",
    tint: "bg-gradient-to-br from-[#d9f0eb] to-[#c6e7df]",
    align: "left",
  },
  {
    id: "04",
    title: "Review mistakes and speed loss",
    body: "Track score trends, topic weakness, and time-per-question so coaching decisions are based on real attempt data.",
    tint: "bg-gradient-to-br from-[#f0ddd0] to-[#e8d0bf]",
    align: "right",
  },
];

const tools: ToolCard[] = [
  {
    title: "Test Creator",
    body: "Convert PDFs into structured tests with crop, reorder, and chapter tagging.",
    icon: UploadCloud,
  },
  {
    title: "Chapter-wise PYQ Bank",
    body: "Organize PYQs by chapter and exam so students practice with the right weightage.",
    icon: BookOpen,
  },
  {
    title: "Previous-Year Paper Hub",
    body: "Publish complete exam papers by year and stream with a real CBT attempt flow.",
    icon: ClipboardList,
  },
  {
    title: "Library",
    body: "Store all tests by chapter, year, and exam stream with quick search.",
    icon: BookOpen,
  },
  {
    title: "CBT Interface",
    body: "Exam-like attempt screen with timer, palette, and section controls.",
    icon: Target,
  },
  {
    title: "Answer Key Manager",
    body: "Apply and verify keys fast, including missing answer detection.",
    icon: ClipboardList,
  },
  {
    title: "Performance Analytics",
    body: "See marks trend, weak topics, and attempt history in one view.",
    icon: ChartNoAxesCombined,
  },
];

const faqs = [
  {
    q: "Can teachers run this for live classroom tests?",
    a: "Yes. Create a test once, share it with your batch, and review everyone from Dashboard + Test Analysis.",
  },
  {
    q: "Do students need technical setup before attempting?",
    a: "No. Students only need the test link and login. The CBT interface opens directly in browser.",
  },
  {
    q: "Can I edit an already created test?",
    a: "Yes. Open your test from Library and jump back to Test Creator for question, key, and settings updates.",
  },
  {
    q: "Does it support section-wise JEE style structure?",
    a: "Yes. You can organize questions by subject and section, then attempt with section-aware navigation.",
  },
];

function MockShot({ tint }: { tint?: string }) {
  return (
    <div className={`rounded-[2px] border border-[#241a58]/20 ${tint ? `${tint}` : 'bg-[#edece6]'} p-4`}>
      <div className="rounded-[2px] border border-[#20174a]/20 bg-[#edece6] p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-[#6a46ff]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#93c5fd]" />
          <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
        </div>
        <div className="mt-3 grid grid-cols-12 gap-2">
          <div className="col-span-3 rounded-[2px] bg-[#1e124f]/15 p-2">
            <div className="h-2 w-12 rounded bg-[#1e124f]/35" />
            <div className="mt-2 h-2 w-10 rounded bg-[#1e124f]/20" />
            <div className="mt-1 h-2 w-8 rounded bg-[#1e124f]/20" />
          </div>
          <div className="col-span-9 rounded-[2px] bg-[#edece6] p-2">
            <div className="h-2.5 w-1/2 rounded bg-[#1e124f]/25" />
            <div className="mt-3 h-16 rounded bg-[#1e124f]/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen bg-[#E8E8E2] text-[#16133f] font-neue overflow-hidden"
    >
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#271f5f]/20 bg-[#E8E8E2]">
        <div className="mx-auto flex h-20 w-full max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[2px] bg-[#1f114f] border border-[#1f114f]">
              <WandSparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight font-everett">CBTCORE</p>
              <p className="text-xs text-[#4b4677]">JEE/NEET Mock Test Workspace</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#231c53] lg:flex">
            <a href="#how" className="transition hover:text-[#3B82F6]">How it works</a>
            <a href="#features" className="transition hover:text-[#3B82F6]">Features</a>
            <a href="#faq" className="transition hover:text-[#3B82F6]">FAQ</a>
            <Link href="/guide" className="transition hover:text-[#3B82F6]">Guide</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-[2px] border border-[#1f1748]/25 px-4 py-2 text-sm font-semibold text-[#1f1748] transition hover:bg-[#edece6]/80">
              Sign in
            </Link>
            <Link href="/studio" className="inline-flex items-center gap-2 rounded-[2px] bg-[#1f114f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a1768]">
              Open Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative overflow-hidden border-b border-[#271f5f]/15">
          <div className="mx-auto w-full max-w-[1240px] px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
            <div className="text-center">
              <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#231d54]/25 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2f2963]">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-everett">Trusted by teachers, tutors, and self-prep students</span>
              </p>
              <h1 className="mx-auto mt-8 max-w-5xl text-balance text-[clamp(2.3rem,6.8vw,6.2rem)] font-black uppercase font-everett leading-[0.9] tracking-[-0.03em] text-[#150f43]">
                Got a PDF? Turn it into
                <span className="block text-[#5a38ff]">a real mock test in minutes</span>
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-balance text-lg text-[#2f2b57] sm:text-2xl">
                No training needed. Upload a paper, build chapter-wise PYQs or full previous-year mocks, set answers, share, and analyze.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/studio"
                  className="rounded-[2px] border border-[#7bb300] bg-[#C7FF01] px-8 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#48B501] transition hover:brightness-95"
                >
                  Start Building
                </Link>
                <Link href="/library" className="rounded-[2px] border border-[#241a58]/35 px-8 py-3 text-sm font-semibold text-[#221b53] transition hover:bg-[#edece6]/80">
                  Explore Tests
                </Link>
              </div>

              <p className="mt-4 text-xs font-medium tracking-wide text-[#4d4974]">
                300+ tests live - 12k+ attempts taken - 2-3 min average setup
              </p>
            </div>

          </div>
        </section>

        <section id="how" className="relative border-y border-[#1f1b3d]/25 bg-[#E8E8E2]">
          <div className="mx-auto w-full max-w-[1240px] px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5a5681]">How it actually works</p>
            <h2 className="mx-auto mt-3 max-w-4xl text-balance text-[clamp(2rem,4.7vw,4rem)] font-black uppercase font-everett leading-[0.92] tracking-[-0.025em] text-[#130e40]">
              Build, run, and evaluate in one flow
            </h2>
            <p className="mt-3 text-sm text-[#3f3b67]">Scroll to stack the steps.</p>
          </div>

          <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-6 lg:px-8">
            <div className="space-y-8">
              {workflow.map((item, index) => (
                <div
                  key={item.id}
                  className="relative sticky top-28 transition-transform"
                  style={{ zIndex: workflow.length - index, transform: `translateY(${index * 18}px) scale(${1 - index * 0.02})` }}
                >

                  <div className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#edece6] shadow-[0_20px_50px_rgba(24,17,66,0.18)]">
                    <div className="grid lg:grid-cols-2">
                      <div className="border-b border-[#2a205c]/20 bg-[#E8E8E2] px-6 py-10 lg:px-10 lg:py-14">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#4f2cff]">Step {item.id}</p>
                        <h3 className="mt-3 text-3xl font-black uppercase font-everett leading-[1.04] tracking-tight text-[#171242]">{item.title}</h3>
                        <p className="mt-3 max-w-xl text-base text-[#3e3a63]">{item.body}</p>
                        <a href="#" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1f184f]">
                          Learn more
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </div>
                      <div className={`border-l border-[#2a205c]/20 ${item.tint} px-6 py-10 lg:px-10 lg:py-14`}>
                        <MockShot />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-[#2c215f]/25 bg-[#20104f] py-16 text-white">
          <div className="relative mx-auto w-full max-w-[1240px] px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#cbc4ff]">Consistency at scale</p>
            <h3 className="mx-auto mt-3 max-w-4xl text-balance text-[clamp(2rem,4vw,3.4rem)] font-black uppercase font-everett leading-[0.95] tracking-tight">
              Standardize test creation across batches and branches
            </h3>
            <p className="mx-auto mt-3 max-w-2xl text-[#d9d4ff]">Same workflow for teachers, tutors, and self-prep students. Less setup time, cleaner attempts, faster feedback cycles.</p>
            <Link
              href="/studio"
              className="mt-7 inline-flex items-center gap-2 rounded-[2px] border border-[#7bb300] bg-[#C7FF01] px-7 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#48B501]"
            >
              Start Building
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-[1240px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5a5681]">What you are working with</p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-[#171242] font-everett">Platform modules</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <article key={tool.title} className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#edece6]  p-5 ">
                  <div className="inline-flex rounded-[2px] bg-[#ede7ff] p-2 text-[#4f2cff]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 text-lg font-black uppercase font-everett leading-tight text-[#171242]">{tool.title}</h3>
                  <p className="mt-2 text-sm text-[#44406a]">{tool.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1240px] px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#edece6]  p-6">
              <LayoutPanelLeft className="h-5 w-5 text-[#4f2cff]" />
              <h3 className="mt-4 text-2xl font-black uppercase font-everett text-[#171242]">Teacher ready</h3>
              <p className="mt-2 text-sm text-[#44406a]">Build weekend tests, full mocks, and chapter drills without additional ops tooling.</p>
            </article>
            <article className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#edece6]  p-6">
              <FileText className="h-5 w-5 text-[#4f2cff]" />
              <h3 className="mt-4 text-2xl font-black uppercase font-everett text-[#171242]">Student friendly</h3>
              <p className="mt-2 text-sm text-[#44406a]">Attempt UI mirrors exam flow, helping students practice timing and navigation behavior.</p>
            </article>
            <article className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#d7e5ec] p-6">
              <ShieldCheck className="h-5 w-5 text-[#1f114f]" />
              <h3 className="mt-4 text-2xl font-black uppercase font-everett text-[#171242]">Reliable records</h3>
              <p className="mt-2 text-sm text-[#44406a]">Attempts and analytics stay mapped to user accounts for continuous revision tracking.</p>
            </article>
          </div>
        </section>

        <section id="faq" className="border-y border-[#2a205c]/20 py-16">
          <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-4xl font-black uppercase tracking-tight text-[#171242] font-everett">Questions &amp; answers</h2>
            <p className="mt-2 text-center text-[#3f3b67]">Everything important before you launch your next mock.</p>

            <div className="mt-8 space-y-3">
              {faqs.map((item) => (
                <details key={item.q} className="group rounded-[2px] border border-[#1f1b3d]/25 bg-[#edece6]  px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-[#1f184f]">
                    {item.q}
                    <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm text-[#44406a]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-[#2a205c]/20 bg-[#d4b5ff] py-14">
          <div className="mx-auto grid w-full max-w-[1240px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <h3 className="text-[clamp(2rem,4vw,4rem)] font-black uppercase font-everett leading-[0.92] tracking-tight text-[#171242]">Get started for free</h3>
              <p className="mt-2 text-lg text-[#2f2b57]">Create your first JEE/NEET mock from PDF in minutes.</p>
              <Link
                href="/studio"
                className="mt-6 inline-flex items-center gap-2 rounded-[2px] border border-[#7bb300] bg-[#C7FF01] px-7 py-3 text-sm font-black uppercase tracking-[0.08em] text-[#48B501]"
              >
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-[2px] border border-[#1f1b3d]/25 bg-[#f8f7ff]/70 p-4">
              <MockShot tint="from-[#cab8ff] to-[#d8ccff]" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#13073e] text-[#d8cbff]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#a89cd6]">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/studio" className="hover:text-white">Test Creator</Link></li>
                <li><Link href="/library" className="hover:text-white">Library</Link></li>
                <li><Link href="/cbt" className="hover:text-white">CBT Interface</Link></li>
                <li><Link href="/test-analysis" className="hover:text-white">Analytics</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#a89cd6]">Resources</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/guide" className="hover:text-white">Guide</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link href="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-[#a89cd6]">Security</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Session integrity</li>
                <li className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Support enabled</li>
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <p className="text-xs uppercase tracking-[0.15em] text-[#a89cd6]">Disclaimer</p>
              <p className="mt-3 max-w-lg text-sm text-[#c7baf2]">We do not own any tests. All tests are created by users. For support: acads.harsh@gmail.com</p>
            </div>
          </div>

          <div className="mt-10 border-t border-white/15 pt-8">
            <p className="text-[clamp(2.8rem,10vw,7rem)] font-black uppercase tracking-[-0.04em] text-[#c3a8ff] font-everett">CBTCORE</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

