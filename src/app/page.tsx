import { auth } from "@/lib/auth";
import Link from "next/link";
import Image from "next/image";
import { NewReleasesBanner } from "@/components/dashboard/new-releases-banner";

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = !!session;
  const isAdmin = isAuthenticated && ["SUPER_ADMIN", "ADMIN"].includes((session!.user as any).role);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-amber-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/OIP-removebg-preview.png" alt="Van Central Mint" width={32} height={32} className="rounded-full" />
            <span className="font-bold text-lg">Wholesale Platform</span>
          </div>
          {isAuthenticated && (
            <nav className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-amber-300 hover:text-white">Dashboard</Link>
              <Link href="/catalog" className="bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                Catalog
              </Link>
            </nav>
          )}
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

      <main className="hidden md:block max-w-7xl mx-auto px-4 py-10">
        <NewReleasesBanner isAdmin={isAdmin} />
      </main>

      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Van Central Mint Inc. All rights reserved. | B2B Wholesale Platform
        </div>
      </footer>
    </div>
  );
}
