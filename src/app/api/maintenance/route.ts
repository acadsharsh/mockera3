import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const CONFIG_KEY = "global";

export async function GET() {
  const config = await prisma.appConfig.findUnique({
    where: { key: CONFIG_KEY },
  });
  return NextResponse.json({ enabled: config?.maintenanceMode ?? false });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const enabled = Boolean(body?.enabled);
  const config = await prisma.appConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { maintenanceMode: enabled },
    create: { key: CONFIG_KEY, maintenanceMode: enabled },
  });
  return NextResponse.json({ enabled: config.maintenanceMode });
}
