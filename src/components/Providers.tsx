"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import BroadcastPopup from "@/components/BroadcastPopup";

const isExcludedRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

const hideBroadcastOnRoute = (pathname: string) => pathname.startsWith("/landing");

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const excluded = isExcludedRoute(pathname);
  const hideBroadcast = hideBroadcastOnRoute(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <div className={excluded ? "" : "tinted-dark"}>
        {children}
        {hideBroadcast ? null : <BroadcastPopup />}
      </div>
    </ThemeProvider>
  );
}
