import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const { email } = parsed.data;

  // Delete any existing OTP or verified tokens for this email
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const tokenHash = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.verificationToken.create({
    data: { identifier: email, token: tokenHash, expires },
  });

  const previewUrl = await sendVerificationEmail(email, code);

  return NextResponse.json({ sent: true, ...(previewUrl ? { previewUrl } : {}) });
}
