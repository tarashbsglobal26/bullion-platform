import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });

  console.log("📧 Ethereal test account:", testAccount.user);
  return transporter;
}

export async function sendVerificationEmail(to: string, code: string): Promise<string | false> {
  const t = await getTransporter();

  const info = await t.sendMail({
    from: '"Wholesale Platform" <noreply@bullion.com>',
    to,
    subject: "Your verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#b45309">Wholesale Platform</h2>
        <p>Your email verification code is:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:0.3em;color:#1f2937;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center">${code}</div>
        <p style="color:#6b7280;font-size:0.875rem">This code expires in 10 minutes. Do not share it with anyone.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("📧 Preview email at:", previewUrl);
  return previewUrl || false;
}
