import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const slideSchema = z.object({
  imageUrl: z.string().min(1),
  title:    z.string().optional().nullable(),
  subtitle: z.string().optional().nullable(),
  linkUrl:  z.string().optional().nullable(),
});

const bannerSchema = z.object({
  slides: z.array(slideSchema),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const banner = await prisma.banner.findUnique({
    where: { key },
    include: { slides: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(banner);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const body   = await req.json();
  const parsed = bannerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const banner = await prisma.$transaction(async (tx) => {
    const b = await tx.banner.upsert({ where: { key }, update: {}, create: { key } });
    await tx.bannerSlide.deleteMany({ where: { bannerId: b.id } });
    if (parsed.data.slides.length > 0) {
      await tx.bannerSlide.createMany({
        data: parsed.data.slides.map((s, i) => ({ ...s, bannerId: b.id, order: i })),
      });
    }
    return tx.banner.findUnique({ where: { id: b.id }, include: { slides: { orderBy: { order: "asc" } } } });
  });

  return NextResponse.json(banner);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key } = await params;
  await prisma.banner.deleteMany({ where: { key } });
  return NextResponse.json({ success: true });
}
