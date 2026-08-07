import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, metalLabel, formatWeight } from "@/lib/utils";
import { ShoppingCart, FileText, Package, Building2, DollarSign, ArrowRight, Star, Shield, TrendingUp, Medal, Gem, CircleDollarSign, Bell, BadgeCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { getLatestSpotPrices, calculateProductPrice } from "@/lib/spot-prices";
import { ProductCategory } from "@prisma/client";
import { NewReleasesBanner } from "@/components/dashboard/new-releases-banner";

const SECTION_META: Record<string, { label: string; description: string; accent: string; icon: React.ElementType }> = {
  new2026:              { label: "New Releases 2026 — Coming Soon", description: "Latest 2026-dated coins", accent: "amber",  icon: Star },
  BULLION_SILVER:       { label: "Bullion Silver",        description: "Investment-grade silver",                    accent: "gray",   icon: Shield },
  BULLION_GOLD:         { label: "Bullion Gold",          description: "Pure gold bullion coins",                    accent: "yellow", icon: TrendingUp },
  COMMEMORATIVE_GOLD:   { label: "Commemorative Gold",   description: "Limited-edition proof gold",                 accent: "amber",  icon: Medal },
  COMMEMORATIVE_SILVER: { label: "Commemorative Silver", description: "Proof and collector silver",                 accent: "blue",   icon: Gem },
  NON_PRECIOUS:         { label: "Non-precious",          description: "Nickel silver & specialty alloys",           accent: "teal",   icon: CircleDollarSign },
};

const METAL_BADGE: Record<string, string> = {
  GOLD:         "bg-amber-100 text-amber-800",
  SILVER:       "bg-gray-100 text-gray-700",
  PLATINUM:     "bg-blue-100 text-blue-800",
  PALLADIUM:    "bg-purple-100 text-purple-800",
  NICKEL_SILVER:"bg-teal-100 text-teal-800",
};

const ACCENT_CLASSES: Record<string, { icon: string; bar: string; header: string }> = {
  amber:  { icon: "bg-amber-100 text-amber-700",  bar: "bg-amber-500",  header: "text-amber-700"  },
  gray:   { icon: "bg-gray-100 text-gray-600",    bar: "bg-gray-400",   header: "text-gray-700"   },
  yellow: { icon: "bg-yellow-100 text-yellow-700",bar: "bg-yellow-400", header: "text-yellow-700" },
  blue:   { icon: "bg-blue-100 text-blue-700",    bar: "bg-blue-400",   header: "text-blue-700"   },
  teal:   { icon: "bg-teal-100 text-teal-700",    bar: "bg-teal-400",   header: "text-teal-700"   },
};

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user as any;
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);

  const [orderStats, quoteCount, inventoryAlerts, pendingBusinesses, verifiedBusinesses, notifyRequestCount, recentOrders, allProducts, spotPrices] =
    await Promise.all([
      prisma.order.aggregate({
        where: isAdmin ? {} : { businessId: user.businessId },
        _count: true,
        _sum: { total: true },
      }),
      prisma.quote.count({ where: { status: "ACTIVE", ...(isAdmin ? {} : { businessId: user.businessId }) } }),
      isAdmin ? prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }) : Promise.resolve(0),
      isAdmin ? prisma.business.count({ where: { status: "UNDER_REVIEW" } }) : Promise.resolve(0),
      isAdmin ? prisma.business.count({ where: { status: "VERIFIED" } }) : Promise.resolve(0),
      isAdmin ? prisma.stockNotification.count() : prisma.stockNotification.count({ where: { userId: user.id } }),
      prisma.order.findMany({
        where: isAdmin ? {} : { businessId: user.businessId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { business: { select: { name: true } } },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        include: { inventory: { select: { quantity: true, reserved: true } } },
        orderBy: [{ year: "desc" }, { name: "asc" }],
      }),
      getLatestSpotPrices(),
    ]);

  const stats = [
    { label: "Total Orders",  value: orderStats._count, icon: ShoppingCart, color: "text-blue-600",   bg: "bg-blue-50"   },
    { label: "Total Amount", value: formatCurrency(Number(orderStats._sum.total ?? 0)), icon: DollarSign, color: "text-green-600",  bg: "bg-green-50"  },
    { label: "Active Quotes", value: quoteCount,        icon: FileText,     color: "text-amber-600",  bg: "bg-amber-50"  },
    { label: isAdmin ? "Notify Me Requests" : "Notify Me", value: notifyRequestCount, icon: Bell, color: "text-teal-600", bg: "bg-teal-50" },
    ...(isAdmin ? [
      { label: "Low Stock SKUs", value: inventoryAlerts,    icon: Package,   color: "text-red-600",    bg: "bg-red-50"    },
      { label: "Pending KYC",    value: pendingBusinesses,  icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Verified Businesses", value: verifiedBusinesses, icon: BadgeCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    ] : []),
  ];

  const statusVariant: Record<string, any> = {
    PENDING_APPROVAL: "warning", CONFIRMED: "secondary", PROCESSING: "secondary",
    SHIPPED: "default", DELIVERED: "success", CANCELLED: "destructive",
  };

  const byCategory = (cat: ProductCategory) => allProducts.filter((p) => p.category === cat);
  const sections: Array<{ key: string; products: typeof allProducts }> = [
    { key: "new2026",              products: [] },
    { key: "BULLION_SILVER",       products: byCategory(ProductCategory.BULLION_SILVER) },
    { key: "BULLION_GOLD",         products: byCategory(ProductCategory.BULLION_GOLD) },
    { key: "COMMEMORATIVE_GOLD",   products: byCategory(ProductCategory.COMMEMORATIVE_GOLD) },
    { key: "COMMEMORATIVE_SILVER", products: byCategory(ProductCategory.COMMEMORATIVE_SILVER) },
    { key: "NON_PRECIOUS",         products: byCategory(ProductCategory.NON_PRECIOUS) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name || user.email}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-2.5 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/orders" className="text-sm text-amber-600 hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No orders yet</p>
          ) : (
            <div className="divide-y">
              {recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-medium text-sm hover:text-amber-600">
                      {order.orderNumber}
                    </Link>
                    {isAdmin && <p className="text-xs text-gray-400">{order.business.name}</p>}
                    <p className="text-xs text-gray-400">{format(order.createdAt, "MMM d, yyyy")}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <Badge variant={statusVariant[order.status] ?? "outline"} className="text-xs">
                      {order.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm font-semibold">{formatCurrency(Number(order.total))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product sections */}
      {sections.map(({ key, products }) => {
        if (products.length === 0 && key !== "new2026") return null;
        const meta = SECTION_META[key];
        const ac = ACCENT_CLASSES[meta.accent] ?? ACCENT_CLASSES.gray;
        const Icon = meta.icon;

        return (
          <section key={key}>
            {/* Section header */}
            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ac.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{meta.label}</h2>
                  <p className="text-xs text-gray-500">{meta.description}</p>
                </div>
              </div>
              <Link href="/catalog" className={`text-sm font-medium flex items-center gap-1 ${ac.header}`}>
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Coming Soon banner for New Releases 2026 */}
            {key === "new2026" ? (
              <NewReleasesBanner isAdmin={isAdmin} />
            ) : (
            /* Products grouped by mint */
            (() => {
              const byMint = products.reduce<Record<string, typeof products>>((acc, p) => {
                (acc[p.mint] ??= []).push(p);
                return acc;
              }, {});

              const sortedMints = Object.entries(byMint).sort(([a], [b]) => {
                if (a === "The National Bank of Ukraine") return -1;
                if (b === "The National Bank of Ukraine") return 1;
                return a.localeCompare(b);
              });

              return sortedMints.map(([mint, mintProducts]) => (
                <div key={mint} className="mb-4">
                  {/* Mint subsection header */}
                  <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200`}>
                    <div className={`w-1.5 h-4 rounded-full ${ac.bar}`} />
                    <h3 className="text-sm font-semibold text-gray-700">{mint}</h3>
                    <span className="text-xs text-gray-400">{mintProducts.length} product{mintProducts.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mintProducts.map((p) => {
                      const spot = spotPrices[p.metal as keyof typeof spotPrices];
                      const price = calculateProductPrice(
                        spot ?? 0,
                        Number(p.weight),
                        Number(p.premiumPercent),
                        Number(p.premiumFixed),
                        p.fixedUnitPrice ? Number(p.fixedUnitPrice) : null
                      );
                      const available = p.inventory.reduce((s, i) => s + i.quantity - i.reserved, 0);

                      return (
                        <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className={`h-1 ${ac.bar}`} />
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-sm text-gray-900 leading-tight">{p.name}</h3>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${METAL_BADGE[p.metal] ?? "bg-gray-100 text-gray-700"}`}>
                                {metalLabel(p.metal)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">{p.year}</p>
                            <div className="space-y-1 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Weight</span>
                                <span className="font-medium">{formatWeight(Number(p.weight), p.weightUnit)}</span>
                              </div>
                              {p.metal !== "NICKEL_SILVER" && (
                                <div className="flex justify-between">
                                  <span>Purity</span>
                                  <span className="font-medium">{(Number(p.purity) * 100).toFixed(2)}%</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t pt-1.5 mt-1">
                                <span className="font-semibold text-gray-900">
                                  {p.fixedUnitPrice ? "Fixed Price" : "Unit Price"}
                                </span>
                                <span className="font-bold text-amber-700">{formatCurrency(price)}</span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className={`text-xs ${available > 0 ? "text-green-600" : "text-red-400"}`}>
                                {available > 0 ? `${available} in stock` : "Out of stock"}
                              </span>
                              <Link href="/catalog" className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1">
                                View <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
            )}
          </section>
        );
      })}
    </div>
  );
}
