import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const notifications = await prisma.stockNotification.findMany({
    where: isAdmin ? {} : { userId: user.id },
    include: {
      product: {
        include: { inventory: { select: { quantity: true, reserved: true } } },
      },
      ...(isAdmin ? { user: { select: { name: true, email: true, business: { select: { name: true } } } } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = notifications.map((n: any) => {
    const { inventory, ...product } = n.product;
    const availableQty = inventory.reduce((sum: number, i: any) => sum + i.quantity - i.reserved, 0);
    return {
      id: n.id,
      quantity: n.quantity,
      createdAt: n.createdAt,
      product: { ...product, availableQty },
      ...(isAdmin ? { requestedBy: n.user } : {}),
    };
  });

  return NextResponse.json(enriched);
}
