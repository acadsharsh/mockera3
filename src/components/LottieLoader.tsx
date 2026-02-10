"use client";

import React from "react";

// Allow the dotlottie web component in JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dotlottie-wc": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        autoplay?: boolean | "true" | "false";
        loop?: boolean | "true" | "false";
      };
    }
  }
}

type LottieLoaderProps = {
  message?: string;
  size?: number;
  className?: string;
};

const DEFAULT_SRC = "https://lottie.host/dbd6d563-6819-4774-81a1-bf5165fcccf5/8hOCZo4o8j.lottie";

export default function LottieLoader({ message, size = 220, className }: LottieLoaderProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <dotlottie-wc
        src={DEFAULT_SRC}
        style={{ width: size, height: size }}
        autoplay
        loop
        aria-label="Loading animation"
      />
      {message ? <p className="text-sm text-white/70 text-center">{message}</p> : null}
    </div>
  );
}
