# Kings Body Empire

Fitness coaching platform: daily training/food/measurement logging, a
Bronze→Diamond consistency rank, 1-on-1 call booking, paid coaching programs
and e-books (Paystack), plus an education video library.

Built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma +
PostgreSQL · NextAuth (credentials) · Paystack**.

---

## What is in here

| Area | Status |
| --- | --- |
| Landing page, programs (`/pricing`), e-books (`/books`) | ✅ |
| Signup / login / logout, session-protected routes | ✅ |
| Forgot / reset password (single-use hashed tokens, Resend or SMTP, console fallback) | ✅ |
| Workout, food and measurement logging (add, list, delete) | ✅ |
| Consistency rank engine (Bronze, Silver, Gold, Diamond) + streak | ✅ |
| Client dashboard with week grid, recent activity, purchases | ✅ |
| Call booking (admin publishes slots, client books with phone + note, cancel frees the slot, race-safe) | ✅ |
| Education library (admin adds YouTube/MP4 lessons, category filter, player) | ✅ |
| Paystack checkout: initialise → browser callback → webhook, idempotent "paid" marking | ✅ |
| Gated e-book downloads (file URL never appears in page HTML) | ✅ |
| Admin console (`/admin`) with revenue, purchases and calls | ✅ |
| Seed script (admin + demo client, programs, e-books, lessons, call slots) | ✅ |
| Tests (61 unit + flow tests), ESLint, `tsc --noEmit` | ✅ |

Payments are optional: with no Paystack keys the app runs fine and simply tells
buyers that checkout is not configured yet.

---

## 1. Requirements

- **Node.js 18.17+** (Node 20 LTS recommended) and npm
- **PostgreSQL 14+** — either local Docker, or a free hosted database
  (Supabase / Neon / Railway all work)

## 2. Install

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # then edit .env
```

Generate a session secret and paste it into `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
# no openssl? use:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 3. Point `DATABASE_URL` at a database

**Option A — Docker (nothing to install besides Docker):**

```bash
docker compose up -d
```

and use the URL already in `.env.example`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kings_body_empire?schema=public"
```

**Option B — Supabase / Neon (no local install):**

1. Create a project, then open **Project Settings → Database → Connection
   string** and copy the **URI** (the direct one — host `db.<project-ref>.supabase.co`,
   port `5432`). Prisma Migrate cannot use the transaction pooler on port 6543.
2. Paste it into `DATABASE_URL`, keeping the exact project ref and region the
   dashboard shows, e.g.

   ```
   DATABASE_URL="postgresql://postgres:<your-db-password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
   ```

   The reference ID itself is under **Project Settings → General**. If the ref
   in your username, the region in the host, or the project's actual region
   disagree, Supabase's pooler answers with
   `tenant/user postgres.<ref> not found` — see Troubleshooting below.

> Using the Supabase **pooler** at runtime on Vercel? Append
> `&pgbouncer=true&connection_limit=1` and keep the direct URL for migrations.

**Option C — inside a GitHub Codespace (no external database):**

```bash
# Either Docker (available in standard Codespaces):
docker compose up -d

# …or a plain local Postgres:
sudo apt-get update
sudo apt-get install -y postgresql
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE kings_body_empire;"
```

Then use the local URL from `.env.example`. Codespaces exposes the dev server on
a forwarded `https://<codespace-name>-3000.app.github.dev` URL, so set:

```bash
NEXTAUTH_URL="https://<codespace-name>-3000.app.github.dev"
NEXT_PUBLIC_SITE_URL="https://<codespace-name>-3000.app.github.dev"
```

and make port **3000** public in the Ports tab (right-click → Port
Visibility → Public) if you want to open it on your phone. If you stay on
`http://localhost:3000` in the built-in browser preview, the localhost values
work as-is.

**Check the connection before anything else:**

```bash
npm run db:check
```

It prints the host/user/database with the password masked, flags placeholder
values, pooler pitfalls and missing `sslmode`, then tries a real connection and
says whether the schema exists.

