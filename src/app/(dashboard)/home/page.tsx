import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/caveat/600.css";
import { getCurrentUser } from "@/lib/api";
import { LandingPage } from "@/components/landing-page";
import "@/components/landing.css";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

/**
 * The signed-in home. Same beautiful page the public sees at /, but rendered
 * inside the dashboard chrome with member calls-to-action — this is where
 * logging in lands you.
 */
export default async function MemberHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fhome");

  return <LandingPage loggedIn />;
}
