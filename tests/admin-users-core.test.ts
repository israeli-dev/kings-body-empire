import { describe, expect, it } from "vitest";
import {
  coachToggleTarget,
  filterUsers,
  initialsForName,
  isUserRole,
  matchesUserSearch,
  normalizeSearchQuery,
  parseRoleFilter,
  parseUserListQuery,
  roleLabel,
  validateRoleChange,
} from "@/lib/admin-users-core";

describe("isUserRole / parseRoleFilter", () => {
  it("accepts the three roles and rejects everything else", () => {
    expect(isUserRole("CLIENT")).toBe(true);
    expect(isUserRole("COACH")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(true);
    expect(isUserRole("client")).toBe(false);
    expect(isUserRole("SUPERUSER")).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it("treats a missing role filter as ALL", () => {
    expect(parseRoleFilter(undefined)).toBe("ALL");
    expect(parseRoleFilter(null)).toBe("ALL");
    expect(parseRoleFilter("")).toBe("ALL");
    expect(parseRoleFilter("ALL")).toBe("ALL");
    expect(parseRoleFilter("COACH")).toBe("COACH");
    expect(parseRoleFilter("coach")).toBeNull();
    expect(parseRoleFilter("nope")).toBeNull();
  });
});

describe("normalizeSearchQuery / parseUserListQuery", () => {
  it("trims, collapses whitespace and caps length", () => {
    expect(normalizeSearchQuery("  ada   lovelace  ")).toBe("ada lovelace");
    expect(normalizeSearchQuery(undefined)).toBe("");
    expect(normalizeSearchQuery(null)).toBe("");
    expect(normalizeSearchQuery("x".repeat(200))).toHaveLength(100);
  });

  it("defaults to all roles and 50 results", () => {
    expect(parseUserListQuery({})).toEqual({ q: "", role: "ALL", limit: 50 });
    expect(parseUserListQuery({ q: " ada ", role: "COACH", limit: "10" })).toEqual({
      q: "ada",
      role: "COACH",
      limit: 10,
    });
  });

  it("rejects bad roles and out-of-range limits", () => {
    expect(parseUserListQuery({ role: "nope" })).toBeNull();
    expect(parseUserListQuery({ limit: "0" })).toBeNull();
    expect(parseUserListQuery({ limit: "101" })).toBeNull();
    expect(parseUserListQuery({ limit: "abc" })).toBeNull();
    expect(parseUserListQuery({ limit: "1.5" })).toBeNull();
  });
});

describe("roleLabel / coachToggleTarget / initialsForName", () => {
  it("labels roles for humans", () => {
    expect(roleLabel("CLIENT")).toBe("Client");
    expect(roleLabel("COACH")).toBe("Coach");
    expect(roleLabel("ADMIN")).toBe("Admin");
  });

  it("toggles client <-> coach and leaves admins alone", () => {
    expect(coachToggleTarget("CLIENT")).toBe("COACH");
    expect(coachToggleTarget("COACH")).toBe("CLIENT");
    expect(coachToggleTarget("ADMIN")).toBeNull();
  });

  it("builds avatar initials", () => {
    expect(initialsForName("Ada Lovelace")).toBe("AL");
    expect(initialsForName("Ada")).toBe("A");
    expect(initialsForName("  ")).toBe("?");
  });
});

describe("validateRoleChange", () => {
  const base = { actorId: "admin-1", targetId: "user-1", targetRole: "CLIENT" as const, adminCount: 2 };

  it("allows making a client a coach", () => {
    expect(validateRoleChange({ ...base, newRole: "COACH" })).toBeNull();
  });

  it("allows stepping a coach back down to client", () => {
    expect(
      validateRoleChange({ ...base, targetRole: "COACH", newRole: "CLIENT" }),
    ).toBeNull();
  });

  it("rejects an unknown role", () => {
    expect(validateRoleChange({ ...base, newRole: "SUPERUSER" })).toContain("Role must be");
    expect(validateRoleChange({ ...base, newRole: undefined })).toContain("Role must be");
  });

  it("rejects changing your own role", () => {
    expect(
      validateRoleChange({ ...base, targetId: "admin-1", targetRole: "ADMIN", newRole: "COACH" }),
    ).toContain("your own role");
  });

  it("rejects a no-op change", () => {
    expect(validateRoleChange({ ...base, newRole: "CLIENT" })).toContain("already a Client");
    expect(
      validateRoleChange({ ...base, targetRole: "COACH", newRole: "COACH" }),
    ).toContain("already a Coach");
  });

  it("protects the last admin from demotion", () => {
    expect(
      validateRoleChange({ ...base, targetRole: "ADMIN", newRole: "COACH", adminCount: 1 }),
    ).toContain("last admin");
    expect(
      validateRoleChange({ ...base, targetRole: "ADMIN", newRole: "COACH", adminCount: 2 }),
    ).toBeNull();
  });
});

describe("matchesUserSearch / filterUsers", () => {
  const users = [
    { id: "1", name: "Ada Lovelace", email: "ada@gmail.com", role: "CLIENT" as const },
    { id: "2", name: "Chidi Okafor", email: "chidi@kingsbodyempire.com", role: "COACH" as const },
    { id: "3", name: "Grace Hopper", email: "grace@gmail.com", role: "ADMIN" as const },
  ];

  it("matches name or email, case-insensitively", () => {
    expect(matchesUserSearch(users[0], "ada")).toBe(true);
    expect(matchesUserSearch(users[0], "ADA")).toBe(true);
    expect(matchesUserSearch(users[0], "@gmail.com")).toBe(true);
    expect(matchesUserSearch(users[0], "chidi")).toBe(false);
    expect(matchesUserSearch(users[0], "")).toBe(true);
  });

  it("filters by query and role together", () => {
    expect(filterUsers(users, { q: "gmail", role: "ALL" })).toHaveLength(2);
    expect(filterUsers(users, { q: "", role: "COACH" })).toEqual([users[1]]);
    expect(filterUsers(users, { q: "grace", role: "CLIENT" })).toEqual([]);
    expect(filterUsers(users, { q: "  ", role: "ALL" })).toHaveLength(3);
  });
});
