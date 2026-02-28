import { NextResponse } from "next/server";
import { appwriteDb, appwriteDatabaseId } from "@/lib/appwrite-admin";
import { requireAdmin } from "@/lib/auth-helpers";

const CONFIG_KEY = "global";
const COLLECTION_ID = "AppConfig";

export async function GET() {
  try {
    const config = await appwriteDb.getDocument(appwriteDatabaseId, COLLECTION_ID, CONFIG_KEY);
    return NextResponse.json({ enabled: Boolean(config?.maintenanceMode) });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json();
  const enabled = Boolean(body?.enabled);
  try {
    await appwriteDb.getDocument(appwriteDatabaseId, COLLECTION_ID, CONFIG_KEY);
    const updated = await appwriteDb.updateDocument(appwriteDatabaseId, COLLECTION_ID, CONFIG_KEY, {
      key: CONFIG_KEY,
      maintenanceMode: enabled,
    });
    return NextResponse.json({ enabled: Boolean(updated?.maintenanceMode) });
  } catch {
    const created = await appwriteDb.createDocument(appwriteDatabaseId, COLLECTION_ID, CONFIG_KEY, {
      key: CONFIG_KEY,
      maintenanceMode: enabled,
    });
    return NextResponse.json({ enabled: Boolean(created?.maintenanceMode) });
  }
}
