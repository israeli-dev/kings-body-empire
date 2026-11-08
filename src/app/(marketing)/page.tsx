import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/caveat/600.css";
import { authOptions } from "@/lib/auth";
import { LandingPage } from "@/components/landing-page";
import "@/components/landing.css";

export const metadata: Metadata = {
  title: "Kings Body Empire — Train. Eat. Track. Transform.",
  description:
    "Your complete fitness and nutrition platform: coached programs, e-books, tracking and a consistency rank that keeps you accountable.",
};

// Reads the session and the e-book catalogue — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Reading the session needs NEXTAUTH_SECRET to be set. On a fresh deploy where
 * the variable is still missing, NextAuth throws — and that would take the
 * public landing page down with it. Fall back to "signed out" so the front
 * door always renders and only the auth routes report the misconfiguration.
 */
async function readSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const session = await readSession();
  return <LandingPage loggedIn={Boolean(session?.user)} />;
}