## 4. Create the tables and seed

**On a hosted database (Supabase / Neon / Railway) — this is the one to use:**

```bash
npm run db:setup      # = prisma migrate deploy && prisma db seed
```

`db:deploy` applies the migrations that are already committed and does **not**
need a shadow database, which is why it works on Supabase. Seeding only works
after the tables exist, so the order matters: migrate → seed.

**Locally with Docker/Postgres**, the equivalent is:

```bash
npm run db:deploy     # or `npm run db:migrate` while developing
npm run db:seed
```

### Which database command do I want?

| Command | Under the hood | Use it when |
| --- | --- | --- |
| `npm run db:setup` | `migrate deploy` + `seed` | First run on any empty database |
| `npm run db:deploy` | `prisma migrate deploy` | Applying committed migrations anywhere (hosted, CI, production) |
| `npm run db:seed` | `prisma db seed` | Accounts/catalogue are missing; safe to re-run (upserts) |
| `npm run db:migrate` | `prisma migrate dev` | **Development only**, after you edit `prisma/schema.prisma`. Creates a shadow database, so the user needs `CREATEDB` (local Docker: yes, Supabase: usually no) |
| `npm run db:push` | `prisma db push` | Throwaway prototyping — bypasses migration history |
| `npm run db:reset` | `migrate reset --force` | Local only: drop everything, re-migrate, re-seed |
| `npm run db:check` | connection + schema diagnosis | The database is unreachable or behaves oddly |
| `npm run doctor` | auth/env + deploy doctor | **Sign-in works locally but not on the deployed site** — see below |
| `npm run doctor -- <url>` | fetches `<url>/api/health` | Checking what is really wrong with a deployment |

If anything fails, the seed prints a diagnosis instead of a raw Prisma stack
trace — the same information `npm run db:check` gives you.

## 5. Run it

```bash
npm run dev
```

Open <http://localhost:3000>.

Seeded accounts (change these before deploying):

| Role | Email | Password |
| --- | --- | --- |
| Admin / coach | `admin@kingsbodyempire.com` | `ChangeMe123!` |
| Demo client | `client@kingsbodyempire.com` | `ClientPass123!` |

