import { prisma } from "./prisma";
import { Metal } from "@prisma/client";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Gold comes from Twelve Data (reputable vendor); the free plan doesn't include
// silver/platinum/palladium, so those still come from gold-api.com.
const GOLD_API_SYMBOLS: Partial<Record<keyof SpotPriceMap, string>> = {
  SILVER: "XAG",
  PLATINUM: "XPT",
  PALLADIUM: "XPD",
};

// Nickel silver (German silver) is an alloy with no live spot market — fixed reference price per oz
const FIXED_PRICES: Partial<Record<keyof SpotPriceMap, number>> = {
  NICKEL_SILVER: 0.35,
};

export interface SpotPriceMap {
  GOLD: number;
  SILVER: number;
  PLATINUM: number;
  PALLADIUM: number;
  NICKEL_SILVER: number;
}

// In-memory cache
let cache: { prices: SpotPriceMap; fetchedAt: number } | null = null;

async function fetchGoldFromTwelveData(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=XAU/USD&apikey=${process.env.TWELVE_DATA_API_KEY}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = Number(data.price);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function fetchFromGoldApi(): Promise<Partial<Record<keyof SpotPriceMap, number>>> {
  const results: Partial<Record<keyof SpotPriceMap, number>> = {};
  await Promise.all(
    (Object.entries(GOLD_API_SYMBOLS) as [keyof SpotPriceMap, string][]).map(
      async ([metal, symbol]) => {
        try {
          const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
            next: { revalidate: 300 },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (typeof data.price === "number") results[metal] = data.price;
        } catch {
          // leave missing — falls back to DB below
        }
      }
    )
  );
  return results;
}

export async function getLatestSpotPrices(): Promise<SpotPriceMap> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.prices;
  }

  const [gold, goldApiPrices] = await Promise.all([
    fetchGoldFromTwelveData(),
    fetchFromGoldApi(),
  ]);

  const live: Partial<Record<keyof SpotPriceMap, { price: number; source: string }>> = {};
  if (gold != null) live.GOLD = { price: gold, source: "twelvedata" };
  for (const metal of ["SILVER", "PLATINUM", "PALLADIUM"] as const) {
    const price = goldApiPrices[metal];
    if (price != null) live[metal] = { price, source: "gold-api" };
  }

  if (Object.keys(live).length > 0) {
    await persistSpotPrices(live);
  }

  // Fall back to last persisted price per metal that didn't come back live
  const fallbackNeeded = (["GOLD", "SILVER", "PLATINUM", "PALLADIUM"] as const).filter((m) => !live[m]);
  const fallbacks = await Promise.all(
    fallbackNeeded.map((metal) =>
      prisma.spotPrice.findFirst({ where: { metal: Metal[metal] }, orderBy: { timestamp: "desc" } })
    )
  );
  const defaults: Record<"GOLD" | "SILVER" | "PLATINUM" | "PALLADIUM", number> = {
    GOLD: 2650, SILVER: 31.5, PLATINUM: 980, PALLADIUM: 1050,
  };

  const prices = {
    GOLD: live.GOLD?.price ?? (Number(fallbacks[fallbackNeeded.indexOf("GOLD")]?.price) || defaults.GOLD),
    SILVER: live.SILVER?.price ?? (Number(fallbacks[fallbackNeeded.indexOf("SILVER")]?.price) || defaults.SILVER),
    PLATINUM: live.PLATINUM?.price ?? (Number(fallbacks[fallbackNeeded.indexOf("PLATINUM")]?.price) || defaults.PLATINUM),
    PALLADIUM: live.PALLADIUM?.price ?? (Number(fallbacks[fallbackNeeded.indexOf("PALLADIUM")]?.price) || defaults.PALLADIUM),
    ...FIXED_PRICES,
  } as SpotPriceMap;

  cache = { prices, fetchedAt: Date.now() };
  return prices;
}

async function persistSpotPrices(live: Partial<Record<keyof SpotPriceMap, { price: number; source: string }>>) {
  const data = (Object.entries(live) as [keyof SpotPriceMap, { price: number; source: string }][])
    .map(([metal, { price, source }]) => ({
      metal: Metal[metal as "GOLD" | "SILVER" | "PLATINUM" | "PALLADIUM"],
      price,
      currency: "USD",
      source,
    }));
  if (data.length > 0) await prisma.spotPrice.createMany({ data });
}

export function calculateProductPrice(
  spotPrice: number,
  weight: number,
  premiumPercent: number,
  premiumFixed: number,
  fixedUnitPrice?: number | null
): number {
  if (fixedUnitPrice != null) return fixedUnitPrice;
  const basePrice = spotPrice * weight;
  return basePrice * (1 + premiumPercent) + premiumFixed;
}

export interface TierLike {
  minQty: number;
  premiumPercent: number | null;
  fixedUnitPrice: number | null;
}

export function priceForQuantity(
  spotPrice: number,
  weight: number,
  premiumPercent: number,
  premiumFixed: number,
  fixedUnitPrice: number | null,
  tiers: TierLike[],
  quantity: number
): number {
  const sorted = [...tiers].sort((a, b) => b.minQty - a.minQty);
  const tier   = sorted.find(t => quantity >= t.minQty);
  if (tier) {
    if (tier.fixedUnitPrice != null) return tier.fixedUnitPrice;
    if (tier.premiumPercent != null)
      return calculateProductPrice(spotPrice, weight, tier.premiumPercent, premiumFixed, null);
  }
  return calculateProductPrice(spotPrice, weight, premiumPercent, premiumFixed, fixedUnitPrice);
}
