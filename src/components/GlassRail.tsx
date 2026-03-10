"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { safeJson } from "@/lib/safe-json";

const SUBJECT_LINKS = [
  { label: "Physics", href: "/library?subject=Physics" },
  { label: "Chemistry", href: "/library?subject=Chemistry" },
  { label: "Mathematics", href: "/library?subject=Mathematics" },
];

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Library", href: "/library" },
  { label: "Creator Studio", href: "/studio" },
  { label: "Test Analysis", href: "/test-analysis" },
];

type SearchResult = {
  label: string;
  href: string;
  type: "test" | "subject" | "page";
};

type TestItem = { id: string; title: string };

export default function GlassRail() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);
  const [tests, setTests] = useState<TestItem[]>([]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/tests");
      const data = await safeJson<TestItem[]>(response, []);
      setTests(Array.isArray(data) ? data : []);
    };
    load();
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const byTests = tests
      .filter((test) => test.title.toLowerCase().includes(lower))
      .map((test) => ({
        label: test.title,
        href: `/cbt?testId=${test.id}`,
        type: "test" as const,
      }));
    const bySubjects = SUBJECT_LINKS.filter((subject) =>
      subject.label.toLowerCase().includes(lower)
    ).map((subject) => ({ ...subject, type: "subject" as const }));
    const byPages = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(lower)).map(
      (item) => ({ label: item.label, href: item.href, type: "page" as const })
    );
    return [...byTests, ...bySubjects, ...byPages].slice(0, 8);
  }, [query, tests]);

  useEffect(() => {
    setFocusIndex(0);
  }, [query]);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-white">CBTCORE</div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-xs ${active ? "text-white" : "text-white/70"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
              aria-label="Search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-semibold text-white/80"
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-black/60 px-4 py-3 text-[11px] text-white/70 md:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 ${
                active ? "text-white" : "text-white/60"
              }`}
            >
              <span className="text-xs font-semibold">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-24">
          <div className="w-full max-w-xl rounded-xl border border-white/10 bg-black p-5 text-white">
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-xs text-slate-300">Search</span>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to test, subject, or page..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                }}
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                  Type a test name, subject, or page.
                </div>
              ) : (
                results.map((result, index) => (
                  <Link
                    key={`${result.type}-${result.href}`}
                    href={result.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                      index === focusIndex
                        ? "border-white/40 bg-white/5 text-white"
                        : "border-white/10 text-slate-200"
                    }`}
                    onMouseEnter={() => setFocusIndex(index)}
                  >
                    <span>{result.label}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                      {result.type}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