---

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_SECRET` | ✅ | Signs session JWTs. Any long random string |
| `NEXTAUTH_URL` | ✅ (prod) | Public app URL, e.g. `https://kingsbodyempire.com` — no trailing slash, no path. On Render/Vercel a missing value is inferred from `RENDER_EXTERNAL_URL` / `VERCEL_URL` |
| `NEXT_PUBLIC_SITE_URL` | recommended | Used for absolute links, metadata and Paystack callbacks |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | seed | The admin account `npm run db:seed` creates |
| `SEED_DEMO_CLIENT` | optional | `false` skips the demo client account |
| `PAYSTACK_SECRET_KEY` | optional | Turns Paystack checkout on. `sk_test_…` for testing. Also used to create plans and cancel subscriptions |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | optional | Only needed if you later switch to Paystack Inline JS |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | optional | Shown in the footer |
| `NEXT_PUBLIC_WHATSAPP_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` | optional | Footer links; leave blank to hide |
| `NEXT_PUBLIC_TIMEZONE` | optional | Timezone used for streaks/ranks (default `Africa/Lagos`) |
| `CLOUDINARY_URL` | optional | Where you host e-book PDFs / thumbnails (nothing reads it yet) |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (`next lint`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:check` | Diagnose `DATABASE_URL` (redacted) and test the connection |
| `npm run db:setup` | `db:deploy` + `db:seed` in one go (fresh database) |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply existing migrations (production/CI) |
| `npm run db:push` | Push the schema without migration files (quick prototyping) |
| `npm run db:seed` | Seed admin, demo client and catalogue |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npm run db:studio` | Prisma Studio at http://localhost:5555 |

---

## Project structure

```
prisma/
  schema.prisma              data model (User, logs, Package, Book, purchases, calls…)
  migrations/                SQL migrations applied by db:migrate / db:deploy
  seed.ts                    starter catalogue + accounts
src/
  app/
    (marketing)/             public site: /, /pricing, /books, /checkout
    (auth)/                  /login, /signup
    (dashboard)/             signed-in app: /dashboard, /workouts, /food,
                             /measurements, /education, /book-call, /admin
    api/                     route handlers (auth, logs, rank, calls, paystack…)
      health/                GET /api/health — deploy/database health check
  components/                shared UI (site header/footer, dashboard nav, buy button…)
  lib/
    auth.ts                  NextAuth options (JWT sessions, role + rank in token)
    api.ts                   session helpers + JSON error responses
    prisma.ts                single PrismaClient instance
    rank-core.ts             pure rank/streak math (unit tested)
    rank.ts                  rank reads/writes against the database
    paystack.ts              Paystack API client (initialise + verify)
    paystack-signature.ts    webhook HMAC verification (unit tested)
    purchases.ts             purchase lookup / idempotent "mark paid"
    content.ts               marketing copy and categories
tests/                       Vitest unit tests
docs/TESTING.md              manual QA checklist
docs/DEPLOYMENT.md           Vercel + Paystack go-live guide
```

## Password reset

1. `/forgot-password` → `POST /api/auth/forgot-password`. The API always answers
   "If an account exists…" so it cannot be used to discover which emails are
   registered.
2. A 256-bit token is generated; only its **SHA-256 hash** is stored
   (`PasswordResetToken`), with a 1-hour expiry. Any older unused link for that
   account is deleted, so only the newest link works.
3. The email contains `/reset-password/<token>`. That page posts the token plus
   the new password, which must be 8+ characters with a letter and a number.
4. On success the token is marked used (single use), all other tokens for the
   account are removed, the password is re-hashed with bcrypt, and the user is
   signed in automatically.

Rate limits: 5 reset requests per IP per 15 min, 2-minute cooldown per account,
10 token submissions per IP per 15 min. These live in memory per instance — fine
for a small deployment; swap `src/lib/rate-limit.ts` for Upstash/Vercel KV if you
need limits shared across serverless instances.

Email transport is chosen by env vars (no code change):

| Variables set | Transport |
| --- | --- |
| `RESEND_API_KEY` | Resend HTTP API |
| `SMTP_URL` | SMTP via nodemailer |
| neither | printed in the server console (great for local testing) |

Set `EMAIL_FROM` to an address your provider has verified.

## How the rank works

Each day you log at least one workout, meal or measurement counts as an active
day. The last **7 days** are counted (in `NEXT_PUBLIC_TIMEZONE`):

| Active days | Rank |
| --- | --- |
| 0–1 | Bronze |
| 2–3 | Silver |
| 4–5 | Gold |
| 6–7 | Diamond |

Stored on `User.rank` and recalculated after every log write, so the badge in
the header and the dashboard card always agree.

## Logging and the consistency rank

The three loggers are ordinary pages inside the dashboard, and every write goes
through the same loop:

```
/workouts · /food · /measurements
        │ POST /api/<kind>
        ▼
 prisma.<kind>Log.create({ userId })      ← always scoped to the signed-in client
        │
        ▼
 recalculateRank(userId)                  ← distinct active days in the last 7
        │  { rank, activeDays, streak, nextRank, daysToNextRank }
        ▼
 { log, rank }  →  "Saved. Silver — 2 of 7 active days. 2 more active days for Gold."
                →  announceRankChange(rank) → header badge + RankLive panel move now
                →  router.refresh() → server-rendered dashboard agrees too
```

Worth knowing:

- **The rank counts days, not entries.** Two workouts on Tuesday is one active
  day. `logConfirmation()` says this out loud so nobody thinks logging is broken.
- Thresholds: 2 active days → Silver, 4 → Gold, 6 → Diamond (else Bronze), all
  within the current 7-day window in `NEXT_PUBLIC_TIMEZONE`.
- Deleting the only entry for a day lowers the rank again — the DELETE handlers
  also return the recalculated rank.
- `RankLive` (`src/components/rank-live.tsx`) sits on all three log pages; the
  badge in `DashboardNav` listens to the same `kbe:rank-changed` event
  (`src/lib/rank-events.ts`), so the header never lags a page behind.
- Every landing-page toolkit card links at the real page (`FEATURES[].href` in
  `src/lib/content.ts`); signed out, the middleware bounces to login and brings
  the client straight back to that form.
- `npm run db:seed` gives the demo client five days of workouts, meals and
  weigh-ins (18 logs) so the rank, charts and dashboard are not empty on a fresh
  install. It is skipped when the client already has logs.

## How payments work

**Programs are monthly subscriptions, e-books are one-off.** Both start the same
way:

1. Client clicks **Subscribe** → `POST /api/paystack/initialize` creates a
   `PENDING` `PackagePurchase` (or `BookPurchase`) with a unique `paystackRef`.
   For a monthly program it first makes sure the program has a Paystack plan
   (`POST /plan`, stored on `Package.paystackPlanCode`), then initialises the
   transaction **with the plan code and no amount** — Paystack takes the amount
   and the monthly renewal from the plan.
2. Browser goes to Paystack, pays, and is redirected to
   `GET /api/paystack/callback?reference=…`. The server calls Paystack's
   `/transaction/verify/:reference`, checks the amount, marks the purchase
   `PAID`, and (for programs) pulls the new subscription from Paystack so
   checkout still completes before the webhook lands.
3. `POST /api/paystack/webhook` (signature-verified, idempotent) is the
   reliable backstop if the user closes the tab before the redirect.

Set the webhook URL in the Paystack dashboard to
`https://<your-domain>/api/paystack/webhook`. Locally, expose the dev server
with a tunnel (e.g. `ngrok http 3000`) and use that URL — without it the first
charge still works through the callback, but renewals and cancellations will
not reach your laptop.

## Subscriptions

| Piece | Where |
| --- | --- |
| Status rules (access, grace, labels) | `src/lib/subscription-core.ts` — pure, unit tested |
| Paystack calls (plan, list, disable, enable) | `src/lib/paystack.ts` |
| DB + webhook handling | `src/lib/subscriptions.ts` |
| Webhook entry point | `src/app/api/paystack/webhook/route.ts` |
| Cancel / reactivate API | `PATCH /api/subscriptions` |
| Dashboard card | `src/components/subscription-card.tsx` |

Access rule (`hasActiveProgramAccess`): `ACTIVE`, `NON_RENEWING` and `CANCELLED`
grant access until `currentPeriodEnd`; `PAST_DUE` adds a **3-day grace window**
(`GRACE_DAYS`) while Paystack retries the card; `COMPLETE` grants nothing.
Cancelling stops the next charge but never takes back time already paid for.

Events handled (log in Paystack → Webhooks to replay a missed one):

| Event | Effect locally |
| --- | --- |
| `charge.success` | marks the matching purchase `PAID` |
| `subscription.create` | writes `Subscription` (code, email token, next payment date) |
| `subscription.not_renew` / `.disable` | `NON_RENEWING` / `CANCELLED` — access kept to period end |
| `subscription.enable` | back to `ACTIVE` |
| `invoice.create` | opens a `PENDING` `Invoice` |
| `invoice.update` | `PAID`, extends `currentPeriodEnd` |
| `invoice.payment_failed` | `PAST_DUE` + 3-day grace |

`Invoice.invoiceCode` is unique, so a replayed webhook cannot extend access twice.

**Changing a program price creates a new Paystack plan** the next time someone
subscribes; existing subscribers stay on the plan (and price) they signed up to.
That is deliberate — the admin console shows MRR from active subscriptions, and
the Subscriptions table shows what each client is actually being charged.

## Changing program prices

Prices are stored in **kobo** (₦20,000 = `2_000_000`) because that is what Paystack
charges in. The **database is the source of truth**: `/pricing`, the Buy button and
the Paystack amount all read `Package.priceKobo`.

There are three places to know about:

| File | What it controls |
| --- | --- |
| `prisma/seed.ts` → `PACKAGES[].priceKobo` | The catalogue written by `npm run db:seed` |
| `src/lib/content.ts` → `FEATURED_PROGRAMS[].priceKobo` | The three teaser cards on the landing page (static, no DB) |
| Database rows in `Package` | What customers actually pay |

To change a price:

1. Edit the amount in `prisma/seed.ts` **and** `src/lib/content.ts` (keep them equal).
2. Apply it to the database — either:
   - `npm run db:seed` (idempotent upsert; also refreshes titles, descriptions and
     `contents` from the seed file), **or**
   - `npm run db:studio` → `Package` → edit `priceKobo` if you only want to touch
     prices and leave hand-edited copy alone. Remember the kobo conversion:
     ₦20,000 → `2000000`.
3. Redeploy (or restart `npm run dev`) so the landing-page teaser picks up the new
   numbers.

The dashboard's "Programs from …" line is read from the cheapest active package in
the database, so it never needs editing. Want to sell a program without showing it?
Set `Package.isActive = false` in Studio — it disappears from `/pricing` and
checkout, but existing purchases stay valid.

## Progress charts

`/progress` (linked from the dashboard nav) draws weight, weekly training
volume, daily calories and a consistency heatmap from logs the client already
keeps. There is no chart library: `src/components/progress-charts.tsx` renders
inline SVG on the server, so the page needs no client JavaScript and stays light
on mobile data.

| Piece | Where |
| --- | --- |
| Aggregation (pure, unit tested) | `src/lib/progress-core.ts` |
| Database + payload | `src/lib/progress.ts` |
| JSON API | `GET /api/progress?range=30\|90` |
| Page | `src/app/(dashboard)/progress/page.tsx` |

Rules worth knowing:

- Days are grouped in `NEXT_PUBLIC_TIMEZONE` (`Africa/Lagos`), so a 10pm
  session counts as today.
- Weight keeps **one point per day** (the last reading wins) so seven weigh-ins
  on one day do not look like seven days of progress.
- Training volume is `sets × reps × load`; bodyweight sets count as
  `sets × reps` so press-ups are not invisible.
- The calorie average uses logged days only — a day you forgot to log does not
  pretend you ate nothing.
- The `activity` array is one cell per day in the range, which is exactly what
  the heatmap draws.

## Referrals

Every client gets a code (created the first time they open the dashboard) and a
share link: `https://<site>/?ref=CODE`.

1. The middleware stores the code in a 30-day `kbe_ref` cookie when someone
   lands with `?ref=…`, so browsing first and signing up tomorrow still counts.
2. Signup reads the cookie (or a `referralCode` field in the body) and creates a
   `PENDING` `Referral`. Unknown codes, self-referrals and repeat referees are
   ignored — `Referral.refereeId` is unique.
3. The referral **qualifies on the invited client's first paid program**
   (`markPurchasePaid`, which both the callback and webhook call).
4. Both sides get **7 days** (`REFERRAL_REWARD_DAYS`): a live subscription has
   `currentPeriodEnd` pushed out; a referrer with no plan has the days banked in
   `User.referralBonusDays` and applied to their next subscription automatically
   (`saveSubscription`).
5. The referrer gets a "7 free days" email (`src/lib/mailer.ts` →
   `referralRewardEmail`; console transport when no provider is configured).

| Piece | Where |
| --- | --- |
| Code rules, links, stats (pure, unit tested) | `src/lib/referrals-core.ts` |
| DB, qualification, rewards, overview | `src/lib/referrals.ts` |
| Capture `?ref=` in a cookie | `src/middleware.ts` |
| API | `GET /api/referrals` |
| Dashboard card | `src/components/referral-card.tsx` |

Seeded codes for testing: `COACHKBE` (admin) and `DEMOKBE7` (demo client).
Attribution is one level deep — no chains, no cash payouts, so nothing to
reconcile at the end of the month.

## Testing

See **[docs/TESTING.md](docs/TESTING.md)** for a click-through checklist that
covers every feature (including the no-Paystack-keys path).

Quick automated checks:

```bash
npm test            # 61 unit + flow tests
npm run typecheck
npm run lint
npm run build
```

## Deploying

Full walkthrough (both platforms, env vars, migrations, Paystack webhook,
troubleshooting): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Short version — either works:

**Vercel**

1. Run the migrations against production from your machine:
   `DATABASE_URL="<prod url>" npm run db:deploy` (then `db:seed` if you want the catalogue).
2. Import the repo at <https://vercel.com/new> (framework auto-detects).
3. Add env vars: `DATABASE_URL` (pooler + `?pgbouncer=true&connection_limit=1`),
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, Paystack keys.
4. Deploy, then open `/api/health` — expect `{"status":"ok","database":"up"}`.

**Render**

1. Same migration step against production.
2. <https://dashboard.render.com/blueprints> → New Blueprint → pick this repo;
   `render.yaml` creates the service. Fill in the prompted env vars
   (set `NEXTAUTH_URL` to `https://<service>.onrender.com`).
3. Health check path is already `/api/health`; free instances sleep when idle.

Set the Paystack webhook to `https://<your-domain>/api/paystack/webhook` on both.
`npm start` honours `$PORT`, so Render/Heroku-style hosts work out of the box.

## Images and branding

Two photographs live in `public/images/`:

| File | Where it is used |
| --- | --- |
| `hero-gym.jpg` (1376×768) | Landing-page hero background + social share preview (Open Graph/Twitter) |
| `coaching.jpg` (768×1376, portrait) | "Coaching that knows your name" section on the landing page |
| `community.jpg` (1600×1067) | "Beginners. Returners. Lifters. Fighters." band on the landing page |
| `auth-bg.jpg` (1280×1920) | Background for `/login`, `/signup`, `/forgot-password`, `/reset-password/*` |

The hero and coaching shots are AI-generated for this project; the community and
auth photos are Pexels photographs, resized to web weight with EXIF stripped. If
you keep the Pexels images, credit is not required by the licence but is decent
practice — and do not reuse images of identifiable people in a way that implies
they endorse the brand.

To swap in real photos of your own clients or gym:

1. Drop the new file into `public/images/` (keep the same filename, or update the
   `src` in `src/app/(marketing)/page.tsx`).
2. Aim for a **dark, warm-lit frame** — the hero is layered under gold gradients,
   so bright white shots wash out the headline.
3. Hero: landscape, at least 1600px wide. Coach photo: portrait, at least 800px
   wide. Keep each file under ~300 KB (JPEG quality 80 is plenty).
4. Update the `alt` text to describe the new photo — it is read by screen readers
   and helps SEO.
5. If you change the hero image, also update `images[0].url` in
   `src/app/layout.tsx` so link previews on WhatsApp/X still look right.

Next.js optimises both automatically (`/_next/image?...`): the browser gets a
resized WebP/JPEG per screen size, so you do not need multiple sizes yourself.

> Using real clients in photos? Get written permission before publishing, and
> avoid showing anyone's face in a "before" photo without consent.

## Troubleshooting the database

Start with `npm run db:check` — it explains the exact failure and the fix.
The common ones:

| Error you see | What it means | Fix |
| --- | --- | --- |
| `FATAL: (ENOTFOUND) tenant/user postgres.<ref> not found` | Supabase's **pooler** does not know that project ref: wrong region host, wrong/old connection string, or the project is paused/deleted | Re-copy the URI from Supabase → Project Settings → Database. Resume the project if paused. Or use the direct host `db.<ref>.supabase.co:5432` |
| `P1001` / `getaddrinfo ENOTFOUND` | Hostname in `DATABASE_URL` is wrong | Re-copy the connection string |
| `ECONNREFUSED 127.0.0.1:5432` | No local Postgres running | `docker compose up -d` or start the Postgres service |
| `28P01 password authentication failed` | Bad password / unencoded characters | Re-copy it; encode `@ # / :` as `%40 %23 %2F %3A` |
| `P1003` / `database "…" does not exist` | Wrong database name | Supabase/Neon use `postgres`; locally `createdb kings_body_empire` |
| `P1000` / timeout / `ETIMEDOUT` | Credentials rejected or IP not allowed | Supabase → Database → Network Restrictions; check the project is not paused |
| `table "User" does not exist` / `P2021` | Database reachable but migrations not applied | `npm run db:migrate` (dev) or `npm run db:deploy` |
| `tenant/user not found` only in Codespaces | Codespace URL/credentials not set | See "Option C — inside a GitHub Codespace" above |
| `self-signed certificate` | TLS mismatch | Append `?sslmode=require` (or `?sslmode=no-verify` locally) |

Two things to know about Supabase URLs:

- **Transaction pooler** (port `6543`) is fine for the running app but Prisma
  Migrate needs the **direct** connection (port `5432`).
- `prisma migrate dev` also creates a *shadow database*; if your provider does
  not allow `CREATE DATABASE`, run `npm run db:push` once, or set
  `shadowDatabaseUrl` in `prisma/schema.prisma`.

## "Login works locally but not on the deployed site"

Local and deployed runs read **different environment variables** — that is almost
always the whole difference. Two commands tell you which one is wrong:

```bash
npm run doctor                            # local .env, judged as if deployed
npm run doctor -- https://your-site.com   # the deployment itself
```

`npm run doctor -- <url>` prints a verdict for the three things that break
sign-in, all served by the public `/api/health` endpoint:
database reachable, schema matching the code, and auth configured for that host.
Exit code is 1 when something is blocking, so it can gate a deploy.

| What the doctor says | Cause | Fix |
| --- | --- | --- |
| `NEXTAUTH_SECRET is missing` | No secret on the host (locally NextAuth tolerates it, in production it refuses) | `openssl rand -base64 32` → add `NEXTAUTH_SECRET` in Vercel/Render → **redeploy** |
| `NEXTAUTH_SECRET is still the example value` | `.env.example` copy-pasted | Same as above |
| `NEXTAUTH_URL points at localhost` | Copied `.env` to the host | Set it to the public URL, `https://`, no trailing slash |
| `NEXTAUTH_URL is X but this request arrived on Y` | Custom domain added without updating env | Match `NEXTAUTH_URL` to the domain users actually visit |
| `migrations missing on this database` | Production DB was never migrated | `DATABASE_URL="<prod url>" npm run db:deploy` |
| `database unreachable (paused-project)` | Supabase free project asleep | Resume it in the dashboard |
| Everything is green but login still fails | The account does not exist **on that database** | Sign up again on the deployed site, or seed it there |

Two behaviours worth knowing:

- **The login page no longer blames your password for server problems.** Only
  NextAuth's `CredentialsSignin` shows "That email or password is not right.";
  a missing secret or unreachable database now says so
  (`src/lib/auth-errors.ts`).
- **Signup returns 503 with a reason** instead of a generic 500 when the
  database is unreachable, paused or behind on migrations
  (`classifyDatabaseError` in `src/lib/health.ts`).

`/api/health` reports `status`, `database`, `schema`, and an `auth` block with
the issues and fixes — never a secret value. Add `?strict=1` to get a 503 while
degraded (useful as a real platform health check).

## Known limitations / next steps

- No password reset or email verification yet (NextAuth credentials only).
- No image/file upload — e-books are URLs (Cloudinary or any host), lessons are
  YouTube or direct video links.
- No automated E2E tests (Playwright would be the next addition).
- Rate limiting is not implemented on the auth endpoints; add it (Vercel
  Firewall, Upstash) before a public launch.
- The three sample testimonials in `src/lib/content.ts` are placeholders —
  replace them with real, permissioned quotes.
