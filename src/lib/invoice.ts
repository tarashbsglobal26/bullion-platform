import { PDFDocument, PDFFont, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

const SELLER = {
  name: "Van Central Mint Inc.",
  address: "24-3190 Toronto St, Port Coquitlam, BC V3B 5K3, Canada",
  phone: "+1 778 861 4299",
  email: "info@vancentralmint.com",
  bank: {
    name: "Bank of Montreal (SWIFT: BOFMCAM2XXX)",
    nySwift: "HATRUS44",
    abaRouting: "071000288",
    accountNumber: "08070-001-4769168",
    address: "20045 Langley Bypass, Langley, BC V3A 8R6, Canada",
  },
};

interface InvoiceData {
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date;
  dueAt: Date;
  business: { name: string; legalName: string; email: string; phone: string };
  address: { street1: string; city: string; country: string; postalCode: string } | null;
  items: { name: string; sku: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const gold = rgb(0.8, 0.6, 0.1);
  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.5, 0.5, 0.5);

  // Header bar
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: dark });

  const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "OIP-removebg-preview.png"));
  const logoImage = await doc.embedPng(logoBytes);
  const logoHeight = 50;
  const logoWidth  = logoImage.width * (logoHeight / logoImage.height);
  page.drawImage(logoImage, { x: 40, y: height - 65, width: logoWidth, height: logoHeight });

  page.drawText("B2B INVOICE", { x: 40 + logoWidth + 15, y: height - 45, size: 16, font: fontBold, color: gold });

  // Invoice number & dates
  page.drawText(`Invoice #${data.invoiceNumber}`, { x: 360, y: height - 40, size: 14, font: fontBold, color: rgb(1,1,1) });
  page.drawText(`Order: ${data.orderNumber}`, { x: 360, y: height - 58, size: 10, font, color: rgb(0.8,0.8,0.8) });
  page.drawText(`Issued: ${data.issuedAt.toLocaleDateString()}`, { x: 360, y: height - 72, size: 9, font, color: rgb(0.8,0.8,0.8) });

  // Bill to
  let y = height - 120;
  page.drawText("BILL TO", { x: 40, y, size: 9, font: fontBold, color: gray });
  y -= 18;
  page.drawText(data.business.legalName, { x: 40, y, size: 12, font: fontBold, color: dark });
  y -= 16;
  page.drawText(data.business.email, { x: 40, y, size: 10, font, color: dark });
  y -= 14;
  if (data.address) {
    page.drawText(`${data.address.street1}, ${data.address.city} ${data.address.postalCode}`, { x: 40, y, size: 10, font, color: dark });
    y -= 14;
    page.drawText(data.address.country, { x: 40, y, size: 10, font, color: dark });
  }

  // Due date box
  page.drawRectangle({ x: 380, y: height - 160, width: 175, height: 60, color: rgb(0.97, 0.95, 0.88), borderColor: gold, borderWidth: 1 });
  page.drawText("PAYMENT DUE", { x: 395, y: height - 125, size: 9, font: fontBold, color: gray });
  page.drawText(data.dueAt.toLocaleDateString(), { x: 395, y: height - 143, size: 14, font: fontBold, color: dark });

  // Table header
  y = height - 220;
  page.drawRectangle({ x: 40, y: y - 4, width: width - 80, height: 22, color: dark });
  page.drawText("PRODUCT", { x: 50, y, size: 9, font: fontBold, color: rgb(1,1,1) });
  page.drawText("SKU", { x: 200, y, size: 9, font: fontBold, color: rgb(1,1,1) });
  page.drawText("QTY", { x: 340, y, size: 9, font: fontBold, color: rgb(1,1,1) });
  page.drawText("UNIT PRICE", { x: 385, y, size: 9, font: fontBold, color: rgb(1,1,1) });
  page.drawText("TOTAL", { x: 480, y, size: 9, font: fontBold, color: rgb(1,1,1) });

  // Table rows
  y -= 22;
  const lineHeight = 11;
  data.items.forEach((item, i) => {
    const nameLines = wrapText(font, item.name, 9, 140);
    const rowHeight = 20 + (nameLines.length - 1) * lineHeight;

    if (i % 2 === 1) {
      page.drawRectangle({
        x: 40,
        y: y - (nameLines.length - 1) * lineHeight - 4,
        width: width - 80,
        height: rowHeight,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    nameLines.forEach((line, li) => {
      page.drawText(line, { x: 50, y: y - li * lineHeight, size: 9, font, color: dark });
    });
    page.drawText(item.sku, { x: 200, y, size: 9, font, color: dark });
    page.drawText(String(item.qty), { x: 345, y, size: 9, font, color: dark });
    page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: 385, y, size: 9, font, color: dark });
    page.drawText(`$${item.total.toFixed(2)}`, { x: 480, y, size: 9, font, color: dark });
    y -= rowHeight;
  });

  // Totals
  y -= 10;
  page.drawLine({ start: { x: 360, y }, end: { x: width - 40, y }, thickness: 0.5, color: gray });
  y -= 16;
  page.drawText("Subtotal", { x: 380, y, size: 10, font, color: dark });
  page.drawText(`$${data.subtotal.toFixed(2)}`, { x: 480, y, size: 10, font, color: dark });
  y -= 16;
  page.drawText("Tax", { x: 380, y, size: 10, font, color: dark });
  page.drawText(`$${data.tax.toFixed(2)}`, { x: 480, y, size: 10, font, color: dark });
  y -= 16;
  page.drawText("Shipping", { x: 380, y, size: 10, font, color: dark });
  page.drawText(`$${data.shipping.toFixed(2)}`, { x: 480, y, size: 10, font, color: dark });
  y -= 4;
  page.drawRectangle({ x: 360, y: y - 6, width: width - 400, height: 26, color: dark });
  page.drawText("TOTAL DUE", { x: 374, y, size: 11, font: fontBold, color: gold });
  page.drawText(`$${data.total.toFixed(2)}`, { x: 468, y, size: 11, font: fontBold, color: gold });

  // Seller / remit payment to
  let sy = 185;
  page.drawLine({ start: { x: 40, y: sy + 15 }, end: { x: width - 40, y: sy + 15 }, thickness: 0.5, color: gray });
  page.drawText("REMIT PAYMENT TO", { x: 40, y: sy, size: 9, font: fontBold, color: gray });
  sy -= 15;
  page.drawText(SELLER.name, { x: 40, y: sy, size: 10, font: fontBold, color: dark });
  sy -= 13;
  page.drawText(SELLER.address, { x: 40, y: sy, size: 8, font, color: dark });
  sy -= 12;
  page.drawText(`Phone: ${SELLER.phone}   Email: ${SELLER.email}`, { x: 40, y: sy, size: 8, font, color: dark });
  sy -= 16;
  page.drawText("SELLER'S BANK DETAILS", { x: 40, y: sy, size: 9, font: fontBold, color: gray });
  sy -= 13;
  page.drawText(`Bank Name: ${SELLER.bank.name}`, { x: 40, y: sy, size: 8, font, color: dark });
  sy -= 12;
  page.drawText(`NY SWIFT Code: ${SELLER.bank.nySwift}   ABA Routing No: ${SELLER.bank.abaRouting}`, { x: 40, y: sy, size: 8, font, color: dark });
  sy -= 12;
  page.drawText(`Account Number: ${SELLER.bank.accountNumber}`, { x: 40, y: sy, size: 8, font, color: dark });
  sy -= 12;
  page.drawText(`Bank Address: ${SELLER.bank.address}`, { x: 40, y: sy, size: 8, font, color: dark });

  // Footer
  page.drawText("Thank you for your business. Payment is due by the date above.", {
    x: 40, y: 25, size: 9, font, color: gray,
  });

  return doc.save();
}
