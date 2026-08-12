import { Resend } from "resend";
import nodemailer from "nodemailer";

const FROM = process.env.RESEND_FROM_EMAIL || "Wholesale Platform <onboarding@resend.dev>";

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
