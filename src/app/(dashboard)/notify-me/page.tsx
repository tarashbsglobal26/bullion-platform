"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { metalLabel } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { Bell, Trash2, Package, CheckCircle2, User } from "lucide-react";

const METAL_COLORS: Record<string, string> = {
  GOLD:          "bg-amber-100 text-amber-800",
  SILVER:        "bg-gray-100 text-gray-700",
  PLATINUM:      "bg-blue-100 text-blue-800",
  PALLADIUM:     "bg-purple-100 text-purple-800",
  NICKEL_SILVER: "bg-teal-100 text-teal-800",
};

export default function NotifyMePage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes((session?.user as any)?.role);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notify-me"],
    queryFn: async () => {
      const res = await fetch("/api/notify-me");
      return res.json();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notify-me/${notificationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notify-me"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notify Me</h1>
        <p className="text-gray-500 text-sm">
          {isAdmin
            ? "All client requests to be notified when out-of-stock products are restocked"
            : "Products you've asked to be notified about when back in stock"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-20" />)}
        </div>
      ) : notifications?.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No notification requests yet.</p>
          <Link href="/catalog" className="text-amber-600 hover:underline text-sm mt-2 inline-block">Browse the catalog</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications?.map((n: any) => {
            const backInStock = n.product.availableQty >= n.quantity;
            return (
              <Card key={n.id}>
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{n.product.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${METAL_COLORS[n.product.metal] ?? "bg-gray-100 text-gray-700"}`}>
                        {metalLabel(n.product.metal)}
                      </span>
                      {backInStock && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Back in stock
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{n.product.sku} · {n.product.mint}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Requested <span className="font-medium text-gray-600">{n.quantity} unit{n.quantity !== 1 ? "s" : ""}</span> · {n.product.availableQty} currently in stock · asked {format(new Date(n.createdAt), "MMM d, yyyy")}
                    </p>
                    {isAdmin && n.requestedBy && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {n.requestedBy.name ?? n.requestedBy.email}
                        {n.requestedBy.business?.name ? ` · ${n.requestedBy.business.name}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isAdmin && backInStock && (
                      <Link href="/catalog">
                        <Button size="sm">Go to Catalog</Button>
                      </Link>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => removeMutation.mutate(n.id)}
                        disabled={removeMutation.isPending}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
