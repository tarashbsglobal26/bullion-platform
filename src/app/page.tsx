import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLatestSpotPrices, calculateProductPrice, SpotPriceMap } from "@/lib/spot-prices";
import { formatCurrency, formatWeight } from "@/lib/utils";
import { ProductCategory } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Lock, Star, Shield, TrendingUp,
  Medal, Gem, CircleDollarSign
} from "lucide-react";

async function getProducts() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { inventory: { select: { quantity: true, reserved: true } } },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });
  return products;
}

const SECTION_META: Record<string, { label: string; description: string; icon: string; accent: string }> = {
  new2026:         { label: "New Releases 2026",    description: "The latest coins freshly minted in 2026",         icon: "star",    accent: "amber"  },
  BULLION_SILVER:  { label: "Bullion Silver",        description: "Investment-grade silver coins & bars",            icon: "shield",  accent: "gray"   },
  BULLION_GOLD:    { label: "Bullion Gold",          description: "Pure gold bullion coins for serious investors",   icon: "trending",accent: "yellow" },
  COMMEMORATIVE_GOLD:   { label: "Commemorative Gold",   description: "Limited-edition proof gold collectibles",    icon: "medal",   accent: "amber"  },
  COMMEMORATIVE_SILVER: { label: "Commemorative Silver", description: "Proof and collector-grade silver pieces",    icon: "gem",     accent: "blue"   },
  NON_PRECIOUS:    { label: "Non-precious",          description: "Platinum, palladium and specialty metals",        icon: "circle",  accent: "purple" },
};

const METAL_BADGE: Record<string, string> = {
  GOLD: "bg-amber-100 text-amber-800",
  SILVER: "bg-gray-100 text-gray-700",
  PLATINUM: "bg-blue-100 text-blue-800",
  PALLADIUM: "bg-purple-100 text-purple-800",
  NICKEL_SILVER: "bg-teal-100 text-teal-800",
};

function SectionIcon({ icon }: { icon: string }) {
  const cls = "w-5 h-5";
  if (icon === "star")     return <Star className={cls} />;
  if (icon === "shield")   return <Shield className={cls} />;
  if (icon === "trending") return <TrendingUp className={cls} />;
  if (icon === "medal")    return <Medal className={cls} />;
  if (icon === "gem")      return <Gem className={cls} />;
  return <CircleDollarSign className={cls} />;
}

