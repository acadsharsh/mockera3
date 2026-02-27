import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  await requireAdmin();
  return NextResponse.json({ ok: true });
}
