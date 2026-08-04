import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name:           z.string().min(1).optional(),
  metal:          z.enum(["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "NICKEL_SILVER"]).optional(),
  category:       z.enum(["BULLION_GOLD", "BULLION_SILVER", "COMMEMORATIVE_GOLD", "COMMEMORATIVE_SILVER", "NON_PRECIOUS", "PLATINUM_PALLADIUM"]).optional(),
  weight:         z.number().positive().optional(),
  weightUnit:     z.enum(["OZ", "GRAM", "KG"]).optional(),
  purity:         z.number().min(0).max(1).optional(),
  mint:           z.string().min(1).optional(),
  denomination:   z.string().optional().nullable(),
  mintage:        z.number().int().positive().optional().nullable(),
  diameter:       z.number().positive().optional().nullable(),
  year:           z.number().int().optional().nullable(),
  description:    z.string().optional(),
  premiumPercent: z.number().min(0).optional(),
  premiumFixed:   z.number().min(0).optional(),
  fixedUnitPrice: z.number().positive().optional().nullable(),
  minOrderQty:    z.number().int().positive().optional(),
  images:         z.array(z.string()).optional(),
  priceTiers:     z.array(z.object({
    minQty:         z.number().int().positive(),
    premiumPercent: z.number().min(0).optional().nullable(),
    fixedUnitPrice: z.number().positive().optional().nullable(),
  })).optional(),
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

  const { priceTiers, ...productData } = parsed.data;

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id }, data: productData as any });
    if (priceTiers !== undefined) {
      await tx.priceTier.deleteMany({ where: { productId: id } });
      if (priceTiers.length > 0) {
        await tx.priceTier.createMany({
          data: priceTiers.map(t => ({ ...t, productId: id })),
        });
      }
    }
    return updated;
  });

  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete: mark inactive rather than hard-delete to preserve order history
  await prisma.product.update({ where: { id }, data: { isActive: false } });

  return NextResponse.json({ success: true });
}
