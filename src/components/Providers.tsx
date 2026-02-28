"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";

const isExcludedRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const excluded = isExcludedRoute(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className={excluded ? "" : "tinted-dark"}>{children}</div>
    </ThemeProvider>
  );
}
