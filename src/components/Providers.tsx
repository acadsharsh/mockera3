"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const isDarkRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const useDark = isDarkRoute(pathname);

  useEffect(() => {
    const body = document.body;
    if (!body) return;
    if (useDark) {
      body.classList.remove("app-light-body");
    } else {
      body.classList.add("app-light-body");
    }
  }, [useDark]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme={useDark ? "dark" : "light"}
    >
      <div className={useDark ? "" : "app-light"}>{children}</div>
    </ThemeProvider>
  );
}
