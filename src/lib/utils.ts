import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export function generateOrderNumber(): string {
  const prefix = "ORD";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateQuoteNumber(): string {
  const prefix = "QTE";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateInvoiceNumber(): string {
  const prefix = "INV";
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}-${random}`;
}

export function metalLabel(metal: string): string {
  if (metal === "NICKEL_SILVER") return "Nickel Silver";
  return metal.charAt(0) + metal.slice(1).toLowerCase();
}

const OZ_FRACTION_LABELS: Record<string, string> = {
  "0.1":  "1/10",
  "0.25": "1/4",
  "0.5":  "1/2",
  "1":    "1",
};

export function formatWeight(weight: number | string, weightUnit: string): string {
  const num = Number(weight);
  if (weightUnit === "OZ") {
    const label = OZ_FRACTION_LABELS[String(num)];
    if (label) return `${label} oz`;
  }
  return `${num} ${weightUnit}`;
}
