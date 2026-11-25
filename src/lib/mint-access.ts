import { prisma } from "./prisma";

/**
 * Mints a session user may access.
 * Returns null when there is no restriction (admins, or businesses without limited access),
 * otherwise the list of allowed mint names (possibly empty = no products).
 * Read from the DB on each call so admin changes apply immediately, without re-login.
 */
export async function getAllowedMints(user: any): Promise<string[] | null> {
  if (!user || ["SUPER_ADMIN", "ADMIN"].includes(user.role)) return null;
  if (!user.businessId) return null;

  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    select: { mintAccessLimited: true, allowedMints: true },
  });
  if (!business?.mintAccessLimited) return null;
  return business.allowedMints;
}

/** Prisma `where` fragment restricting products to the allowed mints. */
export function mintFilter(allowed: string[] | null) {
  return allowed === null ? {} : { mint: { in: allowed } };
}
