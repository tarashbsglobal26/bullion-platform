import { Resend } from "resend";
import nodemailer from "nodemailer";
import { formatCurrency } from "@/lib/utils";

const FROM = process.env.RESEND_FROM_EMAIL || "Wholesale Platform <onboarding@resend.dev>";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "info@vancentralmint.com";

function verificationEmailHtml(code: string) {
  return `
    <div style="font-family:sans-serif;max-width:400px;margin:auto">
      <h2 style="color:#b45309">Wholesale Platform</h2>
      <p>Your email verification code is:</p>
      <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">${code}</div>
      <p style="color:#6b7280;font-size:0.875rem">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
  `;
}

let etherealTransporter: nodemailer.Transporter | null = null;

async function sendViaEthereal(to: string, code: string): Promise<string | false> {
  if (!etherealTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    etherealTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  const info = await etherealTransporter.sendMail({
    from: '"Wholesale Platform" <noreply@bullion.com>',
    to,
    subject: "Your verification code",
    html: verificationEmailHtml(code),
  });

  return nodemailer.getTestMessageUrl(info) || false;
}

export async function sendVerificationEmail(to: string, code: string): Promise<string | false> {
  if (!process.env.RESEND_API_KEY) {
    return sendViaEthereal(to, code);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your verification code",
    html: verificationEmailHtml(code),
  });

  return false;
}

export async function sendNewOrderNotification(order: {
  orderNumber: string;
  businessName: string;
  total: number;
  orderId: string;
  items: { name: string; sku: string; quantity: number; unitPrice: number; totalPrice: number }[];
}): Promise<void> {
  const itemRows = order.items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb">${i.name}<br><span style="color:#9ca3af;font-size:0.75rem">${i.sku}</span></td>
          <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
          <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right">${formatCurrency(i.unitPrice)}</td>
          <td style="padding:8px 6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold">${formatCurrency(i.totalPrice)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#b45309">New Order Received</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0 20px">
        <tr><td style="padding:6px 0;color:#6b7280">Order</td><td style="padding:6px 0;font-weight:bold">${order.orderNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Business</td><td style="padding:6px 0;font-weight:bold">${order.businessName}</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem">
        <thead>
          <tr style="text-align:left;color:#6b7280;font-size:0.75rem;text-transform:uppercase">
            <th style="padding:0 6px 8px">Product</th>
            <th style="padding:0 6px 8px;text-align:center">Qty</th>
            <th style="padding:0 6px 8px;text-align:right">Unit Price</th>
            <th style="padding:0 6px 8px;text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="text-align:right;padding:12px 6px;font-size:1.1rem">
        <span style="color:#6b7280">Order Total: </span>
        <span style="font-weight:bold;color:#b45309">${formatCurrency(order.total)}</span>
      </div>
      <a href="https://wholesale.vancentralmint.com/orders/${order.orderId}" style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">View Order</a>
    </div>
  `;
  const subject = `New order ${order.orderNumber} from ${order.businessName}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`📧 [dev] Would send order notification: ${subject}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({ from: FROM, to: ADMIN_NOTIFICATION_EMAIL, subject, html });
}
