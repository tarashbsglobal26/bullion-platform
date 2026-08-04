import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLatestSpotPrices } from "@/lib/spot-prices";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prices = await getLatestSpotPrices();

  const history = await prisma.spotPrice.findMany({
    where: {
      timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { timestamp: "asc" },
    select: { metal: true, price: true, timestamp: true },
  });

  return NextResponse.json({ current: prices, history, asOf: new Date().toISOString() });
}