function ProductCard({
  product,
  spotPrice,
  isAuthenticated,
}: {
  product: any;
  spotPrice?: number;
  isAuthenticated: boolean;
}) {
  const price = spotPrice
    ? calculateProductPrice(spotPrice, Number(product.weight), Number(product.premiumPercent), Number(product.premiumFixed), product.fixedUnitPrice ? Number(product.fixedUnitPrice) : null)
    : product.fixedUnitPrice ? Number(product.fixedUnitPrice) : null;
  const available = product.inventory.reduce((s: number, i: any) => s + i.quantity - i.reserved, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      <div className={`h-1.5 ${
        product.metal === "GOLD"          ? "bg-gradient-to-r from-amber-400 to-yellow-500" :
        product.metal === "SILVER"        ? "bg-gradient-to-r from-gray-300 to-gray-400" :
        product.metal === "PLATINUM"      ? "bg-gradient-to-r from-blue-300 to-blue-400" :
        product.metal === "NICKEL_SILVER" ? "bg-gradient-to-r from-teal-300 to-teal-400" :
        "bg-gradient-to-r from-purple-300 to-purple-400"
      }`} />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${METAL_BADGE[product.metal]}`}>
            {product.metal.charAt(0) + product.metal.slice(1).toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3">{product.mint} · {product.year}</p>

        <div className="space-y-1 text-xs text-gray-600 mb-3">
          <div className="flex justify-between">
            <span>Weight</span>
            <span className="font-medium">{formatWeight(product.weight, product.weightUnit)}</span>
          </div>
          {product.metal !== "NICKEL_SILVER" && (
            <div className="flex justify-between">
              <span>Purity</span>
              <span className="font-medium">{(Number(product.purity) * 100).toFixed(2)}%</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="font-semibold text-gray-900">Price</span>
            {isAuthenticated && price ? (
              <span className="font-bold text-amber-700">{formatCurrency(price)}</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <Lock className="w-3 h-3" /> Login
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <span className={`text-xs ${available > 0 ? "text-green-600" : "text-red-400"}`}>
            {available > 0 ? `${available} in stock` : "Out of stock"}
          </span>
          {isAuthenticated ? (
            <Link href="/catalog" className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <Link href="/login" className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-1">
              Quote <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  sectionKey,
  products,
  spotPrices,
  isAuthenticated,
}: {
  sectionKey: string;
  products: any[];
  spotPrices: SpotPriceMap;
  isAuthenticated: boolean;
}) {
  if (products.length === 0) return null;
  const meta = SECTION_META[sectionKey];

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            meta.accent === "amber"  ? "bg-amber-100 text-amber-700" :
            meta.accent === "gray"   ? "bg-gray-100 text-gray-600" :
            meta.accent === "yellow" ? "bg-yellow-100 text-yellow-700" :
            meta.accent === "blue"   ? "bg-blue-100 text-blue-700" :
            meta.accent === "purple" ? "bg-purple-100 text-purple-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            <SectionIcon icon={meta.icon} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{meta.label}</h2>
            <p className="text-xs text-gray-500">{meta.description}</p>
          </div>
        </div>
        <Link
          href={isAuthenticated ? "/catalog" : "/login"}
          className="text-sm text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.slice(0, 4).map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            spotPrice={spotPrices[p.metal as keyof SpotPriceMap]}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = !!session;

  const products = await getProducts();
  const spotPrices = await getLatestSpotPrices();

  const new2026 = products.filter((p) => p.year === 2026);
  const byCategory = (cat: ProductCategory) => products.filter((p) => p.category === cat);

  const sections: Array<{ key: string; products: any[] }> = [
    { key: "new2026",                   products: new2026 },
    { key: "BULLION_SILVER",            products: byCategory(ProductCategory.BULLION_SILVER) },
    { key: "BULLION_GOLD",              products: byCategory(ProductCategory.BULLION_GOLD) },
    { key: "COMMEMORATIVE_GOLD",        products: byCategory(ProductCategory.COMMEMORATIVE_GOLD) },
    { key: "COMMEMORATIVE_SILVER",      products: byCategory(ProductCategory.COMMEMORATIVE_SILVER) },
    { key: "NON_PRECIOUS",              products: byCategory(ProductCategory.NON_PRECIOUS) },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-amber-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/OIP-removebg-preview.png" alt="Van Central Mint" width={32} height={32} className="rounded-full" />
            <span className="font-bold text-lg">Wholesale Platform</span>
          </div>
          <nav className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" className="text-sm text-amber-300 hover:text-white">Dashboard</Link>
                <Link href="/catalog" className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                  Catalog
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-300 hover:text-white">Sign In</Link>
                <Link href="/register" className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Hero */}
        <div className="max-w-7xl mx-auto px-4 py-12 pb-14">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-3 leading-tight">
              Premium Bullion Coins,<br />
              <span className="text-amber-400">Investment Bars & Collectible Editions</span>
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              B2B wholesale pricing on gold, silver, platinum and palladium. Live spot prices updated every 5 minutes.
            </p>
            {!isAuthenticated && (
              <div className="flex gap-3">
                <Link href="/register" className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
                  Register Your Business
                </Link>
                <Link href="/login" className="border border-gray-500 hover:border-amber-400 text-gray-300 hover:text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spot prices bar */}
      <div className="bg-gray-800 text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap gap-6">
          {(["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "NICKEL_SILVER"] as const).map((metal) => (
            <div key={metal} className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">{metal}</span>
              {isAuthenticated ? (
                <span className="font-medium text-amber-400">{formatCurrency(spotPrices[metal])}/oz</span>
              ) : (
                <span className="text-gray-500 flex items-center gap-1 text-xs"><Lock className="w-3 h-3" /> Login to view</span>
              )}
            </div>
          ))}
          <span className="text-gray-500 text-xs ml-auto">Live spot · updated every 5 min</span>
        </div>
      </div>

      {/* Product sections */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        {!isAuthenticated && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-900">View live pricing & request quotes</p>
              <p className="text-sm text-amber-700">Register your business to access wholesale pricing and place orders.</p>
            </div>
            <Link href="/register" className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-5 py-2 rounded-lg text-sm whitespace-nowrap">
              Register Now
            </Link>
          </div>
        )}

        {sections.map(({ key, products: sectionProducts }) => (
          <Section
            key={key}
            sectionKey={key}
            products={sectionProducts}
            spotPrices={spotPrices}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Wholesale Platform · B2B Precious Metals Wholesale
        </div>
      </footer>
    </div>
  );
}
