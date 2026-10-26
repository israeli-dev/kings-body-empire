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
| Workout, food and measurement logging (add, list, delete) | ✅ |
| Consistency rank engine (Bronze, Silver, Gold, Diamond) + streak | ✅ |
| Client dashboard with week grid, recent activity, purchases | ✅ |
| Call booking (admin publishes slots, client books with phone + note, cancel frees the slot, race-safe) | ✅ |
| Education library (admin adds YouTube/MP4 lessons, category filter, player) | ✅ |
| Paystack checkout: initialise → browser callback → webhook, idempotent "paid" marking | ✅ |
| Gated e-book downloads (file URL never appears in page HTML) | ✅ |
| Admin console (`/admin`) with revenue, purchases and calls | ✅ |
| Seed script (admin + demo client, programs, e-books, lessons, call slots) | ✅ |
| Tests (43 unit tests), ESLint, `tsc --noEmit` | ✅ |

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
| `NEXTAUTH_URL` | ✅ (prod) | Public app URL, e.g. `https://kingsbodyempire.com` |
| `NEXT_PUBLIC_SITE_URL` | recommended | Used for absolute links, metadata and Paystack callbacks |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | seed | The admin account `npm run db:seed` creates |
| `SEED_DEMO_CLIENT` | optional | `false` skips the demo client account |
| `PAYSTACK_SECRET_KEY` | optional | Turns Paystack checkout on. `sk_test_…` for testing |
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

## How payments work

1. Client clicks **Buy** → `POST /api/paystack/initialize` creates a `PENDING`
   purchase row with a unique `paystackRef` and returns Paystack's
   `authorization_url`.
2. Browser goes to Paystack, pays, and is redirected to
   `GET /api/paystack/callback?reference=…`. The server calls Paystack's
   `/transaction/verify/:reference`, checks the amount, and marks the purchase
   `PAID`.
3. `POST /api/paystack/webhook` (signature-verified, idempotent) is the
   reliable backstop if the user closes the tab before the redirect.

Set the webhook URL in the Paystack dashboard to
`https://<your-domain>/api/paystack/webhook`. Locally, expose the dev server
with a tunnel (e.g. `ngrok http 3000`) and use that URL.

## Testing

See **[docs/TESTING.md](docs/TESTING.md)** for a click-through checklist that
covers every feature (including the no-Paystack-keys path).

Quick automated checks:

```bash
npm test            # 43 unit tests
npm run typecheck
npm run lint
npm run build
```

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (Vercel + Supabase/Neon +
Paystack). Short version: set the env vars, run `npm run db:deploy` against the
production database, deploy.

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

## Known limitations / next steps

- No password reset or email verification yet (NextAuth credentials only).
- No image/file upload — e-books are URLs (Cloudinary or any host), lessons are
  YouTube or direct video links.
- No automated E2E tests (Playwright would be the next addition).
- Rate limiting is not implemented on the auth endpoints; add it (Vercel
  Firewall, Upstash) before a public launch.
- The three sample testimonials in `src/lib/content.ts` are placeholders —
  replace them with real, permissioned quotes.
