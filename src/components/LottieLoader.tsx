"use client";

import React from "react";

type LottieLoaderProps = {
  message?: string;
  size?: number;
  className?: string;
};

const DEFAULT_SRC = "https://lottie.host/dbd6d563-6819-4774-81a1-bf5165fcccf5/8hOCZo4o8j.lottie";

const DotLottie = "dotlottie-wc" as unknown as React.ElementType;

export default function LottieLoader({ message, size = 220, className }: LottieLoaderProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <DotLottie
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
