# Deployment guide

Target setup: **Vercel** (app) + **Supabase or Neon** (PostgreSQL) + **Paystack**
(payments). Any Node host that runs `next start` works the same way.

## 0. Sanity-check the connection first

```bash
npm run db:check      # redacted DATABASE_URL + live connection test
```

If it reports a problem it tells you exactly which piece of the URL is wrong —
see the Troubleshooting table in the README.

## 1. Database

1. Create a Supabase or Neon project and copy the **direct** connection string
   (port `5432`).
2. From your machine, with that URL in `DATABASE_URL`:

   ```bash
   npm run db:deploy   # applies prisma/migrations to production (no shadow DB needed)
   npm run db:seed     # optional: admin account + starter catalogue
   ```

   `db:deploy` is the right command on Supabase/Neon — `db:migrate` is for local
   schema development only, because it wants to create a shadow database.

   Use a direct/session connection for this step — a transaction pooler
   (PgBouncer on port 6543) will refuse the advisory locks migrations need.
3. If the provider blocks creating databases, `npm run db:push` is an acceptable
   shortcut for the first deploy (it syncs the schema without the shadow DB).

4. Change the seeded admin password immediately:
   `ADMIN_PASSWORD="…" npm run db:seed` updates the existing admin's role and
   name; to rotate the password open Prisma Studio (`npm run db:studio`) or
   update `passwordHash` with a bcrypt hash.

## 2. Environment variables on Vercel

Project → Settings → Environment Variables (Production **and** Preview):

```
DATABASE_URL=postgresql://…          # add ?pgbouncer=true&connection_limit=1 when using a pooler
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
PAYSTACK_SECRET_KEY=sk_live_…
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_…
NEXT_PUBLIC_SUPPORT_EMAIL=hello@your-domain.com
NEXT_PUBLIC_TIMEZONE=Africa/Lagos
```

`ADMIN_*` and `SEED_DEMO_CLIENT` are only needed when you run the seed locally.

## 3. Deploy

- Import the GitHub repo in Vercel → framework auto-detects Next.js.
- Build command: `npm run build` (runs `prisma generate` first).
- Output: default (`.next`).
- `postinstall` already generates the Prisma client; `prisma/schema.prisma`
  includes Vercel's `rhel-openssl-3.0.x` binary target so the query engine
  ships with the serverless functions.

## 4. Paystack

1. Dashboard → Settings → API Keys & Webhooks.
2. Webhook URL: `https://your-domain.com/api/paystack/webhook`
   (the handler verifies the `x-paystack-signature` HMAC-SHA512 header).
3. Leave the callback URL alone — the app sends
   `callback_url=/api/paystack/callback` per transaction.
4. Test with `sk_test_…` keys first; Paystack test card:
   `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.
5. Switch to live keys only after a full test purchase on the production domain.

## 5. Post-deploy checklist

- [ ] Sign up, log a workout, confirm the rank badge appears.
- [ ] Book a call (create a slot as admin first) and cancel it.
- [ ] Test purchase → success page → program shows on dashboard → `/admin`
      shows the purchase as PAID.
- [ ] E-book download works for the buyer and is blocked in a private window.
- [ ] Webhook shows `200` in the Paystack dashboard's event log.
- [ ] Emails/WhatsApp/Instagram links in the footer point at real accounts.
- [ ] Replace the placeholder testimonials in `src/lib/content.ts` and the
      seed e-book `fileUrl`s with your real assets.

## Notes

- Keep `NEXTAUTH_SECRET` stable: rotating it signs everyone out.
- Prisma migrations are committed; run `npm run db:deploy` on every release that
  touches `prisma/schema.prisma`.
- Vercel's serverless functions are stateless — the app already creates one
  Prisma client per instance (`src/lib/prisma.ts`).
