import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/invoice";

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
    },
  });

  if (!order || !order.invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const pdfBytes = await generateInvoicePDF({
    invoiceNumber: order.invoice.invoiceNumber,
    orderNumber: order.orderNumber,
    issuedAt: order.invoice.issuedAt,
    dueAt: order.invoice.dueAt,
    business: {
      name: order.business.name,
      legalName: order.business.legalName,
      email: order.business.email,
      phone: order.business.phone,
    },
    address: order.business.address,
    items: order.items.map((i) => ({
      name: i.product.name,
      sku: i.product.sku,
      qty: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.totalPrice),
    })),
    subtotal: Number(order.subtotal),
    tax: Number(order.taxAmount),
    shipping: Number(order.shippingCost),
    total: Number(order.total),
  });

  return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.invoice.invoiceNumber}.pdf"`,
    },
  });
}
