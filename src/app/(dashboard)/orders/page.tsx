"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { FileDown, Eye, Package, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSession } from "next-auth/react";

const DELETABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL"];

const STATUS_VARIANT: Record<string, any> = {
  PENDING_APPROVAL: "warning",
  CONFIRMED: "secondary",
  PROCESSING: "secondary",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const STATUSES = ["", "PENDING_APPROVAL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes((session?.user as any)?.role);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/orders${params}`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete order");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
    onSettled: () => setDeletingId(null),
  });

  const deleteOrder = (order: any) => {
    if (!confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) return;
    setDeletingId(order.id);
    deleteMutation.mutate(order.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-gray-500 text-sm">Track and manage your orders</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-amber-400"
            }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse h-20 bg-gray-100" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {orders?.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No orders found</p>
              </div>
            ) : (
              <div className="divide-y">
                {orders?.map((order: any) => (
                  <div key={order.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link href={`/orders/${order.id}`} className="font-semibold hover:text-amber-600">
                          {order.orderNumber}
                        </Link>
                        <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                        {order.invoice && (
                          <Badge variant={order.invoice.paidAt ? "success" : "warning"}>
                            {order.invoice.paidAt ? "PAID" : "UNPAID"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {order.business?.name && `${order.business.name} · `}
                        {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} ·{" "}
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(Number(order.total))}</p>
                      <div className="flex gap-2 mt-1">
                        <Link href={`/orders/${order.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                        </Link>
                        {order.invoice && (
                          <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline">
                              <FileDown className="w-3 h-3 mr-1" /> Invoice
                            </Button>
                          </a>
                        )}
                        {isAdmin && DELETABLE_STATUSES.includes(order.status) && (
                          <Button size="sm" variant="outline"
                            onClick={() => deleteOrder(order)}
                            disabled={deletingId === order.id}
                            className="text-red-500 border-red-200 hover:bg-red-50">
                            <Trash2 className="w-3 h-3 mr-1" /> {deletingId === order.id ? "Deleting…" : "Delete"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
