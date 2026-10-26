import type { DefaultSession } from "next-auth";
import type { RankName, UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      rank: RankName;
    } & DefaultSession["user"];
  }

  interface User {
    role?: UserRole;
    rank?: RankName;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    rank?: RankName;
  }
}
