import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/storage";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const { id } = await params;

  const doc = await prisma.kYCDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && doc.businessId !== user.businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin && doc.status === "APPROVED") {
    return NextResponse.json({ error: "Approved documents can't be deleted" }, { status: 400 });
  }

  await prisma.kYCDocument.delete({ where: { id } });
  await deleteFromR2(doc.fileUrl).catch(() => {});

  return NextResponse.json({ success: true });
}
