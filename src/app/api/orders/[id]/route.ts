import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/invoice";
import { z } from "zod";

const updateOrderSchema = z.object({
  status: z.enum(["PENDING_APPROVAL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  internalNotes: z.string().optional(),
  markPaid: z.boolean().optional(),
});

// Forward progression only moves one step at a time (no skipping "CONFIRMED", etc.);
// moving backward (to correct a mistake) is still allowed.
const STATUS_SEQUENCE = ["PENDING_APPROVAL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

function validateStatusTransition(current: string, next: string): string | null {
  if (next === current) return null;

  if (next === "CANCELLED") {
    if (current === "DELIVERED" || current === "CANCELLED") {
      return `Cannot cancel an order that is already ${current.toLowerCase()}`;
    }
    return null;
  }

  if (current === "CANCELLED") {
    return "Cannot change the status of a cancelled order";
  }

  const currentIndex = STATUS_SEQUENCE.indexOf(current);
  const nextIndex = STATUS_SEQUENCE.indexOf(next);
  if (nextIndex > currentIndex + 1) {
    return `Order must be ${STATUS_SEQUENCE[currentIndex + 1].replace(/_/g, " ")} before it can be ${next.replace(/_/g, " ")}`;
  }
  return null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: {
      id,
      ...(!isAdmin ? { businessId: user.businessId } : {}),
    },
    include: {
      business: { include: { address: true } },
      items: { include: { product: true } },
      invoice: true,
      quote: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.order.findUnique({ where: { id }, include: { invoice: true } });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { markPaid, ...rest } = parsed.data;

  if (rest.status) {
    const error = validateStatusTransition(existing.status, rest.status);
    if (error) return NextResponse.json({ error }, { status: 400 });
  }

  if (markPaid) {
    if (existing.status === "PENDING_APPROVAL") {
      return NextResponse.json({ error: "Order must be confirmed by an admin before it can be marked as paid" }, { status: 400 });
    }
    if (!existing.invoice) {
      return NextResponse.json({ error: "Order has no invoice to mark as paid" }, { status: 400 });
    }
    if (existing.invoice.paidAt) {
      return NextResponse.json({ error: "Order is already marked as paid" }, { status: 400 });
    }
  }

  const updateData: any = { ...rest };
  if (rest.status === "SHIPPED") updateData.shippedAt = new Date();
  if (rest.status === "DELIVERED") updateData.deliveredAt = new Date();

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: markPaid ? { ...updateData, paymentStatus: "PAID" } : updateData,
    });
    if (markPaid) {
      await tx.invoice.update({ where: { orderId: id }, data: { paidAt: new Date() } });
    }
    return updated;
  });

  return NextResponse.json(order);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!["DRAFT", "PENDING_APPROVAL"].includes(order.status)) {
    return NextResponse.json({ error: "Cannot cancel a confirmed order" }, { status: 400 });
  }

  await prisma.order.update({ where: { id }, data: { status: "CANCELLED" } });
  return NextResponse.json({ success: true });
}
