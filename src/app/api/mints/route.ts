import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createMintSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mints = await prisma.mint.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(mints);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createMintSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.mint.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "That mint already exists" }, { status: 409 });

  const mint = await prisma.mint.create({ data: { name: parsed.data.name } });
  return NextResponse.json(mint, { status: 201 });
}
