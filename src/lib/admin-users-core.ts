/**
 * Admin user-management rules that do not touch the database.
 *
 * Keeping the search/role rules here (like rank-core / subscription-core)
 * means the "who can become a coach, and who can be searched for" logic is
 * unit-testable and shared by the API routes and the admin UI.
 */
import type { RankName, UserRole } from "@/types";

export const USER_ROLES = ["CLIENT", "COACH", "ADMIN"] as const;

export type UserRoleName = (typeof USER_ROLES)[number];

/** Filter value used by the admin UI: a concrete role, or every role. */
export type RoleFilter = UserRoleName | "ALL";

export const ROLE_FILTERS: readonly RoleFilter[] = ["ALL", "CLIENT", "COACH", "ADMIN"];

export const MAX_SEARCH_LENGTH = 100;
export const DEFAULT_USER_LIMIT = 50;
export const MAX_USER_LIMIT = 100;

export function isUserRole(value: unknown): value is UserRoleName {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

/** Parse a `?role=` query value. Missing/empty means "all roles". */
export function parseRoleFilter(value: unknown): RoleFilter | null {
  if (value === null || value === undefined || value === "") return "ALL";
  if (value === "ALL") return "ALL";
  return isUserRole(value) ? value : null;
}

/** Trim + collapse whitespace and cap the length. Empty means "no search". */
export function normalizeSearchQuery(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, MAX_SEARCH_LENGTH);
}

export type UserListQuery = {
  q: string;
  role: RoleFilter;
  limit: number;
};

/**
 * Parse the query string for GET /api/admin/users.
 * Returns null when the caller sent something invalid (bad role / limit).
 */
export function parseUserListQuery(params: {
  q?: string | null;
  role?: string | null;
  limit?: string | null;
}): UserListQuery | null {
  const role = parseRoleFilter(params.role ?? undefined);
  if (!role) return null;

  let limit = DEFAULT_USER_LIMIT;
  if (params.limit !== null && params.limit !== undefined && params.limit !== "") {
    const parsed = Number(params.limit);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_USER_LIMIT) return null;
    limit = parsed;
  }

  return { q: normalizeSearchQuery(params.q ?? ""), role, limit };
}

/** Human label for a role, used in badges and confirmation copy. */
export function roleLabel(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "COACH":
      return "Coach";
    case "CLIENT":
    default:
      return "Client";
  }
}

/**
 * The role a "Make coach / Remove coach" toggle would move someone to.
 * Admins sit above coach, so there is nothing to toggle for them.
 */
export function coachToggleTarget(role: UserRole): UserRoleName | null {
  if (role === "CLIENT") return "COACH";
  if (role === "COACH") return "CLIENT";
  return null;
}

export type RoleChangeInput = {
  actorId: string;
  targetId: string;
  targetRole: UserRole;
  newRole: unknown;
  /** How many admins exist right now (guards the last-admin demotion). */
  adminCount: number;
};

/**
 * Validate a role change. Returns an error message, or null when allowed.
 * The API route still re-checks auth + existence against the database.
 */
export function validateRoleChange(input: RoleChangeInput): string | null {
  if (!isUserRole(input.newRole)) {
    return `Role must be one of: ${USER_ROLES.join(", ")}.`;
  }
  if (input.actorId === input.targetId) {
    return "You cannot change your own role.";
  }
  if (input.targetRole === input.newRole) {
    return `That user is already a ${roleLabel(input.newRole)}.`;
  }
  if (input.targetRole === "ADMIN" && input.newRole !== "ADMIN" && input.adminCount <= 1) {
    return "Cannot demote the last admin. Promote another admin first.";
  }
  return null;
}

/** "Ada Lovelace" → "AL". Used for the avatar circle in the admin table. */
export function initialsForName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "?";
}

/** Case-insensitive "name or email contains the query" check. */
export function matchesUserSearch(
  user: { name: string; email: string },
  query: string,
): boolean {
  const needle = normalizeSearchQuery(query).toLowerCase();
  if (!needle) return true;
  return (
    user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)
  );
}

/** Client-side mirror of the API search (name/email + role filter). */
export function filterUsers<T extends { name: string; email: string; role: UserRole }>(
  users: T[],
  { q, role }: { q: string; role: RoleFilter },
): T[] {
  return users.filter(
    (user) => (role === "ALL" || user.role === role) && matchesUserSearch(user, q),
  );
}

/** Shared shape returned by GET /api/admin/users and used by the admin UI. */
export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rank: RankName;
  /** ISO-8601 string (serialised for JSON transport). */
  createdAt: string;
};

/** Same row shape as AdminUserSummary but with a Date, straight from Prisma. */
export type AdminUserQueryRow = Omit<AdminUserSummary, "createdAt"> & { createdAt: Date };

export function toAdminUserSummary(row: AdminUserQueryRow): AdminUserSummary {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/** Totals shown on the "All / Clients / Coaches / Admins" filter tabs. */
export type RoleCounts = Record<"total" | UserRoleName, number>;

export function emptyRoleCounts(): RoleCounts {
  return { total: 0, CLIENT: 0, COACH: 0, ADMIN: 0 };
}

/** Fold one groupBy bucket into the totals (keeps admin count and total in sync). */
export function addRoleCounts(counts: RoleCounts, role: UserRoleName, n: number): void {
  counts[role] += n;
  counts.total += n;
}
