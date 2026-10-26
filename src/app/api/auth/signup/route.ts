import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, readJson, serverError } from "@/lib/api";
import { parseEmail, parseText } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with name, email and password.");

  const name = parseText(body.name, { min: 2, max: 80 });
  const email = parseEmail(body.email);
  const password = parseText(body.password, { min: 8, max: 200 });

  if (!name) return badRequest("Please enter your name (at least 2 characters).");
  if (!email) return badRequest("That email address does not look valid.");
  if (!password) return badRequest("Password must be at least 8 characters.");

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("An account with that email already exists.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return serverError("Could not create your account. Please try again.");
  }
}
