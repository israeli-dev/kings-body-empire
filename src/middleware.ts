import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/workouts/:path*", "/food/:path*", "/measurements/:path*"],
};
