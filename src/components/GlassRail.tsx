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

const iconClass = "h-2.5 w-2.5 rounded-full";

const navIcon = (label: string) => {
  switch (label) {
    case "Dashboard":
      return "bg-indigo-400";
    case "Library":
      return "bg-sky-400";
    case "Creator Studio":
      return "bg-emerald-400";
    case "Test Analysis":
      return "bg-violet-400";
    default:
      return "bg-slate-400";
  }
};

export default function GlassRail() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusIndex, setFocusIndex] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tests, setTests] = useState<TestItem[]>([]);

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) return ["Dashboard"];
    return parts.map((part) =>
      part
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }, [pathname]);

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
  }, [query]);

  useEffect(() => {
    setFocusIndex(0);
  }, [query]);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/80 to-indigo-900/60" />
            <div className="text-xs text-white/70">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb}-${index}`} className="flex items-center gap-2">
                  <span>{crumb}</span>
                  {index < breadcrumbs.length - 1 && <span className="text-white/30">/</span>}
                </span>
              ))}
            </div>
          </div>
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 md:flex">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition ${
                    active ? "bg-white/15 text-white" : "hover:bg-white/10"
                  }`}
                >
                  <span className={`${iconClass} ${navIcon(item.label)}`} />
                  {item.label}
                </Link>
              );
            })}
            <div
              className="relative"
              onMouseEnter={() => {
                if (closeTimerRef.current) {
                  clearTimeout(closeTimerRef.current);
                }
                setMoreOpen(true);
              }}
              onMouseLeave={() => {
                closeTimerRef.current = setTimeout(() => setMoreOpen(false), 120);
              }}
            >
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="rounded-full px-3 py-2 transition hover:bg-white/10"
              >
                More
              </button>
              {moreOpen && (
                <div
                  className="absolute right-0 top-10 z-50 w-52 rounded-2xl border border-white/10 bg-black/80 p-2 text-xs text-white shadow-xl backdrop-blur"
                  onMouseEnter={() => {
                    if (closeTimerRef.current) {
                      clearTimeout(closeTimerRef.current);
                    }
                    setMoreOpen(true);
                  }}
                  onMouseLeave={() => setMoreOpen(false)}
                >
                  {NAV_ITEMS.slice(5).map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block rounded-xl px-3 py-2 transition ${
                        pathname === item.href ? "bg-white/10 text-white" : "hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/30 hover:text-white"
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
              className="flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-[11px] font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
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

      <nav className="fixed bottom-4 left-1/2 z-40 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-black/60 px-4 py-3 text-[11px] text-white/70 backdrop-blur md:hidden">
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur">
          <div className="glass-card w-full max-w-xl rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
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
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-200 transition hover:border-white/30 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                  Type a test name, subject, or page.
                </div>
              ) : (
                results.map((result, index) => (
                  <Link
                    key={`${result.type}-${result.href}`}
                    href={result.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                      index === focusIndex
                        ? "border-indigo-400/50 bg-indigo-500/10 text-white"
                        : "border-white/10 text-slate-200 hover:border-white/30 hover:bg-white/5"
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
