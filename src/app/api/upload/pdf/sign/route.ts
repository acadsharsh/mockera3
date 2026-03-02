import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth-helpers";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "cbtcore/pdfs";
  const publicId = `${timestamp}-${randomUUID()}`;
  const signature = cloudinary.utils.api_sign_request(
    { folder, public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder,
    publicId,
  });
}
