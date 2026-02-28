"use client";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { client } from "@/lib/appwrite";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    client.ping();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
