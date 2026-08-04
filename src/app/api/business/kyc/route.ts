import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const uploadSchema = z.object({
  type: z.enum(["BUSINESS_REGISTRATION", "TAX_CERTIFICATE", "BANK_STATEMENT", "ID_DOCUMENT", "PROOF_OF_ADDRESS"]),
  fileUrl: z.string().url(),
  fileName: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.businessId) return NextResponse.json({ error: "No business associated" }, { status: 400 });

  const body = await req.json();
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const doc = await prisma.kYCDocument.create({
    data: {
      businessId: user.businessId,
      ...parsed.data,
    },
  });

  await prisma.business.update({
    where: { id: user.businessId },
    data: { status: "UNDER_REVIEW" },
  });

  return NextResponse.json(doc, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { docId, status, reviewNotes } = body;

  const doc = await prisma.kYCDocument.update({
    where: { id: docId },
    data: {
      status,
      reviewNotes,
      reviewedAt: new Date(),
      reviewedBy: (session.user as any).id,
    },
  });

  return NextResponse.json(doc);
}
