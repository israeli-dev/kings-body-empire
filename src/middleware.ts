import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE, cookieMaxAgeSeconds, normaliseReferralCode } from "@/lib/referrals-core";

/** Everything under these paths needs a signed-in session. */
const PROTECTED = [
  "/dashboard",
  "/workouts",
  "/food",
  "/measurements",
  "/progress",
  "/book-call",
  "/education",
  "/admin",
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Two jobs:
 *  1. send signed-out visitors to /login (with a callbackUrl back to the page),
 *  2. remember `?ref=CODE` in a cookie for 30 days so a referral is not lost
 *     when the friend browses first and signs up tomorrow.
 */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const ref = normaliseReferralCode(searchParams.get("ref"));

  let response: NextResponse;

  if (isProtected(pathname)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const login = req.nextUrl.clone();
      login.pathname = "/login";
      const query = searchParams.toString();
      login.search = "";
      login.searchParams.set("callbackUrl", query ? `${pathname}?${query}` : pathname);
      response = NextResponse.redirect(login);
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  if (ref) {
    response.cookies.set({
      name: REFERRAL_COOKIE,
      value: ref,
      path: "/",
      maxAge: cookieMaxAgeSeconds(),
      sameSite: "lax",
      // Readable by the signup form so it can confirm the invite.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  // Everything except API routes and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images/|icon.svg).*)"],
};
