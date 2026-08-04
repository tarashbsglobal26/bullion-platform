"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, FileDown, Package, Trash2 } from "lucide-react";

const DELETABLE_STATUSES = ["DRAFT", "PENDING_APPROVAL"];

const STATUS_VARIANT: Record<string, any> = {
  PENDING_APPROVAL: "warning",
  CONFIRMED: "secondary",
  PROCESSING: "secondary",
  SHIPPED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const STATUSES = ["PENDING_APPROVAL", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const user = (session?.user as any) ?? {};
  const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["orders", id],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Order not found");
      return res.json();
    },
  });

  const [status, setStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (order && !initialized) {
    setStatus(order.status);
    setTrackingNumber(order.trackingNumber ?? "");
    setCarrier(order.carrier ?? "");
    setInitialized(true);
  }

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, trackingNumber, carrier }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      window.location.href = "/orders";
    },
  });

  const deleteOrder = () => {
    if (!order || !confirm(`Delete order ${order.orderNumber}? This cannot be undone.`)) return;
    deleteMutation.mutate();
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;
  }

  if (!order) {
    return (
      <div className="py-16 text-center text-gray-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Order not found</p>
        <Link href="/orders" className="text-amber-600 hover:underline text-sm mt-2 inline-block">Back to Orders</Link>
      </div>
    );
  }

  const address = order.shippingAddress as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-amber-600 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
            <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status.replace(/_/g, " ")}</Badge>
            {order.invoice && (
              <Badge variant={order.invoice.paidAt ? "success" : "warning"}>
                {order.invoice.paidAt ? "PAID" : "UNPAID"}
              </Badge>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {order.business?.name && `${order.business.name} · `}
            Placed {format(new Date(order.createdAt), "MMM d, yyyy HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {order.invoice && (
            <a href={`/api/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
              <Button variant="outline" className="gap-2">
                <FileDown className="w-4 h-4" /> Download Invoice
              </Button>
            </a>
          )}
          {isAdmin && DELETABLE_STATUSES.includes(order.status) && (
            <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50"
              onClick={deleteOrder} disabled={deleteMutation.isPending}>
              <Trash2 className="w-4 h-4" /> {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-left px-5 py-3">SKU</th>
                    <th className="text-right px-5 py-3">Qty</th>
                    <th className="text-right px-5 py-3">Unit Price</th>
                    <th className="text-right px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 font-medium">{item.product.name}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{item.product.sku}</td>
                      <td className="px-5 py-3 text-right">{item.quantity}</td>
                      <td className="px-5 py-3 text-right">{formatCurrency(Number(item.unitPrice))}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatCurrency(Number(item.totalPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {address && (
            <Card>
              <CardHeader><CardTitle>Shipping Address</CardTitle></CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-0.5">
                <p>{address.street1}{address.street2 ? `, ${address.street2}` : ""}</p>
                <p>{address.city}{address.state ? `, ${address.state}` : ""} {address.postalCode}</p>
                <p>{address.country}</p>
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card>
              <CardHeader><CardTitle>Manage Order</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm bg-white"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Carrier</label>
                    <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. FedEx" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">Tracking Number</label>
                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
                {updateMutation.isError && (
                  <p className="text-red-500 text-xs">{(updateMutation.error as Error).message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {!isAdmin && order.trackingNumber && (
            <Card>
              <CardHeader><CardTitle>Tracking</CardTitle></CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>{order.carrier ? `${order.carrier} · ` : ""}{order.trackingNumber}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(Number(order.subtotal))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tax</span>
              <span className="font-medium">{formatCurrency(Number(order.taxAmount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipping</span>
              <span className="font-medium">{formatCurrency(Number(order.shippingCost))}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-amber-700 text-lg">{formatCurrency(Number(order.total))}</span>
            </div>
            {order.invoice && (
              <div className="border-t pt-2 mt-2 text-xs text-gray-400 space-y-0.5">
                <p>Invoice: {order.invoice.invoiceNumber}</p>
                <p>Due: {format(new Date(order.invoice.dueAt), "MMM d, yyyy")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
