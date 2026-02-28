"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";

const isDarkRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const useDark = isDarkRoute(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className={useDark ? "" : "app-light"}>{children}</div>
    </ThemeProvider>
  );
}
