import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  businessName: z.string().min(2),
  legalName: z.string().min(2),
  taxId: z.string().min(1),
  registrationNo: z.string().optional(),
  businessEmail: z.string().email(),
  phone: z.string().min(7),
  website: z.string().url().optional().or(z.literal("")),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(2),
  userName: z.string().min(2),
  userEmail: z.string().email(),
  password: z.string().min(8),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const businesses = await prisma.business.findMany({
    where: status ? { status: status as any } : {},
    include: {
      address: true,
      kycDocuments: true,
      _count: { select: { users: true, orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(businesses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data } = parsed;

  // Require email to have been verified before registration
  const verifiedToken = await prisma.verificationToken.findFirst({
    where: { identifier: data.userEmail, token: `VERIFIED:${data.userEmail}`, expires: { gt: new Date() } },
  });
  if (!verifiedToken) {
    return NextResponse.json({ error: "Email not verified. Please complete email verification first." }, { status: 403 });
  }

  const exists = await prisma.user.findUnique({ where: { email: data.userEmail } });
  if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const businessExists = await prisma.business.findUnique({ where: { email: data.businessEmail } });
  if (businessExists) return NextResponse.json({ error: "A business is already registered with that business email address" }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    const business = await prisma.$transaction(async (tx) => {
      // Consume the verified token
      await tx.verificationToken.deleteMany({ where: { identifier: data.userEmail } });

      const biz = await tx.business.create({
        data: {
          name: data.businessName,
          legalName: data.legalName,
          taxId: data.taxId,
          registrationNo: data.registrationNo,
          email: data.businessEmail,
          phone: data.phone,
          website: data.website || null,
          address: {
            create: {
              street1: data.street1,
              street2: data.street2,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              country: data.country,
            },
          },
        },
      });

      await tx.user.create({
        data: {
          name: data.userName,
          email: data.userEmail,
          passwordHash,
          role: "BUSINESS_OWNER",
          businessId: biz.id,
          emailVerified: new Date(),
        },
      });

      return biz;
    });

    return NextResponse.json({ id: business.id, message: "Registration submitted. Pending KYC review." }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      const field = err.meta?.target?.[0] ?? "field";
      return NextResponse.json({ error: `A record with that ${field} already exists` }, { status: 409 });
    }
    throw err;
  }
}
