import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, code } = parsed.data;

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, expires: { gt: new Date() } },
  });

  if (!record) {
    return NextResponse.json({ error: "Code expired or not found. Please request a new one." }, { status: 400 });
  }

  const valid = await bcrypt.compare(code, record.token);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  // Replace OTP token with a verified marker
  await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token: record.token } } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: `VERIFIED:${email}`,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours to complete registration
    },
  });

  return NextResponse.json({ verified: true });
}
