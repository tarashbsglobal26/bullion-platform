"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, metalLabel, formatWeight } from "@/lib/utils";
import { ShoppingCart, Search, Package, Plus, Minus, X, Trash2, Pencil, ImagePlus, Download, Bell, BellOff, ChevronDown, ChevronUp, Star, Shield, TrendingUp, Medal, Gem, CircleDollarSign, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const SECTION_META: Record<string, { label: string; description: string; accent: string; icon: React.ElementType }> = {
  BULLION_SILVER:       { label: "Bullion Silver",        description: "Investment-grade silver",           accent: "gray",   icon: Shield },
  BULLION_GOLD:         { label: "Bullion Gold",          description: "Pure gold bullion coins",            accent: "yellow", icon: TrendingUp },
  COMMEMORATIVE_GOLD:   { label: "Commemorative Gold",    description: "Limited-edition proof gold",         accent: "amber",  icon: Medal },
  COMMEMORATIVE_SILVER: { label: "Commemorative Silver",  description: "Proof and collector silver",         accent: "blue",   icon: Gem },
  NON_PRECIOUS:         { label: "Non-precious",          description: "Nickel silver & specialty alloys",   accent: "teal",   icon: CircleDollarSign },
  PLATINUM_PALLADIUM:   { label: "Platinum & Palladium",  description: "Platinum and palladium bullion",     accent: "indigo", icon: Sparkles },
};
const SECTION_ORDER = ["BULLION_GOLD", "BULLION_SILVER", "COMMEMORATIVE_GOLD", "COMMEMORATIVE_SILVER", "PLATINUM_PALLADIUM", "NON_PRECIOUS"];

const ACCENT_CLASSES: Record<string, { icon: string; bar: string; header: string }> = {
  amber:  { icon: "bg-amber-100 text-amber-700",  bar: "bg-amber-500",  header: "text-amber-700"  },
  gray:   { icon: "bg-gray-100 text-gray-600",    bar: "bg-gray-400",   header: "text-gray-700"   },
  yellow: { icon: "bg-yellow-100 text-yellow-700",bar: "bg-yellow-400", header: "text-yellow-700" },
  blue:   { icon: "bg-blue-100 text-blue-700",    bar: "bg-blue-400",   header: "text-blue-700"   },
  teal:   { icon: "bg-teal-100 text-teal-700",    bar: "bg-teal-400",   header: "text-teal-700"   },
  indigo: { icon: "bg-indigo-100 text-indigo-700",bar: "bg-indigo-400", header: "text-indigo-700" },
};

const METAL_COLORS: Record<string, string> = {
  GOLD:         "bg-amber-100 text-amber-800",
  SILVER:       "bg-gray-100 text-gray-700",
  PLATINUM:     "bg-blue-100 text-blue-800",
  PALLADIUM:    "bg-purple-100 text-purple-800",
  NICKEL_SILVER:"bg-teal-100 text-teal-800",
};

const METAL_STRIP: Record<string, string> = {
  GOLD:         "bg-gradient-to-r from-amber-400 to-yellow-500",
  SILVER:       "bg-gradient-to-r from-gray-300 to-gray-400",
  PLATINUM:     "bg-gradient-to-r from-blue-300 to-blue-400",
  PALLADIUM:    "bg-gradient-to-r from-purple-300 to-purple-400",
  NICKEL_SILVER:"bg-gradient-to-r from-teal-300 to-teal-400",
};

const METALS = ["GOLD", "SILVER", "PLATINUM", "PALLADIUM", "NICKEL_SILVER"] as const;

const OZ_FRACTIONS = [
  { value: "0.1",  label: "1/10 oz" },
  { value: "0.25", label: "1/4 oz" },
  { value: "0.5",  label: "1/2 oz" },
  { value: "1",    label: "1 oz" },
];

type TierRow = { minQty: string; value: string };

function calcTierPrice(
  spotPrice: number, weight: number, premiumFixed: number,
  tierPremium: number | null, tierFixed: number | null,
): number {
  if (tierFixed   != null) return tierFixed;
  if (tierPremium != null) return spotPrice * weight * (1 + tierPremium) + premiumFixed;
  return 0;
}

const CATEGORIES = [
  { value: "BULLION_GOLD",        label: "Bullion Gold" },
  { value: "BULLION_SILVER",      label: "Bullion Silver" },
  { value: "COMMEMORATIVE_GOLD",   label: "Commemorative Gold" },
  { value: "COMMEMORATIVE_SILVER", label: "Commemorative Silver" },
  { value: "NON_PRECIOUS",        label: "Non-precious" },
  { value: "PLATINUM_PALLADIUM",  label: "Platinum & Palladium" },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina",
  "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
  "Cameroon", "Canada", "Chad", "Chile", "China", "Colombia", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala",
  "Guinea", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Mauritania",
  "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia",
  "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania",
  "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe",
];

const DEFAULT_FORM = {
  name: "", sku: "", metal: "GOLD", category: "BULLION_GOLD",
  weight: "", weightUnit: "OZ", purity: "", mint: "", country: "", denomination: "",
  mintage: "", diameter: "",
  year: "", description: "", premiumPercent: "", fixedUnitPrice: "", minOrderQty: "1",
};

// Slot 0 = obverse, slot 1 = reverse
type ImagePair = [string, string];

function categoryForMetal(metal: string, current: string): string {
  if (metal === "NICKEL_SILVER") return "NON_PRECIOUS";
  if (metal === "PLATINUM" || metal === "PALLADIUM") return "PLATINUM_PALLADIUM";
  if (current === "NON_PRECIOUS" || current === "PLATINUM_PALLADIUM")
    return metal === "GOLD" ? "BULLION_GOLD" : "BULLION_SILVER";
  return current;
}

function initForm(product?: any) {
  if (!product) return DEFAULT_FORM;
  const trim = (n: number) => String(parseFloat(n.toFixed(6)));
  return {
    name:          product.name ?? "",
    sku:           product.sku ?? "",
    metal:         product.metal ?? "GOLD",
    category:      product.category ?? "BULLION_GOLD",
    weight:        trim(Number(product.weight)),
    weightUnit:    product.weightUnit ?? "OZ",
    purity:        trim(Number(product.purity) * 100),
    mint:          product.mint ?? "",
    country:       product.country ?? "",
    denomination:  product.denomination ?? "",
    mintage:       product.mintage ? String(product.mintage) : "",
    diameter:      product.diameter ? trim(Number(product.diameter)) : "",
    year:          product.year ? String(product.year) : "",
    description:   product.description ?? "",
    premiumPercent: product.premiumPercent ? trim(Number(product.premiumPercent) * 100) : "",
    fixedUnitPrice: product.fixedUnitPrice ? trim(Number(product.fixedUnitPrice)) : "",
    minOrderQty:   String(product.minOrderQty ?? 1),
  };
}

function ProductFormModal({ product, onClose, onSaved }: {
  product?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [form, setForm]       = useState(() => initForm(product));
  const [images, setImages]   = useState<ImagePair>([
    product?.images?.[0] ?? "",
    product?.images?.[1] ?? "",
  ]);
  const [extraImages, setExtraImages] = useState<string[]>(product?.images?.slice(2) ?? []);
  const [extraUploading, setExtraUploading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [uploading, setUploading] = useState<0 | 1 | null>(null);
  const [error, setError]         = useState("");
  const [manageMints, setManageMints] = useState(false);
  const [newMintName, setNewMintName] = useState("");
  const [mintError, setMintError]     = useState("");
  const queryClientForMints           = useQueryClient();
  const { data: mints } = useQuery({
    queryKey: ["mints"],
    queryFn: async () => {
      const res = await fetch("/api/mints");
      return res.json();
    },
  });
  const mintNames: string[] = mints?.map((m: any) => m.name) ?? [];

  const addMint = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/mints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed to add mint");
      return body;
    },
    onSuccess: () => {
      setMintError("");
      setNewMintName("");
      queryClientForMints.invalidateQueries({ queryKey: ["mints"] });
    },
    onError: (err: unknown) => setMintError(err instanceof Error ? err.message : "Failed to add mint"),
  });

  const deleteMint = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mints/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete mint");
    },
    onSuccess: () => queryClientForMints.invalidateQueries({ queryKey: ["mints"] }),
  });

  const [tiers, setTiers]         = useState<TierRow[]>(
    product?.priceTiers?.map((t: any) => ({
      minQty: String(t.minQty),
      value:  t.premiumPercent != null
        ? String(parseFloat((Number(t.premiumPercent) * 100).toFixed(4)))
        : String(Number(t.fixedUnitPrice)),
    })) ?? []
  );

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleMetalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "NICKEL_SILVER") setUseFixed(true);
    setForm(f => ({
      ...f,
      metal: v,
      category: categoryForMetal(v, f.category),
    }));
  };

  const handleSlotUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 0 | 1) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(slot);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setImages(prev => { const next = [...prev] as ImagePair; next[slot] = url; return next; });
      }
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const removeImage = (slot: 0 | 1) =>
    setImages(prev => { const next = [...prev] as ImagePair; next[slot] = ""; return next; });

  const handleExtraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtraUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setExtraImages(prev => [...prev, url]);
      }
    } finally {
      setExtraUploading(false);
      e.target.value = "";
    }
  };

  const removeExtraImage = (index: number) =>
    setExtraImages(prev => prev.filter((_, i) => i !== index));

  const forceFixed = form.metal === "NICKEL_SILVER";
  const [useFixed, setUseFixed] = useState(
    forceFixed || !!product?.fixedUnitPrice
  );
  const showFixed = forceFixed || useFixed;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name:          form.name,
        metal:         form.metal,
        category:      form.category,
        weight:        parseFloat(form.weight),
        weightUnit:    form.weightUnit,
        purity:        forceFixed ? 1 : parseFloat(form.purity) / 100,
        mint:          form.mint,
        premiumPercent: !showFixed && form.premiumPercent ? parseFloat(form.premiumPercent) / 100 : 0,
        minOrderQty:   parseInt(form.minOrderQty) || 1,
        images:     [...images, ...extraImages].filter(Boolean),
        priceTiers: tiers
          .filter(t => t.minQty && t.value)
          .map(t => ({
            minQty:         parseInt(t.minQty),
            premiumPercent: !showFixed ? parseFloat(t.value) / 100 : null,
            fixedUnitPrice:  showFixed ? parseFloat(t.value)       : null,
          })),
      };
      if (!isEdit)          body.sku = form.sku;
      if (form.year)        body.year = parseInt(form.year);
      if (form.description) body.description = form.description;
      if (form.country)      body.country = form.country;
      if (form.denomination) body.denomination = form.denomination;
      if (form.mintage)   body.mintage  = parseInt(form.mintage);
      if (form.diameter)  body.diameter = parseFloat(form.diameter);
      if (showFixed && form.fixedUnitPrice) body.fixedUnitPrice = parseFloat(form.fixedUnitPrice);
      else                  body.fixedUnitPrice = null;

      const res = await fetch(isEdit ? `/api/products/${product.id}` : "/api/products", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.formErrors?.[0] ?? JSON.stringify(d.error) ?? "Failed");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const sel = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
  const lbl = "text-xs font-medium text-gray-700 block mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{isEdit ? "Edit Product" : "Add Product"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Product Name *</label>
              <Input value={form.name} onChange={set("name")} placeholder="e.g. American Gold Eagle 1oz" required />
            </div>
            <div>
              <label className={lbl}>SKU *</label>
              {isEdit
                ? <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">{form.sku}</div>
                : <Input value={form.sku} onChange={set("sku")} placeholder="e.g. AGE-1OZ-2024" required />}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={lbl + " mb-0"}>Mint *</label>
                <button type="button" onClick={() => setManageMints(v => !v)}
                  className="text-xs text-amber-600 hover:text-amber-800 font-medium">
                  {manageMints ? "Close" : "Manage list"}
                </button>
              </div>
              <select value={form.mint} onChange={set("mint")} className={sel} required>
                <option value="" disabled>Select…</option>
                {(form.mint && !mintNames.includes(form.mint) ? [form.mint, ...mintNames] : mintNames).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {manageMints && (
                <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                  {mintError && <p className="text-xs text-red-600">{mintError}</p>}
                  <div className="flex gap-2">
                    <Input
                      value={newMintName}
                      onChange={(e) => setNewMintName(e.target.value)}
                      placeholder="New mint name"
                      className="text-sm h-8"
                    />
                    <button type="button"
                      onClick={() => newMintName.trim() && addMint.mutate(newMintName.trim())}
                      disabled={addMint.isPending || !newMintName.trim()}
                      className="text-xs font-medium px-3 rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex-shrink-0">
                      Add
                    </button>
                  </div>
                  {mintNames.length > 0 && (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {mints?.map((m: any) => (
                        <li key={m.id} className="flex items-center justify-between text-xs text-gray-600 px-1">
                          <span>{m.name}</span>
                          <button type="button" onClick={() => deleteMint.mutate(m.id)}
                            disabled={deleteMint.isPending}
                            className="text-red-400 hover:text-red-600 disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className={lbl}>Country</label>
              <select value={form.country} onChange={set("country")} className={sel}>
                <option value="">Select…</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Metal *</label>
              <select value={form.metal} onChange={handleMetalChange} className={sel}>
                {METALS.map(m => <option key={m} value={m}>{metalLabel(m)}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Category *</label>
              <select value={form.category} onChange={set("category")} className={sel}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Weight *</label>
              {form.weightUnit === "OZ" ? (
                <select value={form.weight} onChange={set("weight")} className={sel} required>
                  <option value="" disabled>Select…</option>
                  {OZ_FRACTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              ) : (
                <Input type="number" step="0.001" min="0.001" value={form.weight} onChange={set("weight")} placeholder="1" required />
              )}
            </div>
            <div>
              <label className={lbl}>Weight Unit</label>
              <select value={form.weightUnit} onChange={set("weightUnit")} className={sel}>
                <option value="OZ">oz (troy ounce)</option>
                <option value="GRAM">gram</option>
                <option value="KG">kg</option>
              </select>
            </div>
            {!forceFixed && (
              <div>
                <label className={lbl}>Purity % *</label>
                <Input type="number" step="0.001" min="0" max="100" value={form.purity} onChange={set("purity")} placeholder="99.99" required />
              </div>
            )}
            <div>
              <label className={lbl}>Year</label>
              <Input type="number" min="1900" max="2100" value={form.year} onChange={set("year")} placeholder="2024" />
            </div>
            <div>
              <label className={lbl}>Denomination</label>
              <Input value={form.denomination} onChange={set("denomination")} placeholder="e.g. $50" />
            </div>
            <div>
              <label className={lbl}>Mintage</label>
              <Input type="number" min="1" step="1" value={form.mintage} onChange={set("mintage")} placeholder="e.g. 500000" />
            </div>
            <div>
              <label className={lbl}>Diameter (mm)</label>
              <Input type="number" min="0" step="0.01" value={form.diameter} onChange={set("diameter")} placeholder="e.g. 32.70" />
            </div>
            {/* Pricing mode toggle */}
            <div className="col-span-2">
              <label className={lbl}>Pricing *</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                <button
                  type="button"
                  disabled={forceFixed}
                  onClick={() => { setUseFixed(false); setForm(f => ({ ...f, fixedUnitPrice: "" })); }}
                  className={`flex-1 py-2 font-medium transition-colors ${!showFixed ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"} ${forceFixed ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  Premium % over spot
                </button>
                <button
                  type="button"
                  onClick={() => { setUseFixed(true); setForm(f => ({ ...f, premiumPercent: "" })); }}
                  className={`flex-1 py-2 font-medium transition-colors border-l border-gray-200 ${showFixed ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  Fixed price
                </button>
              </div>
            </div>

            {showFixed ? (
              <div>
                <label className={lbl}>Fixed Unit Price ($) *</label>
                <Input type="number" step="0.01" min="0.01" value={form.fixedUnitPrice} onChange={set("fixedUnitPrice")} placeholder="1.50" required />
              </div>
            ) : (
              <div>
                <label className={lbl}>Premium % over spot</label>
                <Input type="number" step="0.1" min="0" value={form.premiumPercent} onChange={set("premiumPercent")} placeholder="4.5" />
              </div>
            )}
            <div>
              <label className={lbl}>Min Order Qty</label>
              <Input type="number" min="1" value={form.minOrderQty} onChange={set("minOrderQty")} placeholder="1" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Description</label>
              <textarea value={form.description} onChange={set("description")} rows={2}
                placeholder="Optional product description"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
            </div>
          </div>

          {/* Obverse / Reverse image slots */}
          <div>
            <label className={lbl}>Coin Images</label>
            <div className="grid grid-cols-2 gap-3">
              {([0, 1] as const).map((slot) => {
                const label = slot === 0 ? "Obverse (front)" : "Reverse (back)";
                const url   = images[slot];
                const busy  = uploading === slot;
                return (
                  <div key={slot}>
                    <p className="text-xs text-gray-500 text-center mb-1.5">{label}</p>
                    <div className="relative aspect-square rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50">
                      {url ? (
                        <>
                          <img src={url} alt={label} className="w-full h-full object-contain p-2" />
                          <button type="button" onClick={() => removeImage(slot)}
                            className="absolute top-1.5 right-1.5 bg-white rounded-full shadow p-0.5 text-gray-500 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${busy ? "opacity-60 pointer-events-none" : ""}`}>
                          <ImagePlus className="w-6 h-6 text-gray-300 mb-1" />
                          <span className="text-xs text-gray-400">{busy ? "Uploading…" : "Upload"}</span>
                          <input type="file" accept="image/*" className="hidden"
                            onChange={e => handleSlotUpload(e, slot)} disabled={busy} />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">JPEG, PNG, WebP or GIF · max 5 MB each</p>
          </div>

          {/* Additional photos */}
          <div>
            <label className={lbl}>Additional Photos</label>
            <div className="grid grid-cols-4 gap-3">
              {extraImages.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50">
                  <img src={url} alt={`Additional ${i + 1}`} className="w-full h-full object-contain p-1" />
                  <button type="button" onClick={() => removeExtraImage(i)}
                    className="absolute top-1 right-1 bg-white rounded-full shadow p-0.5 text-gray-500 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="relative aspect-square rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50">
                <label className={`absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${extraUploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <ImagePlus className="w-5 h-5 text-gray-300 mb-1" />
                  <span className="text-xs text-gray-400">{extraUploading ? "Uploading…" : "Add Photo"}</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={handleExtraUpload} disabled={extraUploading} />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Optional extra angles, packaging, certificates, etc.</p>
          </div>

          {/* Volume price tiers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl}>Volume Price Tiers</label>
              <button type="button"
                onClick={() => setTiers(ts => [...ts, { minQty: "", value: "" }])}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium">
                <Plus className="w-3 h-3" /> Add Tier
              </button>
            </div>
            {tiers.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No volume tiers — flat price for all quantities.</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_1fr_32px] gap-2 text-xs text-gray-500 font-medium px-1">
                  <span>Min Qty</span>
                  <span>{showFixed ? "Price / unit ($)" : "Premium %"}</span>
                  <span />
                </div>
                {tiers.map((tier, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-center">
                    <Input type="number" min="1" placeholder="e.g. 100" value={tier.minQty}
                      onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, minQty: e.target.value } : t))} />
                    <Input type="number" min="0" step={showFixed ? "0.01" : "0.1"}
                      placeholder={showFixed ? "e.g. 29.50" : "e.g. 12.0"} value={tier.value}
                      onChange={e => setTiers(ts => ts.map((t, j) => j === i ? { ...t, value: e.target.value } : t))} />
                    <button type="button" onClick={() => setTiers(ts => ts.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Tier activates when order qty ≥ min qty. {showFixed ? "Enter price per unit ($)." : "Enter premium % over spot."}
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading || uploading !== null}>
              {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [search, setSearch]           = useState("");
  const [metalFilter, setMetalFilter] = useState("");
  const [cart, setCart]               = useState<Record<string, number>>({});
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [qty, setQty]                 = useState<Record<string, number>>({});
  const [showAdd, setShowAdd]         = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [lightbox, setLightbox]       = useState<string | null>(null);
  const { data: session }             = useSession();
  const user                          = (session?.user as any) ?? {};
  const isAdmin                       = ["SUPER_ADMIN", "ADMIN"].includes(user.role);
  const queryClient                   = useQueryClient();
  const router                        = useRouter();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    router.refresh();
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", metalFilter, search],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (metalFilter) p.set("metal", metalFilter);
      if (search)      p.set("search", search);
      return fetch(`/api/products?${p}`).then(r => r.json());
    },
  });

  const getQty = (product: any) => qty[product.id] ?? product.minOrderQty ?? 1;

  const setQtyClamped = (product: any, next: number) => {
    const min = product.minOrderQty ?? 1;
    const max = product.availableQty ?? Infinity;
    setQty(q => ({ ...q, [product.id]: Math.min(Math.max(next, min), max) }));
  };

  const addToCart  = (product: any) => {
    const amount = getQty(product);
    setCart(c => ({ ...c, [product.id]: (c[product.id] ?? 0) + amount }));
    setQty(q => ({ ...q, [product.id]: product.minOrderQty ?? 1 }));
  };
  const cartCount  = Object.values(cart).reduce((a, b) => a + b, 0);

  const getNotifyQty = (product: any) => qty[product.id] ?? product.notifyQuantity ?? product.minOrderQty ?? 1;

  const setNotifyQty = (product: any, next: number) => {
    const min = product.minOrderQty ?? 1;
    setQty(q => ({ ...q, [product.id]: Math.max(next, min) }));
  };

  const notifyMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const res = await fetch(`/api/products/${productId}/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error("Failed to save notification request");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const cancelNotifyMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(`/api/products/${productId}/notify`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel notification request");
      return res.json();
    },
    onSuccess: invalidate,
  });

  const [quoteError, setQuoteError] = useState("");

  const createQuote = async () => {
    setQuoteError("");
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const res = await fetch("/api/quotes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (res.ok) {
      setCart({});
      window.location.href = "/quotes";
    } else {
      const d = await res.json().catch(() => null);
      setQuoteError(d?.error ?? "Failed to create quote");
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the catalog?`)) return;
    setDeletingId(id);
    try { const r = await fetch(`/api/products/${id}`, { method: "DELETE" }); if (r.ok) invalidate(); }
    finally { setDeletingId(null); }
  };

  const renderProductCard = (product: any) => {
    const allImages = product.images ?? [];
    const hasImages = allImages.length > 0;
    const imageSlots = Array.from({ length: Math.max(2, allImages.length) }, (_, i) => i);
    const slotLabel = (i: number) => i === 0 ? "Obverse" : i === 1 ? "Reverse" : `Photo ${i + 1}`;

    return (
      <Card key={product.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
        <div className={`h-1.5 ${METAL_STRIP[product.metal] ?? "bg-gray-300"}`} />

        <CardContent className="p-4 flex flex-col flex-1">
          {/* Name + badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${METAL_COLORS[product.metal] ?? "bg-gray-100 text-gray-700"}`}>
              {metalLabel(product.metal)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {product.sku} · {product.mint}{product.denomination ? ` · ${product.denomination}` : ""}
          </p>

          {product.description && (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setExpandedDesc(e => ({ ...e, [product.id]: !e[product.id] }))}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
              >
                {expandedDesc[product.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expandedDesc[product.id] ? "Hide Description" : "Show Description"}
              </button>
              {expandedDesc[product.id] && (
                <p className="text-xs text-gray-500 mt-1.5">{product.description}</p>
              )}
            </div>
          )}

          {/* Product images */}
          {hasImages && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {imageSlots.map((i) => {
                const url = allImages[i];
                return (
                  <div key={i} className="text-center">
                    {url ? (
                      <>
                        <div className="relative group">
                          <img src={url} alt={slotLabel(i)}
                            onClick={() => setLightbox(url)}
                            className="w-full h-16 object-contain rounded-lg border border-gray-100 bg-gray-50 cursor-zoom-in hover:opacity-90 transition-opacity" />
                          <a href={url} download
                            onClick={e => e.stopPropagation()}
                            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 text-gray-500 hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{slotLabel(i)}</p>
                      </>
                    ) : (
                      <div className="w-full h-16 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        <span className="text-xs text-gray-300">{slotLabel(i)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Details */}
          <div className="space-y-1.5 text-sm text-gray-600 mb-3">
            <div className="flex justify-between">
              <span>Weight</span>
              <span className="font-medium">{formatWeight(product.weight, product.weightUnit)}</span>
            </div>
            {product.metal !== "NICKEL_SILVER" && (
              <div className="flex justify-between">
                <span>Purity</span>
                <span className="font-medium">{(product.purity * 100).toFixed(2)}%</span>
              </div>
            )}
            {product.country && (
              <div className="flex justify-between">
                <span>Country</span>
                <span className="font-medium">{product.country}</span>
              </div>
            )}
            {product.diameter != null && (
              <div className="flex justify-between">
                <span>Diameter</span>
                <span className="font-medium">{Number(product.diameter)} mm</span>
              </div>
            )}
            {product.mintage != null && (
              <div className="flex justify-between">
                <span>Mintage</span>
                <span className="font-medium">{Number(product.mintage).toLocaleString()}</span>
              </div>
            )}
            {product.spotPrice != null && !product.fixedUnitPrice && (
              <div className="flex justify-between">
                <span>Spot Price</span>
                <span className="font-medium text-gray-400">{formatCurrency(product.spotPrice)}/oz</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5">
              <span className="font-semibold text-gray-900">{product.fixedUnitPrice ? "Fixed Price" : "Unit Price"}</span>
              <span className="font-bold text-amber-700 text-base">{formatCurrency(product.calculatedPrice)}</span>
            </div>
          </div>

          {/* Volume pricing table */}
          {product.priceTiers?.length > 0 && (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Volume pricing:</p>
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{Number(product.minOrderQty).toLocaleString()}+ units</span>
                  <span className="font-medium text-gray-700">{formatCurrency(product.calculatedPrice)}</span>
                </div>
                {product.priceTiers.map((t: any) => {
                  const price = calcTierPrice(
                    product.spotPrice, Number(product.weight), Number(product.premiumFixed),
                    t.premiumPercent != null ? Number(t.premiumPercent) : null,
                    t.fixedUnitPrice != null ? Number(t.fixedUnitPrice) : null,
                  );
                  return (
                    <div key={t.id} className="flex justify-between text-xs">
                      <span className="text-gray-400">{Number(t.minQty).toLocaleString()}+ units</span>
                      <span className="font-medium text-amber-600">{formatCurrency(price)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock + cart */}
          <div className="flex items-center justify-between mt-auto gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Package className="w-3 h-3" />
              {product.availableQty > 0
                ? <span className="text-green-600">{product.availableQty} in stock</span>
                : <span className="text-red-500">Out of stock</span>}
            </div>
            <div className="flex items-center gap-2">
              {cart[product.id] > 0 && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  {cart[product.id]} in cart
                </span>
              )}
              {product.availableQty > 0 ? (
                <>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setQtyClamped(product, getQty(product) - 1)}
                      className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      disabled={getQty(product) <= (product.minOrderQty ?? 1)}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={product.minOrderQty ?? 1}
                      max={product.availableQty}
                      value={getQty(product)}
                      onChange={e => setQtyClamped(product, parseInt(e.target.value) || (product.minOrderQty ?? 1))}
                      className="w-10 text-center text-sm border-x border-gray-200 py-1 focus:outline-none"
                    />
                    <button type="button" onClick={() => setQtyClamped(product, getQty(product) + 1)}
                      className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      disabled={getQty(product) >= product.availableQty}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <Button size="sm" onClick={() => addToCart(product)}>Add</Button>
                </>
              ) : !isAdmin ? (
                <>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setNotifyQty(product, getNotifyQty(product) - 1)}
                      className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      disabled={getNotifyQty(product) <= (product.minOrderQty ?? 1)}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={product.minOrderQty ?? 1}
                      value={getNotifyQty(product)}
                      onChange={e => setNotifyQty(product, parseInt(e.target.value) || (product.minOrderQty ?? 1))}
                      className="w-10 text-center text-sm border-x border-gray-200 py-1 focus:outline-none"
                    />
                    <button type="button" onClick={() => setNotifyQty(product, getNotifyQty(product) + 1)}
                      className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-50">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {product.notifyQuantity != null ? (
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => cancelNotifyMutation.mutate(product.id)}
                      disabled={cancelNotifyMutation.isPending}>
                      <BellOff className="w-3.5 h-3.5" /> Requested
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => notifyMutation.mutate({ productId: product.id, quantity: getNotifyQty(product) })}
                      disabled={notifyMutation.isPending}>
                      <Bell className="w-3.5 h-3.5" /> Notify Me
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {product.minOrderQty > 1 && (
            <p className="text-xs text-gray-400 mt-1">Min. order: {product.minOrderQty} units</p>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4">
              <button onClick={() => setEditProduct(product)}
                className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => deleteProduct(product.id, product.name)}
                disabled={deletingId === product.id}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                {deletingId === product.id ? "Removing…" : "Remove"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const groupedSections = SECTION_ORDER.map((key) => {
    const sectionProducts = (products ?? []).filter((p: any) => p.category === key);
    const byMint = sectionProducts.reduce((acc: Record<string, any[]>, p: any) => {
      (acc[p.mint] ??= []).push(p);
      return acc;
    }, {});
    const sortedMints = Object.entries(byMint).sort(([a], [b]) => {
      if (a === "The National Bank of Ukraine") return -1;
      if (b === "The National Bank of Ukraine") return 1;
      return a.localeCompare(b);
    });
    return { key, meta: SECTION_META[key], mints: sortedMints as [string, any[]][] };
  }).filter((s) => s.mints.length > 0);

  return (
    <>
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <a href={lightbox} download className="absolute top-4 right-16 text-white/70 hover:text-white" onClick={e => e.stopPropagation()}>
            <Download className="w-6 h-6" />
          </a>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X className="w-7 h-7" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {(showAdd || editProduct) && (
        <ProductFormModal
          product={editProduct ?? undefined}
          onClose={() => { setShowAdd(false); setEditProduct(null); }}
          onSaved={invalidate}
        />
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Product Catalog</h1>
            <p className="text-gray-500 text-sm">Prices update every 5 minutes based on live spot</p>
          </div>
          <div className="flex items-center gap-3">
            {cartCount > 0 && (
              <Button onClick={createQuote} className="gap-2">
                <ShoppingCart className="w-4 h-4" /> Get Quote ({cartCount} items)
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setShowAdd(true)} variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                <Plus className="w-4 h-4" /> Add Product
              </Button>
            )}
          </div>
        </div>

        {quoteError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{quoteError}</div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search coins…" className="pl-9" value={search}
              onChange={e => { const v = e.target.value; setSearch(v); if (v) setMetalFilter(""); }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["", "GOLD", "SILVER", "PLATINUM", "PALLADIUM", "NICKEL_SILVER"].map(m => (
              <button key={m} onClick={() => setMetalFilter(m)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  metalFilter === m ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200 hover:border-amber-400"
                }`}>
                {m === "" ? "All" : metalLabel(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid, grouped by category then mint */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="p-5 h-56 bg-gray-100 rounded-xl" /></Card>)}
          </div>
        ) : groupedSections.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products found</p>
          </div>
        ) : (
          groupedSections.map(({ key, meta, mints }) => {
            const ac = ACCENT_CLASSES[meta.accent] ?? ACCENT_CLASSES.gray;
            const Icon = meta.icon;
            return (
              <section key={key} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ac.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{meta.label}</h2>
                    <p className="text-xs text-gray-500">{meta.description}</p>
                  </div>
                </div>
                {mints.map(([mint, mintProducts]) => (
                  <div key={mint} className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-gray-200">
                      <div className={`w-1.5 h-4 rounded-full ${ac.bar}`} />
                      <h3 className="text-sm font-semibold text-gray-700">{mint}</h3>
                      <span className="text-xs text-gray-400">{mintProducts.length} product{mintProducts.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mintProducts.map((product: any) => renderProductCard(product))}
                    </div>
                  </div>
                ))}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
