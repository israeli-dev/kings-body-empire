import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashResetToken, RESET_REQUEST_COOLDOWN_MS } from "@/lib/password-reset";

/**
 * Exercises the two API routes end to end against an in-memory fake of the
 * Prisma models they touch, so the token lifecycle (issue → use → cannot reuse,
 * expiry, cooldown, account takeover attempts) is covered without a database.
 */

type UserRow = { id: string; name: string; email: string; passwordHash: string };
type TokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

const db: { users: UserRow[]; tokens: TokenRow[] } = { users: [], tokens: [] };

function resetDb() {
  db.users = [
    {
      id: "u1",
      name: "Coach King",
      email: "coach@example.com",
      passwordHash: "OLD_HASH",
    },
  ];
  db.tokens = [];
}

const fakePrisma = {
  user: {
    findUnique: async ({ where }: any) => {
      const user = db.users.find(
        (u) => u.id === where.id || u.email === where.email,
      );
      return user ?? null;
    },
    update: async ({ where, data }: any) => {
      const user = db.users.find((u) => u.id === where.id);
      if (!user) throw new Error("missing user");
      Object.assign(user, data);
      return user;
    },
  },
  passwordResetToken: {
    findFirst: async ({ where }: any) => {
      const rows = db.tokens.filter(
        (t) =>
          t.userId === where.userId &&
          (!where.createdAt?.gte || t.createdAt >= where.createdAt.gte),
      );
      return rows[0] ?? null;
    },
    findUnique: async ({ where }: any) => {
      const row = db.tokens.find((t) => t.tokenHash === where.tokenHash);
      if (!row) return null;
      // Mirrors Prisma's `include`/`select` for the user relation.
      const user = db.users.find((u) => u.id === row.userId);
      return { ...row, user: { email: user?.email } };
    },
    create: async ({ data }: any) => {
      const row: TokenRow = {
        id: `t${db.tokens.length + 1}`,
        usedAt: null,
        createdAt: new Date(),
        ...data,
      };
      db.tokens.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = db.tokens.find((t) => t.id === where.id);
      if (!row) throw new Error("missing token");
      Object.assign(row, data);
      return row;
    },
    deleteMany: async ({ where }: any) => {
      const before = db.tokens.length;
      db.tokens = db.tokens.filter(
        (t) =>
          !(
            t.userId === where.userId &&
            (where.usedAt === null ? t.usedAt === null : true)
          ),
      );
      return { count: before - db.tokens.length };
    },
  },
  $transaction: async (ops: unknown) => Promise.all(ops as Promise<unknown>[]),
};

const sentMails: { to: string; text: string; subject: string }[] = [];

vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma }));
vi.mock("@/lib/mailer", async () => {
  const actual = await vi.importActual<typeof import("@/lib/mailer")>("@/lib/mailer");
  return {
    ...actual,
    sendMail: async (message: { to: string; text: string; subject: string }) => {
      sentMails.push(message);
      return { ok: true, transport: "console" as const };
    },
  };
});

function jsonRequest(url: string, body: unknown, ip = "10.1.1.1") {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

/** Pull the raw token out of the emailed link. */
function tokenFromLastEmail(): string {
  const link = /\/reset-password\/([A-Za-z0-9_-]+)/.exec(sentMails.at(-1)!.text);
  if (!link) throw new Error("no token in email");
  return link[1];
}

describe("password reset flow", () => {
  beforeEach(() => {
    resetDb();
    sentMails.length = 0;
  });

  it("issues a hashed token and emails a usable link", async () => {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const res = await POST(jsonRequest("http://localhost/api/auth/forgot-password", {
      email: "coach@example.com",
    }));

    expect(res.status).toBe(200);
    expect(db.tokens).toHaveLength(1);
    expect(sentMails).toHaveLength(1);

    const token = tokenFromLastEmail();
    // Only the hash is persisted.
    expect(db.tokens[0].tokenHash).toBe(hashResetToken(token));
    expect(db.tokens[0].tokenHash).not.toBe(token);
    expect(sentMails[0].to).toBe("coach@example.com");
  });

  it("resets the password, signs the user in and burns the token", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    const reset = await import("@/app/api/auth/reset-password/route");

    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", {
        email: "coach@example.com",
      }),
    );
    const token = tokenFromLastEmail();

    const res = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", {
        token,
        password: "BrandNew123",
      }),
    );

    expect(res.status).toBe(200);
    const payload = (await res.json()) as { ok: boolean; email?: string };
    expect(payload.ok).toBe(true);
    expect(payload.email).toBe("coach@example.com");

    expect(db.users[0].passwordHash).not.toBe("OLD_HASH");
    expect(db.users[0].passwordHash.startsWith("$2")).toBe(true); // bcrypt
    expect(db.tokens[0].usedAt).toBeInstanceOf(Date);
  });

  it("refuses to reuse a token", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    const reset = await import("@/app/api/auth/reset-password/route");

    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }),
    );
    const token = tokenFromLastEmail();

    const first = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", { token, password: "BrandNew123" }),
    );
    expect(first.status).toBe(200);

    const second = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", { token, password: "Another123" }, "10.9.9.9"),
    );
    expect(second.status).toBe(400);
    const body = (await second.json()) as { error: string };
    expect(body.error).toMatch(/already been used/i);
  });

  it("rejects an expired token", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    const reset = await import("@/app/api/auth/reset-password/route");

    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }),
    );
    const token = tokenFromLastEmail();
    db.tokens[0].expiresAt = new Date(Date.now() - 1000);

    const res = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", { token, password: "BrandNew123" }),
    );
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/expired/i);
    expect(db.users[0].passwordHash).toBe("OLD_HASH");
  });

  it("invalidates older links when a new one is requested", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    const reset = await import("@/app/api/auth/reset-password/route");

    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }),
    );
    const firstToken = tokenFromLastEmail();

    // Pretend the cooldown has passed.
    db.tokens[0].createdAt = new Date(Date.now() - RESET_REQUEST_COOLDOWN_MS - 1000);
    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }, "10.2.2.2"),
    );
    const secondToken = tokenFromLastEmail();
    expect(secondToken).not.toBe(firstToken);

    const stale = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", {
        token: firstToken,
        password: "BrandNew123",
      }),
    );
    expect(stale.status).toBe(400);

    const fresh = await reset.POST(
      jsonRequest("http://localhost/api/auth/reset-password", {
        token: secondToken,
        password: "BrandNew123",
      }, "10.3.3.3"),
    );
    expect(fresh.status).toBe(200);
  });

  it("does not reveal whether an email exists", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    const unknown = await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "ghost@example.com" }, "10.4.4.4"),
    );
    const known = await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }, "10.5.5.5"),
    );

    expect(unknown.status).toBe(200);
    expect(known.status).toBe(200);
    expect(await unknown.json()).toEqual(await known.json());
    expect(sentMails).toHaveLength(1); // only the real account got an email
  });

  it("skips sending a second email inside the cooldown window", async () => {
    const forgot = await import("@/app/api/auth/forgot-password/route");
    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }, "10.6.6.6"),
    );
    await forgot.POST(
      jsonRequest("http://localhost/api/auth/forgot-password", { email: "coach@example.com" }, "10.6.6.6"),
    );

    expect(sentMails).toHaveLength(1);
    expect(db.tokens).toHaveLength(1);
  });
});
