import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const notifySchema = z.object({
  quantity: z.number().int().positive(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body   = await req.json();
  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const user = session.user as any;
  const notification = await prisma.stockNotification.upsert({
    where: { productId_userId: { productId: id, userId: user.id } },
    update: { quantity: parsed.data.quantity, notifiedAt: null },
    create: { productId: id, userId: user.id, quantity: parsed.data.quantity },
  });

  return NextResponse.json(notification, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  await prisma.stockNotification.deleteMany({ where: { productId: id, userId: user.id } });
  return NextResponse.json({ success: true });
}
