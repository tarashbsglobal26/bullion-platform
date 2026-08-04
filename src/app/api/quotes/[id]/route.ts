import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  itemId:   z.string(),
  quantity: z.number().int().positive(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const { id } = await params;
  const body   = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quote = await prisma.quote.findUnique({ where: { id }, include: { items: true } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && quote.businessId !== user.businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (quote.status !== "ACTIVE" || quote.expiresAt < new Date()) {
    return NextResponse.json({ error: "Quote is no longer editable" }, { status: 400 });
  }

  const item = quote.items.find((i) => i.id === parsed.data.itemId);
  if (!item) return NextResponse.json({ error: "Item not found on this quote" }, { status: 404 });

  const newTotalPrice = Number(item.unitPrice) * parsed.data.quantity;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quoteItem.update({
      where: { id: item.id },
      data: { quantity: parsed.data.quantity, totalPrice: newTotalPrice },
    });

    const items = await tx.quoteItem.findMany({ where: { quoteId: id } });
    const subtotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);

    return tx.quote.update({
      where: { id },
      data: { subtotal, total: subtotal + Number(quote.taxAmount) },
      include: { items: { include: { product: { select: { name: true, sku: true, metal: true } } } } },
    });
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { order: { include: { invoice: { select: { id: true } } } } },
  });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && quote.businessId !== user.businessId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    if (quote.order?.invoice) {
      await tx.invoice.delete({ where: { id: quote.order.invoice.id } });
    }
    if (quote.order) {
      await tx.order.delete({ where: { id: quote.order.id } }); // cascades OrderItems
    }
    await tx.quote.delete({ where: { id } }); // cascades QuoteItems
  });

  return NextResponse.json({ success: true });
}
