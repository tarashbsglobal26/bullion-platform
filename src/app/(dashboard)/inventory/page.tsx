"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, metalLabel } from "@/lib/utils";
import { useState } from "react";
import { Package, Plus, AlertTriangle, Pencil, X } from "lucide-react";

function EditStockModal({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    quantity:  String(item.quantity),
    reserved:  String(item.reserved),
    costPrice: String(Number(item.costPrice)),
    location:  item.location ?? "",
    batchNo:   item.batchNo ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity:  parseInt(form.quantity) || 0,
          reserved:  parseInt(form.reserved) || 0,
          costPrice: parseFloat(form.costPrice) || 0,
          location:  form.location || null,
          batchNo:   form.batchNo || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.formErrors?.[0] ?? "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Edit Stock Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}
          <p className="text-sm text-gray-500 -mt-2">{item.product.name} · <span className="font-mono text-xs">{item.sku}</span></p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Quantity</label>
              <Input type="number" min="0" value={form.quantity} onChange={set("quantity")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Reserved</label>
              <Input type="number" min="0" value={form.reserved} onChange={set("reserved")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Cost Price (USD)</label>
              <Input type="number" step="0.01" min="0" value={form.costPrice} onChange={set("costPrice")} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <Input value={form.location} onChange={set("location")} placeholder="Vault A / Shelf 3" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700">Batch No.</label>
              <Input value={form.batchNo} onChange={set("batchNo")} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ productId: "", quantity: 0, costPrice: 0, location: "", batchNo: "" });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      return res.json();
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowAddForm(false);
      setForm({ productId: "", quantity: 0, costPrice: 0, location: "", batchNo: "" });
    },
  });

  return (
    <div className="space-y-6">
      {editItem && (
        <EditStockModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["inventory"] })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500 text-sm">Manage physical stock and warehouse allocation</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Stock
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Add Stock Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <label className="text-sm font-medium text-gray-700">Product</label>
                <select
                  className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm bg-white"
                  value={form.productId}
                  onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Select product…</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Quantity</label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cost Price (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Vault A / Shelf 3"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Batch No.</label>
                <Input
                  value={form.batchNo}
                  onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>
                {addMutation.isPending ? "Adding…" : "Add Stock"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data?.summary?.map((s: any) => (
              <Card key={s.product.id} className={s.available <= 5 ? "border-red-200" : ""}>
                <CardContent className="p-4">
                  {s.available <= 5 && (
                    <AlertTriangle className="w-4 h-4 text-red-500 mb-1" />
                  )}
                  <p className="font-semibold text-sm leading-tight">{s.product.name}</p>
                  <p className="text-xs text-gray-400 mb-2">{s.product.sku}</p>
                  <div className="text-sm space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total</span>
                      <span className="font-medium">{s.totalQty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reserved</span>
                      <span className="font-medium text-amber-600">{s.reserved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Available</span>
                      <span className={`font-bold ${s.available <= 5 ? "text-red-600" : "text-green-600"}`}>
                        {s.available}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed table */}
          <Card>
            <CardHeader><CardTitle>Stock Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-5 py-3">Product</th>
                    <th className="text-left px-5 py-3">SKU</th>
                    <th className="text-right px-5 py-3">Qty</th>
                    <th className="text-right px-5 py-3">Reserved</th>
                    <th className="text-right px-5 py-3">Available</th>
                    <th className="text-left px-5 py-3">Location</th>
                    <th className="text-right px-5 py-3">Cost</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{item.product.name}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                      <td className="px-5 py-3 text-right">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-amber-600">{item.reserved}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${item.quantity - item.reserved <= 5 ? "text-red-600" : "text-green-600"}`}>
                          {item.quantity - item.reserved}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{item.location || "—"}</td>
                      <td className="px-5 py-3 text-right font-mono">{formatCurrency(Number(item.costPrice))}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setEditItem(item)}
                          className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
