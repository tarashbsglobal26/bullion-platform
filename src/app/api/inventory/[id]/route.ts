import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  quantity:  z.number().int().min(0).optional(),
  reserved:  z.number().int().min(0).optional(),
  costPrice: z.number().positive().optional(),
  location:  z.string().optional().nullable(),
  batchNo:   z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: parsed.data,
    include: { product: { select: { name: true, sku: true } } },
  });

  return NextResponse.json(item);
}
