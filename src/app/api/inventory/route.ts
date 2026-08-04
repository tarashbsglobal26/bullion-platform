import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addStockSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  costPrice: z.number().positive(),
  location: z.string().optional(),
  batchNo: z.string().optional(),
  serialNo: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  const inventory = await prisma.inventoryItem.findMany({
    where: productId ? { productId } : {},
    include: {
      product: {
        select: { id: true, name: true, sku: true, metal: true, weight: true, weightUnit: true },
      },
    },
    orderBy: { product: { metal: "asc" } },
  });

  const summary = inventory.reduce(
    (acc, item) => {
      const key = item.productId;
      if (!acc[key]) {
        acc[key] = { product: item.product, totalQty: 0, reserved: 0, available: 0 };
      }
      acc[key].totalQty += item.quantity;
      acc[key].reserved += item.reserved;
      acc[key].available += item.quantity - item.reserved;
      return acc;
    },
    {} as Record<string, any>
  );

  return NextResponse.json({ items: inventory, summary: Object.values(summary) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = addStockSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const sku = `${product.sku}-${Date.now()}`;
  const item = await prisma.inventoryItem.create({
    data: { ...parsed.data, sku },
    include: { product: { select: { name: true, sku: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}
