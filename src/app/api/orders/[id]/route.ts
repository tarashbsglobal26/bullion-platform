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
});

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

  const updateData: any = { ...parsed.data };
  if (parsed.data.status === "SHIPPED") updateData.shippedAt = new Date();
  if (parsed.data.status === "DELIVERED") updateData.deliveredAt = new Date();

  const order = await prisma.order.update({ where: { id }, data: updateData });
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
