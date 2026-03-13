"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import BroadcastPopup from "@/components/BroadcastPopup";
import { MathJaxContext } from "better-react-mathjax";

const isExcludedRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

const hideBroadcastOnRoute = (pathname: string) => pathname.startsWith("/landing");

const mathJaxConfig = {
  loader: { load: ["[tex]/mhchem"] },
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    processEscapes: true,
    packages: { "[+]": ["mhchem"] },
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const excluded = isExcludedRoute(pathname);
  const hideBroadcast = hideBroadcastOnRoute(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <MathJaxContext config={mathJaxConfig}>
        <div className={excluded ? "" : "tinted-dark"}>
          {children}
          {hideBroadcast ? null : <BroadcastPopup />}
        </div>
      </MathJaxContext>
    </ThemeProvider>
  );
}
