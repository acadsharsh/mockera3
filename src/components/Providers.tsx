"use client";

import { ThemeProvider } from "next-themes";
import { usePathname } from "next/navigation";
import BroadcastPopup from "@/components/BroadcastPopup";
import { MathJaxContext } from "better-react-mathjax";

const isExcludedRoute = (pathname: string) =>
  pathname.startsWith("/cbt") || pathname.startsWith("/test-analysis");

const hideBroadcastOnRoute = (pathname: string) => pathname.startsWith("/landing");

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const excluded = isExcludedRoute(pathname);
  const hideBroadcast = hideBroadcastOnRoute(pathname);
  const mathJaxConfig = {
    loader: { load: ["input/tex", "output/chtml"] },
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true,
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
    },
  } as const;

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
