"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Coins,
  ShoppingCart,
  FileText,
  Package,
  Building2,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
  { href: "/catalog", label: "Catalog", icon: Coins, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
  { href: "/quotes", label: "Quotes", icon: FileText, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
  { href: "/notify-me", label: "Notify Me", icon: Bell, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/businesses", label: "Businesses", icon: Building2, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/spot-prices", label: "Spot Prices", icon: TrendingUp, roles: ["SUPER_ADMIN", "ADMIN", "BUSINESS_OWNER", "BUYER"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "BUYER";

  const visible = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Image
            src="/OIP-removebg-preview.png"
            alt="Van Central Mint logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          <div>
            <p className="font-bold text-sm leading-tight">WHOLESALE</p>
            <p className="text-xs text-amber-400 leading-tight">B2B PLATFORM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-amber-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-700">
        <div className="px-3 py-2 text-xs text-gray-400 mb-1 truncate">{session?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
