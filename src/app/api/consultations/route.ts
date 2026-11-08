import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getCurrentUser,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { supportEmail } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { parsePhone, parseText } from "@/lib/validation";
import {
  CONSULTATION_FEE_KOBO,
  CONSULTATION_FEE_LABEL,
  SPECIALTY_DETAILS,
  isConsultationMode,
  isConsultationSpecialty,
  modeLabel,
} from "@/lib/consultation-core";
import { consultationRequestEmail, sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const NINETY_DAYS_MS = 150 * 24 * 60 * 60 * 1000;

// Consultation requests go to the studio inbox: CONSULTATION_NOTIFY_EMAIL when
// set, otherwise the public support email (kingsbodyempire@gmail.com by default).
const NOTIFY_EMAIL =
  process.env.CONSULTATION_NOTIFY_EMAIL?.trim() || supportEmail;

/** GET — the signed-in client's own consultation requests, newest first. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const requests = await prisma.consultationRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        specialty: true,
        mode: true,
        preferredAt: true,
        address: true,
        notes: true,
        amountKobo: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json(requests);
  } catch {
    return serverError("Could not load your consultation requests.");
  }
}

/**
 * POST — request a home-visit or remote consultation.
 * The fee (₦20,000 flat) is paid on the call / at the visit, not online —
 * this endpoint only records the request and emails the studio inbox.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Basic abuse control: 10 requests per IP per 15 minutes…
  const limited = rateLimit(clientKey(req, "consultations"), 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${limited.retryAfterSeconds} seconds.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  // …and at most 8 fresh requests per account per day.
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await prisma.consultationRequest.count({
      where: { userId: user.id, createdAt: { gte: dayAgo } },
    });
    if (recentCount >= 8) {
      return NextResponse.json(
        { error: "You have made several requests today — the team will reach out before we take more." },
        { status: 429 },
      );
    }
  } catch {
    return serverError("Could not check your recent requests.");
  }

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with the consultation details.");

  if (!isConsultationSpecialty(body.specialty)) {
    return badRequest(
      "Choose a specialty: Fitness Coach, Dietician, Nutritionist, Cardiologist, Diabetologist / Endocrinologist or Neurologist.",
    );
  }
  if (!isConsultationMode(body.mode)) {
    return badRequest("Choose how you would like the consultation: video/phone or a home visit.");
  }

  const phone = parsePhone(body.phone);
  if (!phone) return badRequest("Enter a reachable phone number (7–15 digits).");

  const rawNotes = typeof body.notes === "string" ? body.notes.trim() : "";
  const notes = rawNotes ? parseText(rawNotes, { min: 1, max: 600 }) : null;
  if (rawNotes && !notes) return badRequest("Notes must be 600 characters or fewer.");

  const preferredAt = typeof body.preferredAt === "string" ? new Date(body.preferredAt) : null;
  if (!preferredAt || Number.isNaN(preferredAt.getTime())) {
    return badRequest("Pick a preferred date and time for the consultation.");
  }
  const now = Date.now();
  if (preferredAt.getTime() < now - 5 * 60 * 1000) {
    return badRequest("The preferred time must be in the future.");
  }
  if (preferredAt.getTime() > now + NINETY_DAYS_MS) {
    return badRequest("Please pick a date within the next five months.");
  }

  // Address is required for an actual home visit; optional (and ignored) for video.
  let address: string | null = null;
  if (body.mode === "HOME_VISIT") {
    address = body.address ? parseText(body.address, { min: 8, max: 240 }) : null;
    if (!address) {
      return badRequest("Enter the address for the home visit (house, street, area, landmark).");
    }
  }

  let request;
  try {
    request = await prisma.consultationRequest.create({
      data: {
        userId: user.id,
        specialty: body.specialty,
        mode: body.mode,
        phone,
        address,
        preferredAt,
        notes,
        amountKobo: CONSULTATION_FEE_KOBO,
      },
    });
  } catch {
    return serverError("Could not save your request. Please try again.");
  }

  const preferredAtLabel = preferredAt.toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  // Notify the studio inbox. Failure must not fail the client's booking —
  // the request is already stored and the client gets a WhatsApp shortcut too.
  try {
    const detail = SPECIALTY_DETAILS[request.specialty];
    const message = consultationRequestEmail({
      studioName: "Kings Body Empire",
      clientName: user.name ?? "Client",
      clientEmail: user.email ?? "unknown",
      phone,
      specialtyLabel: detail.label,
      modeLabel: modeLabel(request.mode),
      address,
      preferredAtLabel,
      notes,
      feeLabel: CONSULTATION_FEE_LABEL,
      requestId: request.id,
    });
    message.to = NOTIFY_EMAIL;
    await sendMail(message);
  } catch (error) {
    console.error("[consultations] Could not send studio notification:", error);
  }

  return NextResponse.json(
    {
      id: request.id,
      specialty: request.specialty,
      mode: request.mode,
      preferredAt: request.preferredAt,
      address: request.address,
      amountKobo: request.amountKobo,
      status: request.status,
    },
    { status: 201 },
  );
}
