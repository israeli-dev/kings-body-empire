/**
 * Turning a NextAuth error code into something true.
 *
 * NextAuth only means "wrong password" for `CredentialsSignin`. Everything else
 * — missing NEXTAUTH_SECRET, an unreachable database, a callback that cannot be
 * built — used to be shown as "That email or password is not right.", which sent
 * people resetting passwords that were never wrong.
 */
export function loginErrorMessage(code: string | null | undefined): string {
  if (!code) return "";

  switch (code) {
    case "CredentialsSignin":
      return "That email or password is not right.";
    case "AccessDenied":
      return "That account is not allowed to sign in.";
    case "SessionRequired":
      return "Please log in to continue.";
    case "Verification":
      return "That sign-in link has expired. Request a new one.";
    default:
      return "The server could not complete the sign-in. This is a configuration problem on our side, not your password — please try again in a minute.";
  }
}

/** True when the code means "the credentials were rejected", not "we are broken". */
export function isCredentialRejection(code: string | null | undefined): boolean {
  return code === "CredentialsSignin";
}
