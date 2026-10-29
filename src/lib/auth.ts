import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { inferredNextAuthUrl } from "./site-url";
import type { RankName, UserRole } from "@/types";

// NEXTAUTH_URL has to exist and describe this deployment, or NextAuth issues
// cookies for the wrong host and every login bounces back. Render and Vercel
// already know the public URL, so adopt it when the variable was forgotten.
const inferredUrl = inferredNextAuthUrl(process.env);
if (inferredUrl) {
  process.env.NEXTAUTH_URL = inferredUrl;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      `[auth] NEXTAUTH_URL was not set; using ${inferredUrl} from the platform. Set NEXTAUTH_URL explicitly to silence this.`,
    );
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          rank: user.rank as RankName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const authed = user as typeof user & { role?: UserRole; rank?: RankName };
        token.id = authed.id;
        token.role = authed.role ?? "CLIENT";
        token.rank = authed.rank ?? "BRONZE";
      }

      // Refresh the rank badge when the client explicitly asks for it.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { rank: true, role: true },
        });
        if (fresh) {
          token.rank = fresh.rank as RankName;
          token.role = fresh.role as UserRole;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = (token.role as UserRole) ?? "CLIENT";
        session.user.rank = (token.rank as RankName) ?? "BRONZE";
      }
      return session;
    },
  },
};
