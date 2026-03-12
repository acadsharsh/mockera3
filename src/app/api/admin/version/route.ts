import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    deployedAt: new Date().toISOString(),
  });
}
