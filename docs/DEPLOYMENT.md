# Deployment guide

Two supported paths:

- **[Vercel](#track-a--vercel-recommended)** — best fit for this app (Next.js native,
  serverless, free tier that does not sleep).
- **[Render](#track-b--render)** — good if you prefer a long-running Node server,
  or want everything on one bill. `render.yaml` is committed and ready.

Both use the same database (Supabase / Neon / any Postgres) and the same
Paystack setup.

---

## Before either track

### 1. Check the production database works

```bash
DATABASE_URL="postgresql://…production…" npm run db:check
DATABASE_URL="postgresql://…production…" npm run db:deploy   # create the tables
DATABASE_URL="postgresql://…production…" npm run db:seed     # admin + catalogue (optional)
```

- Use the **direct** connection (Supabase: port 5432) for migrations.
- If Supabase is asleep/paused, resume it in the dashboard first — `db:check`
  says so explicitly.
- Seed creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Pass them
  inline for production so the defaults never ship:

  ```bash
  DATABASE_URL="…" ADMIN_EMAIL="you@yourdomain.com" ADMIN_PASSWORD="<strong>" \
  SEED_DEMO_CLIENT="false" npm run db:seed
  ```

### 2. Generate a production auth secret

```bash
openssl rand -base64 32
```

Use this value for `NEXTAUTH_SECRET` everywhere. Changing it later signs
everyone out.

### 3. Merge your work into `main`

Both platforms deploy from a branch. If your changes only exist on a feature
branch, merge the PR to `main` first (or point the platform at that branch).

---

## Track A — Vercel (recommended)

### A1. Import the project

1. <https://vercel.com/new> → **Import Git Repository** → pick
   `israeli-dev/kings-body-empire`.
2. Framework preset: **Next.js** (auto-detected — leave build/output settings alone).
3. Don't deploy yet; add the env vars first.

### A2. Environment variables

Project → **Settings → Environment Variables**. Add each for **Production**
(and Preview if you want PR previews to work):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **pooler** URL with `?pgbouncer=true&connection_limit=1` (runtime) |
| `NEXTAUTH_SECRET` | the `openssl rand -base64 32` value |
| `NEXTAUTH_URL` | `https://<your-domain>` (Vercel domain or custom domain) |
| `NEXT_PUBLIC_SITE_URL` | same as `NEXTAUTH_URL` |
| `PAYSTACK_SECRET_KEY` | `sk_live_…` (or `sk_test_…` to trial it) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_…` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | your real support email |
| `NEXT_PUBLIC_TIMEZONE` | `Africa/Lagos` |
| `RESEND_API_KEY` | `re_…` — enables password-reset emails (or set `SMTP_URL`) |
| `EMAIL_FROM` | verified sender, e.g. `Kings Body Empire <no-reply@your-domain.com>` |
| `NEXT_PUBLIC_WHATSAPP_URL` | `https://wa.me/234…` (optional) |
| `NEXT_PUBLIC_INSTAGRAM_URL` | your profile URL (optional) |

> **Why the pooler?** Vercel runs many short-lived functions. The session
> pooler (port 5432 on `…pooler.supabase.com`) or the transaction pooler
> (6543 + `pgbouncer=true`) keeps you inside Supabase's connection limit.
> Migrations still need the direct URL — run them from your machine (step 1).

### A3. Deploy

**Deploy** → wait ~2 minutes. The build runs `npm run build`
(`prisma generate && next build`); `next.config.mjs` already includes Vercel's
`rhel-openssl-3.0.x` Prisma binary target, so no extra config is needed.

Then check:

```bash
curl https://<your-domain>/api/health          # {"status":"ok","database":"up",…}
```

### A4. Custom domain (optional)

Settings → Domains → add it, follow the DNS instructions, then **update
`NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the custom domain and redeploy**.
Leaving them on the `*.vercel.app` URL causes login redirect loops.

### A5. CLI alternative

```bash
npm i -g vercel
vercel link
vercel env add NEXTAUTH_SECRET production   # repeat per variable, or use the dashboard
vercel --prod
```

---

## Track B — Render

`render.yaml` is committed, so the Blueprint flow is a few clicks.

### B1. Blueprint (fastest)

1. <https://dashboard.render.com/blueprints> → **New Blueprint Instance** →
   connect the repo → it reads `render.yaml`.
2. Render prompts for the `sync: false` values. Have ready:
   `DATABASE_URL`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`,
   `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
   Set `NEXTAUTH_URL` to `https://<service-name>.onrender.com` — exact name is
   shown after creation; you can edit and redeploy.
   `NEXTAUTH_SECRET` is generated automatically.
3. **Apply** → first build (~3–5 min) → the service goes live.
4. Verify: `curl https://<service>.onrender.com/api/health`

### B2. Manual web service (no Blueprint)

1. **New → Web Service** → connect the repo.
2. Runtime **Node**, branch **main**, region **Frankfurt** (closest to Lagos).
3. Build command: `npm ci && npm run build`
4. Start command: `npm run start` (this honours Render's `$PORT`)
5. Health check path: `/api/health`
6. Add the same env vars as the Vercel table, plus
   `NODE_VERSION=20` and `SEED_DEMO_CLIENT=false`.
7. Create → wait for the live badge.

### B3. Migrations on Render

Run them from your machine against the production database (step 1) — safest and
works on every plan:

```bash
DATABASE_URL="…production…" npm run db:deploy
```

Alternatively add a **Pre-Deploy Command** of `npm run db:deploy` in the service
settings (paid instances) so every deploy migrates before the new instance
starts. Never run `prisma migrate dev` in production.

### Render notes

- **Free instances sleep** after 15 minutes idle; the next request takes
  ~30–50 s to wake. Upgrade to Starter for an always-on site.
- Render needs `NEXTAUTH_URL` to match the public URL exactly (trailing slash
  matters — no trailing slash).
- Push to `main` auto-deploys; zero-downtime rolling deploys keep the old
  instance serving until `/api/health` passes.

---

## Password-reset email (both platforms)

`/forgot-password` works with **no configuration at all** — the reset link is
printed in the server log:

```
✉️  EMAIL (console transport — no provider configured)
   To: coach@example.com
   Subject: Reset your Kings Body Empire password
   … http://localhost:3000/reset-password/<token>
```

For real users, pick one transport (no code change — just env vars):

**Resend (recommended)**

1. <https://resend.com> → API Keys → create one.
2. Verify your domain (or use the sandbox `onboarding@resend.dev` sender to test
   with your own address only).
3. Set `RESEND_API_KEY` and `EMAIL_FROM="Kings Body Empire <no-reply@your-domain.com>"`.

**SMTP (Gmail/Zoho/Mailtrap)**

Set `SMTP_URL`, e.g. `smtp://user:app-password@smtp.gmail.com:587`
(Gmail needs an app password with 2FA on) and `EMAIL_FROM`.

Check it after deploying: request a reset for your own account, confirm the mail
arrives, and watch the platform logs for `[mailer]` errors if it does not.

## Paystack (both platforms)

1. Paystack Dashboard → **Settings → API Keys & Webhooks**.
2. **Webhook URL:** `https://<your-domain>/api/paystack/webhook`
   (the handler verifies the `x-paystack-signature` HMAC — no extra config).
3. Callback URL: leave blank; the app sends `callback_url` per transaction.
4. Test with `sk_test_…` first — test card `4084 0840 8408 4081`, any future
   expiry, CVV `408`, PIN `0000`, OTP `123456`.
5. Only switch to live keys after a full test purchase on the production domain.

---

## Post-deploy checklist

- [ ] `GET /api/health` → `{"status":"ok","database":"up"}`
- [ ] `/` shows the hero photo, coach section, programs and e-book cards
      (empty cards = seed never ran)
- [ ] Sign up → log a workout → rank badge appears
- [ ] Log out → `/dashboard` redirects to `/login` and back after logging in
- [ ] **Forgot password**: request a link, open it, set a new password, and get
      signed in — then confirm the same link no longer works
- [ ] Admin account can add a call slot; client can book and cancel it
- [ ] Paystack test purchase → `/checkout/success` → program shows on dashboard
- [ ] `/api/books/<slug>/download` blocked in a private window before buying
- [ ] Webhook delivers `200` (Paystack dashboard → Webhooks → event log)
- [ ] Change the seeded admin password; demo client not created
      (`SEED_DEMO_CLIENT=false`)
- [ ] Replace placeholder testimonials (`src/lib/content.ts`) and e-book
      `fileUrl`s with real assets

---

## Troubleshooting deploys

| Symptom | Cause | Fix |
| --- | --- | --- |
| Build fails: `PrismaClientInitializationError` / `@prisma/client did not initialize` | `prisma generate` did not run | Build command must be `npm run build` (it runs generate); keep `postinstall` in place |
| Build fails: `Environment variable not found: DATABASE_URL` | Missing at build time | Add `DATABASE_URL` to the platform's env vars |
| `/api/health` → `database: "down"`, "tables are missing" | Migrations never ran | `npm run db:deploy` against production |
| `/api/health` → "Supabase project not found" | Project paused or stale URL | Resume it; re-copy the connection string; run `npm run db:check` |
| `too many connections` under load | Direct connection from many functions | Use the pooler with `?pgbouncer=true&connection_limit=1` |
| Login appears to work then bounces to `/login` | `NEXTAUTH_URL` ≠ real URL, or secret changed | Set both `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the exact public URL and redeploy |
| `UntrustedHost` / redirect loop behind a domain | `NEXTAUTH_URL` still points at the preview URL | Fix the env var, redeploy |
| Images render unoptimized / warning about `sharp` on Render | `sharp` missing | Already fixed — `sharp` is a dependency now; make sure `npm ci` is used |
| First request after idle takes 40 s | Render free instance asleep | Expected; upgrade the plan |
| Payment returns to `/checkout/failure?reason=verify` | Amount mismatch or wrong keys | Check `PAYSTACK_SECRET_KEY` matches the mode (test vs live) |

Need more detail on the database side? `npm run db:check` diagnoses the URL and
connection, and the README has a troubleshooting table mapped to raw Postgres
error codes.
