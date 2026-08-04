"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, metalLabel } from "@/lib/utils";

interface SpotPrices {
  GOLD: number;
  SILVER: number;
  PLATINUM: number;
  PALLADIUM: number;
}

const METAL_COLORS: Record<string, string> = {
  GOLD: "text-amber-600",
  SILVER: "text-gray-400",
  PLATINUM: "text-blue-400",
  PALLADIUM: "text-purple-400",
};

export function SpotTicker() {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [prev, setPrev] = useState<SpotPrices | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/spot-prices");
        if (res.ok) {
          const data = await res.json();
          setPrev(prices);
          setPrices(data.current);
          setAsOf(data.asOf);
        }
      } catch {}
    };
    fetch_();
    const t = setInterval(fetch_, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!prices) {
    return (
      <div className="bg-gray-900 text-gray-400 px-6 py-2 text-sm flex gap-6">
        {["GOLD", "SILVER", "PLATINUM", "PALLADIUM"].map((m) => (
          <span key={m} className="animate-pulse">{metalLabel(m)}: loading…</span>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white px-6 py-2 text-sm flex flex-wrap gap-6 items-center">
      <span className="text-gray-400 text-xs uppercase tracking-wider">Live Spot</span>
      {asOf && (
        <span className="text-gray-500 text-xs">
          as of {new Date(asOf).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      )}
      {(["GOLD", "SILVER", "PLATINUM", "PALLADIUM"] as const).map((metal) => {
        const current = prices[metal];
        const prevVal = prev?.[metal];
        const up = prevVal !== undefined && current > prevVal;
        const down = prevVal !== undefined && current < prevVal;
        return (
          <span key={metal} className="flex items-center gap-1.5">
            <span className={`font-semibold ${METAL_COLORS[metal]}`}>{metalLabel(metal)}</span>
            <span className="font-mono">{formatCurrency(current)}/oz</span>
            {up && <TrendingUp className="w-3 h-3 text-green-400" />}
            {down && <TrendingDown className="w-3 h-3 text-red-400" />}
          </span>
        );
      })}
    </div>
  );
}
