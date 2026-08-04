"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { FileText, ShoppingCart, Clock, Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const STATUS_VARIANT: Record<string, any> = {
  ACTIVE: "success",
  CONVERTED: "secondary",
  EXPIRED: "outline",
  CANCELLED: "destructive",
};

export default function QuotesPage() {
  const [converting, setConverting] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    street1: "", city: "", postalCode: "", country: "US",
  });
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const res = await fetch("/api/quotes");
      return res.json();
    },
  });

  const convertMutation = useMutation({
    mutationFn: async ({ quoteId, shippingAddress }: any) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId, shippingAddress }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setConverting(null);
      window.location.href = `/orders/${order.id}`;
    },
  });

  const updateQtyMutation = useMutation({
    mutationFn: async ({ quoteId, itemId, quantity }: { quoteId: string; itemId: string; quantity: number }) => {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (!res.ok) throw new Error("Failed to update quantity");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete quote");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
    onSettled: () => setDeletingId(null),
  });

  const deleteQuote = (quote: any) => {
    const message = quote.order
      ? `Quote ${quote.quoteNumber} has been converted to order ${quote.order.orderNumber}. Deleting it will also permanently delete that order and its invoice. This cannot be undone. Continue?`
      : `Delete quote ${quote.quoteNumber}? This cannot be undone.`;
    if (!confirm(message)) return;
    setDeletingId(quote.id);
    deleteMutation.mutate(quote.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-gray-500 text-sm">Quotes lock in live spot prices for 30 minutes</p>
        </div>
        <Link href="/catalog">
          <Button className="gap-2">
            <ShoppingCart className="w-4 h-4" /> New Quote
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-24" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {quotes?.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No quotes yet. Browse the catalog to get a quote.</p>
            </div>
          )}
          {quotes?.map((quote: any) => (
            <Card key={quote.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold">{quote.quoteNumber}</span>
                      <Badge variant={STATUS_VARIANT[quote.status]}>{quote.status}</Badge>
                      {quote.status === "ACTIVE" && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {formatDistanceToNow(new Date(quote.expiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {quote.business && <p className="text-sm text-gray-500">{quote.business.name}</p>}
                    <p className="text-xs text-gray-400">{format(new Date(quote.createdAt), "MMM d, yyyy HH:mm")}</p>
                    <div className="mt-2 space-y-1.5">
                      {quote.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600">
                          {quote.status === "ACTIVE" ? (
                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                              <button type="button"
                                onClick={() => updateQtyMutation.mutate({ quoteId: quote.id, itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                                disabled={updateQtyMutation.isPending || item.quantity <= 1}
                                className="px-1.5 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const q = parseInt(e.target.value);
                                  if (q > 0) updateQtyMutation.mutate({ quoteId: quote.id, itemId: item.id, quantity: q });
                                }}
                                disabled={updateQtyMutation.isPending}
                                className="w-10 text-center text-sm border-x border-gray-200 py-1 focus:outline-none"
                              />
                              <button type="button"
                                onClick={() => updateQtyMutation.mutate({ quoteId: quote.id, itemId: item.id, quantity: item.quantity + 1 })}
                                disabled={updateQtyMutation.isPending}
                                className="px-1.5 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span>{item.quantity}×</span>
                          )}
                          <span>{item.product?.name} @ {formatCurrency(Number(item.unitPrice))} each</span>
                        </div>
                      ))}
                    </div>
                    {quote.order && (
                      <p className="text-xs text-gray-400 mt-1">
                        Converted to order:{" "}
                        <Link href={`/orders/${quote.order.id}`} className="text-amber-600 hover:underline">
                          {quote.order.orderNumber}
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl">{formatCurrency(Number(quote.total))}</p>
                    <div className="flex items-center justify-end gap-2 mt-2">
                      {quote.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          onClick={() => setConverting(quote.id)}
                        >
                          Convert to Order
                        </Button>
                      )}
                      <button
                        onClick={() => deleteQuote(quote)}
                        disabled={deletingId === quote.id}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === quote.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {converting === quote.id && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium mb-3">Shipping Address</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <input
                          className="w-full h-9 border rounded-md px-3 text-sm"
                          placeholder="Street address"
                          value={shippingAddress.street1}
                          onChange={(e) => setShippingAddress((a) => ({ ...a, street1: e.target.value }))}
                        />
                      </div>
                      <input
                        className="h-9 border rounded-md px-3 text-sm"
                        placeholder="City"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress((a) => ({ ...a, city: e.target.value }))}
                      />
                      <input
                        className="h-9 border rounded-md px-3 text-sm"
                        placeholder="Postal code"
                        value={shippingAddress.postalCode}
                        onChange={(e) => setShippingAddress((a) => ({ ...a, postalCode: e.target.value }))}
                      />
                      <input
                        className="h-9 border rounded-md px-3 text-sm"
                        placeholder="Country (e.g. US)"
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress((a) => ({ ...a, country: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => convertMutation.mutate({ quoteId: quote.id, shippingAddress })}
                        disabled={convertMutation.isPending}
                      >
                        {convertMutation.isPending ? "Creating…" : "Confirm Order"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setConverting(null)}>Cancel</Button>
                    </div>
                    {convertMutation.isError && (
                      <p className="text-red-500 text-xs mt-2">{(convertMutation.error as Error).message}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
