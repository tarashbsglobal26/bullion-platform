import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestSpotPrices, calculateProductPrice } from "@/lib/spot-prices";
import { generateQuoteNumber } from "@/lib/utils";
import { z } from "zod";

const createQuoteSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const quotes = await prisma.quote.findMany({
    where: isAdmin ? {} : { businessId: user.businessId },
    include: {
      business: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true, metal: true } } } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.businessId) return NextResponse.json({ error: "No business associated" }, { status: 400 });

  const business = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!business || business.status !== "VERIFIED") {
    return NextResponse.json({ error: "Business must be verified to create quotes" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createQuoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const spotPrices = await getLatestSpotPrices();
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.productId) }, isActive: true },
  });

  let subtotal = 0;
  const quoteItems = parsed.data.items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`Product ${item.productId} not found`);
    const spot = spotPrices[product.metal];
    const unitPrice = calculateProductPrice(spot, Number(product.weight), Number(product.premiumPercent), Number(product.premiumFixed), product.fixedUnitPrice ? Number(product.fixedUnitPrice) : null);
    const premium = unitPrice - spot * Number(product.weight);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;
    return { productId: item.productId, quantity: item.quantity, spotPrice: spot, premium, unitPrice, totalPrice };
  });

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: generateQuoteNumber(),
      businessId: user.businessId,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      spotPriceGold: spotPrices.GOLD,
      spotPriceSilver: spotPrices.SILVER,
      spotPricePlatinum: spotPrices.PLATINUM,
      spotPricePalladium: spotPrices.PALLADIUM,
      subtotal,
      total: subtotal,
      notes: parsed.data.notes,
      items: { create: quoteItems },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(quote, { status: 201 });
}
