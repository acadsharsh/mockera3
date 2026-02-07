"use client";

import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || theme === undefined;

  return (
    <button
      className="glass-card flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:text-white"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3.5v2.5M12 18v2.5M4.5 12H7M17 12h2.5M6.2 6.2l1.8 1.8M16 16l1.8 1.8M6.2 17.8l1.8-1.8M16 8l1.8-1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M19 13.5A7.5 7.5 0 1 1 10.5 5a6 6 0 0 0 8.5 8.5Z" />
        </svg>
      )}
    </button>
  );
}
