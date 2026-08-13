import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!session || !user.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileName, contentType, fileSize } = await req.json();
  if (!fileName || !contentType) return NextResponse.json({ error: "Missing file info" }, { status: 400 });
  if (!ALLOWED.has(contentType)) return NextResponse.json({ error: "Only JPEG, PNG, WebP or PDF allowed" }, { status: 400 });
  if (typeof fileSize === "number" && fileSize > MAX_SIZE) {
    return NextResponse.json({ error: "File must be under 20 MB" }, { status: 400 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "pdf";
  const key = `kyc/${user.businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType);

  return NextResponse.json({ uploadUrl, publicUrl });
}
