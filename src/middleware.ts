import { withAuth } from "next-auth/middleware";

/** Everything behind this list requires a signed-in session. */
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => Boolean(token),
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/workouts/:path*",
    "/food/:path*",
    "/measurements/:path*",
    "/progress/:path*",
    "/book-call/:path*",
    "/education/:path*",
    "/admin/:path*",
  ],
};
