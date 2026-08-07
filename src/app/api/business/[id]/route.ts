import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING_KYC", "UNDER_REVIEW", "VERIFIED", "SUSPENDED", "REJECTED"]).optional(),
  creditLimit: z.number().min(0).optional(),
  paymentTermDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const { id } = await params;

  if (!isAdmin && user.businessId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      address: true,
      kycDocuments: true,
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { orders: true, quotes: true } },
    },
  });

  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(business);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const business = await prisma.business.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(business);
}
