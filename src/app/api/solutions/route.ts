import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const CONFIG_KEY = "global";

export async function GET() {
  const config = await prisma.appConfig.findUnique({ where: { key: CONFIG_KEY } });
  return NextResponse.json({ enabled: config?.showSolutions ?? true });
}

export async function POST(request: Request) {
  await requireAdmin();
  const payload = await request.json();
  const enabled = Boolean(payload?.enabled);
  const config = await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { showSolutions: enabled },
    create: { key: CONFIG_KEY, showSolutions: enabled },
  });
  return NextResponse.json({ enabled: config.showSolutions });
}
