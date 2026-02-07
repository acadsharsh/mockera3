import { Suspense } from "react";
import TestAnalysisClient from "./TestAnalysisClient";

export const dynamic = "force-dynamic";

export default function TestAnalysisPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F0F10]" />}>
      <TestAnalysisClient />
    </Suspense>
  );
}
