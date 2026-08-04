import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber, generateInvoiceNumber } from "@/lib/utils";
import { addBusinessDays } from "date-fns";
import { z } from "zod";

const createOrderSchema = z.object({
  quoteId: z.string(),
  shippingAddress: z.object({
    street1: z.string(),
    street2: z.string().optional(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: {
      ...(isAdmin ? {} : { businessId: user.businessId }),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      business: { select: { name: true } },
      items: { include: { product: { select: { name: true, sku: true } } } },
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (!user.businessId) return NextResponse.json({ error: "No business associated" }, { status: 400 });

  const body = await req.json();
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quote = await prisma.quote.findUnique({
    where: { id: parsed.data.quoteId, businessId: user.businessId, status: "ACTIVE" },
    include: { items: true },
  });

  if (!quote) return NextResponse.json({ error: "Quote not found or expired" }, { status: 404 });
  if (quote.expiresAt < new Date()) {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED" } });
    return NextResponse.json({ error: "Quote has expired" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({ where: { id: user.businessId } });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        businessId: user.businessId,
        userId: user.id,
        quoteId: quote.id,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        shippingAddress: parsed.data.shippingAddress,
        notes: parsed.data.notes,
        items: {
          create: quote.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            spotPrice: i.spotPrice,
            premium: i.premium,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        },
      },
    });

    const issuedAt = new Date();
    await tx.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        orderId: newOrder.id,
        amount: quote.total,
        issuedAt,
        dueAt: addBusinessDays(issuedAt, 3),
      },
    });

    await tx.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED" } });

    return newOrder;
  });

  return NextResponse.json(order, { status: 201 });
}
