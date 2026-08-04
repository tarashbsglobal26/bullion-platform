"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, metalLabel } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

const METALS = ["GOLD", "SILVER", "PLATINUM", "PALLADIUM"] as const;

const METAL_COLORS: Record<string, string> = {
  GOLD:      "#d97706",
  SILVER:    "#6b7280",
  PLATINUM:  "#3b82f6",
  PALLADIUM: "#8b5cf6",
};

export default function SpotPricesPage() {
  const [selected, setSelected] = useState<string>("GOLD");

  const { data, isLoading } = useQuery({
    queryKey: ["spot-prices"],
    queryFn: async () => {
      const res = await fetch("/api/spot-prices");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const seriesByMetal = useMemo(() => {
    const result: Record<string, { timestamp: string; price: number }[]> = {};
    for (const m of METALS) result[m] = [];
    for (const h of data?.history ?? []) {
      if (result[h.metal]) result[h.metal].push({ timestamp: h.timestamp, price: Number(h.price) });
    }
    return result;
  }, [data]);

  const changeFor = (metal: string) => {
    const series = seriesByMetal[metal];
    if (!series || series.length < 2) return null;
    const first = series[0].price;
    const last = series[series.length - 1].price;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  };

  const chartData = (seriesByMetal[selected] ?? []).map((p) => ({
    time: format(new Date(p.timestamp), "HH:mm"),
    price: p.price,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Spot Prices</h1>
        <p className="text-gray-500 text-sm">
          Live precious metal spot prices · updated every 5 minutes
          {data?.asOf && (
            <> · as of {new Date(data.asOf).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
          )}
        </p>
      </div>

      {/* Current price cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METALS.map((metal) => {
          const price  = data?.current?.[metal];
          const change = changeFor(metal);
          const sparkline = (seriesByMetal[metal] ?? []).map((p) => ({ price: p.price }));
          const isSelected = selected === metal;

          return (
            <Card
              key={metal}
              onClick={() => setSelected(metal)}
              className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-amber-500" : "hover:shadow-md"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{metalLabel(metal)}</span>
                  {change != null && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${
                      change > 0 ? "text-green-600" : change < 0 ? "text-red-500" : "text-gray-400"
                    }`}>
                      {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {change > 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-7 w-24 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-bold text-gray-900">{price != null ? formatCurrency(price) : "—"}<span className="text-sm font-normal text-gray-400">/oz</span></p>
                )}
                {sparkline.length > 1 && (
                  <div className="h-10 mt-2 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkline}>
                        <Line type="monotone" dataKey="price" stroke={METAL_COLORS[metal]} strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail chart */}
      <Card>
        <CardHeader>
          <CardTitle>{metalLabel(selected)} · 24h Price History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 bg-gray-100 rounded-xl animate-pulse" />
          ) : chartData.length < 2 ? (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">
              Not enough price history yet — check back after a few refresh cycles.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={80}
                  />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Time: ${l}`} />
                  <Line type="monotone" dataKey="price" stroke={METAL_COLORS[selected]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Gold from{" "}
        <a href="https://twelvedata.com" target="_blank" rel="noreferrer" className="hover:text-amber-600 underline">
          Twelve Data
        </a>
        {" "}· Silver, Platinum &amp; Palladium from{" "}
        <a href="https://gold-api.com" target="_blank" rel="noreferrer" className="hover:text-amber-600 underline">
          gold-api.com
        </a>
        {" "}· Nickel Silver uses a fixed reference price (no live spot market)
      </p>
    </div>
  );
}
