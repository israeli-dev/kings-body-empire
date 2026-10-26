import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import type { RankName, UserRole } from "@/types";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  rank: RankName;
};

/** The signed-in user, or null. Never throws. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json(
    { error: "You do not have permission to do that." },
    { status: 403 },
  );
}

export function badRequest(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function notFound(error = "Not found.") {
  return NextResponse.json({ error }, { status: 404 });
}

export function serverError(
  error = "Something went wrong on our side. Please try again.",
) {
  return NextResponse.json({ error }, { status: 500 });
}

/** Body parsing that fails softly instead of throwing a 500. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
