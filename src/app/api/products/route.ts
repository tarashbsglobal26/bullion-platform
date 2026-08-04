import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestSpotPrices, calculateProductPrice } from "@/lib/spot-prices";
import { z } from "zod";

const tierSchema = z.object({
  minQty:         z.number().int().positive(),
  premiumPercent: z.number().min(0).optional().nullable(),
  fixedUnitPrice: z.number().positive().optional().nullable(),
});

const createProductSchema = z.object({
  name:           z.string().min(1),
  sku:            z.string().min(1),
  metal:          z.enum(["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "NICKEL_SILVER"]),
  category:       z.enum(["BULLION_GOLD", "BULLION_SILVER", "COMMEMORATIVE_GOLD", "COMMEMORATIVE_SILVER", "NON_PRECIOUS", "PLATINUM_PALLADIUM"]).default("BULLION_GOLD"),
  weight:         z.number().positive(),
  weightUnit:     z.enum(["OZ", "GRAM", "KG"]).default("OZ"),
  purity:         z.number().min(0).max(1),
  mint:           z.string().min(1),
  denomination:   z.string().optional(),
  mintage:        z.number().int().positive().optional(),
  diameter:       z.number().positive().optional(),
  year:           z.number().optional(),
  grade:          z.string().optional(),
  description:    z.string().optional(),
  premiumPercent: z.number().min(0).default(0),
  premiumFixed:   z.number().min(0).default(0),
  fixedUnitPrice: z.number().positive().optional(),
  minOrderQty:    z.number().int().positive().default(1),
  images:         z.array(z.string()).default([]),
  priceTiers:     z.array(tierSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const metal    = searchParams.get("metal");
  const search   = searchParams.get("search");
  const category = searchParams.get("category");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(metal    ? { metal:    metal    as any } : {}),
      ...(category ? { category: category as any } : {}),
      ...(search   ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      inventory:  { select: { quantity: true, reserved: true } },
      priceTiers: { orderBy: { minQty: "asc" } },
      stockNotifications: { where: { userId: (session.user as any).id }, select: { quantity: true } },
    },
    orderBy: [{ metal: "asc" }, { name: "asc" }],
  });

  const spotPrices = await getLatestSpotPrices();

  const enriched = products.map((p) => {
    const spot  = spotPrices[p.metal];
    const price = calculateProductPrice(spot, Number(p.weight), Number(p.premiumPercent), Number(p.premiumFixed), p.fixedUnitPrice ? Number(p.fixedUnitPrice) : null);
    const available = p.inventory.reduce((sum, i) => sum + i.quantity - i.reserved, 0);
    const notifyQuantity = p.stockNotifications[0]?.quantity ?? null;
    const { stockNotifications, ...rest } = p;
    return { ...rest, spotPrice: spot, calculatedPrice: price, availableQty: available, notifyQuantity };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { priceTiers, ...productData } = parsed.data;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: productData });
    if (priceTiers.length > 0) {
      await tx.priceTier.createMany({
        data: priceTiers.map(t => ({ ...t, productId: created.id })),
      });
    }
    return created;
  });

  return NextResponse.json(product, { status: 201 });
}
