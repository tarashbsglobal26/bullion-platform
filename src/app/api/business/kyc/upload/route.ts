import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as any;
  if (!session || !user.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG, WebP or PDF allowed" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const filename = `kyc/${user.businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const url = await uploadToR2(Buffer.from(await file.arrayBuffer()), filename, file.type);

  return NextResponse.json({ url });
}
