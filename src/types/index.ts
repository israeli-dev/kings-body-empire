/** Shared, framework-agnostic types (kept free of Prisma imports so they can
 *  be used from client components and tests). */

export type UserRole = "CLIENT" | "COACH" | "ADMIN";

export type RankName = "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export type PurchasableKind = "package" | "book";
