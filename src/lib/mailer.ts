import { supportEmail } from "./env";

/**
 * Transactional email with three interchangeable transports, picked from the
 * environment so the code never changes between local development and
 * production:
 *
 *   1. RESEND_API_KEY set            → Resend HTTP API (recommended on Vercel/Render)
 *   2. SMTP_URL set                  → SMTP via nodemailer (Gmail, Zoho, Mailtrap…)
 *   3. neither                        → the message is logged to the console
 *
 * `EMAIL_FROM` must be an address the provider has verified, e.g.
 * "Kings Body Empire <no-reply@kingsbodyempire.com>".
 */

const DEFAULT_FROM = "Kings Body Empire <onboarding@resend.dev>";

export type MailResult =
  | { ok: true; transport: "resend" | "smtp" | "console" }
  | { ok: false; transport: "resend" | "smtp"; error: string };

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

export function mailTransport(): "resend" | "smtp" | "console" {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.SMTP_URL?.trim()) return "smtp";
  return "console";
}

async function sendWithResend(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY!.trim();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as
        | { message?: string; error?: { message?: string } }
        | null;
      const error =
        payload?.message ?? payload?.error?.message ?? `Resend responded ${res.status}`;
      console.error("[mailer] Resend rejected the message:", error);
      return { ok: false, transport: "resend", error };
    }

    return { ok: true, transport: "resend" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mailer] Resend request failed:", message);
    return { ok: false, transport: "resend", error: message };
  }
}

async function sendWithSmtp(message: MailMessage): Promise<MailResult> {
  // Imported lazily so the dependency is optional at runtime.
  const { default: nodemailer } = await import("nodemailer");
  try {
    const transport = nodemailer.createTransport(process.env.SMTP_URL!);
    await transport.sendMail({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { ok: true, transport: "smtp" };
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.error("[mailer] SMTP send failed:", text);
    return { ok: false, transport: "smtp", error: text };
  }
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const transport = mailTransport();

  if (transport === "resend") return sendWithResend(message);
  if (transport === "smtp") return sendWithSmtp(message);

  // Development fallback: make the link impossible to miss in the terminal.
  console.log("\n────────────────────────────────────────────────────────");
  console.log("✉️  EMAIL (console transport — no provider configured)");
  console.log(`   To:      ${message.to}`);
  console.log(`   Subject: ${message.subject}`);
  console.log("");
  console.log(message.text.trim());
  console.log("────────────────────────────────────────────────────────\n");
  return { ok: true, transport: "console" };
}

/** The reset email. Kept here so copy lives in one place. */
export function passwordResetEmail(link: string, expiresInMinutes: number): MailMessage {
  const subject = "Reset your Kings Body Empire password";
  const text = [
    "Someone asked to reset the password for this Kings Body Empire account.",
    "",
    `Open this link to choose a new password (valid for ${expiresInMinutes} minutes):`,
    link,
    "",
    "If that was not you, ignore this email — your password stays unchanged.",
    "",
    "Didn't request it? Someone may have typed your email by mistake. Reply to",
    `${supportEmail} if you keep getting these.`,
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0E0C0A;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#171410;border:1px solid #2C251C;border-radius:16px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5B301;">Kings Body Empire</p>
          <h1 style="margin:12px 0 0;font-size:22px;color:#F7F5EF;font-weight:600;">Reset your password</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#A79F94;">
            Someone asked to reset the password for this account. Choose a new one using the
            button below — the link works for ${expiresInMinutes} minutes and can only be used once.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;">
          <a href="${link}" style="display:inline-block;background:#F5B301;color:#14100A;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">Choose a new password</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A79F94;">
            Button not working? Paste this link into your browser:<br />
            <span style="color:#FFD978;word-break:break-all;">${link}</span>
          </p>
          <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#A79F94;">
            If that was not you, ignore this email — your password stays unchanged.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: "", subject, text, html };
}

/** Sent to the referrer when an invite pays and the bonus days land. */
export function referralRewardEmail(input: {
  referrerName: string;
  refereeName: string;
  rewardDays: number;
  dashboardUrl: string;
}): MailMessage {
  const firstName = input.referrerName.split(" ")[0] || "there";
  const subject = `${input.rewardDays} free days — ${input.refereeName} just joined`;

  const text = [
    `Nice one, ${firstName}.`,
    "",
    `${input.refereeName} signed up with your referral code and paid for their first program.`,
    `You have both earned ${input.rewardDays} extra days of access.`,
    "",
    "If you have a live program, the days were added to your current period.",
    "If not, they are banked and will be added to your first month.",
    "",
    `See where things stand: ${input.dashboardUrl}`,
    "",
    "Keep sharing your code — every friend who subscribes adds another week.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#0E0C0A;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#171410;border:1px solid #2C251C;border-radius:16px;">
      <tr>
        <td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#F5B301;">Kings Body Empire</p>
          <h1 style="margin:12px 0 0;font-size:22px;color:#F7F5EF;font-weight:600;">${input.rewardDays} free days added</h1>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#A79F94;">
            ${input.refereeName} signed up with your referral code and paid for their first program.
            You have both earned ${input.rewardDays} extra days of access.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px;">
          <a href="${input.dashboardUrl}" style="display:inline-block;background:#F5B301;color:#14100A;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">Open your dashboard</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 24px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#A79F94;">
            Already on a program? The days were added to your current period. Not subscribed yet?
            They are banked and will be applied to your first month.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to: "", subject, text, html };
}
