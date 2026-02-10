import type { Metadata } from "next";
import { Geist_Mono, Inter, JetBrains_Mono, Marcellus, Space_Grotesk } from "next/font/google";
import Providers from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const marcellus = Marcellus({
  variable: "--font-royal",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "PDF to Mock Test Studio",
  description:
    "Crop questions from PDFs, publish CBT mock tests, and analyze performance with high-end analytics.",
  verification: {
    google: "XoHp4XpjNz95uTCQwdcIk7DlXlcb4YpFg5Qv_k4HbjU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${marcellus.variable} antialiased`}
      >
        <Script
          src="https://unpkg.com/@lottiefiles/dotlottie-wc@0.8.11/dist/dotlottie-wc.js"
          type="module"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-D1VHC992WK"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-D1VHC992WK');`}
        </Script>
        <Providers>
          <PageTransition>{children}</PageTransition>
          <Toaster richColors />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
