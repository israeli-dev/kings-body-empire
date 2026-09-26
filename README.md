# Kings Body Empire

Fitness coaching platform: workout/food/measurement logging, consistency
ranking, call booking, paid coaching packages, e-book sales, and an
education video library.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in real values (Postgres URL from
   Supabase, Paystack keys, Cloudinary URL, a NextAuth secret).
3. `npx prisma migrate dev --name init` — creates every table in your
   database from `prisma/schema.prisma`.
4. `npm run dev` — app runs at http://localhost:3000

## Folder structure

- `prisma/schema.prisma` — all data models (User, WorkoutLog, FoodLog,
  MeasurementLog, Package, PackagePurchase, Book, BookPurchase,
  EducationContent, CoachAvailability, CallBooking)
- `src/app/` — Next.js App Router pages
  - `(auth)/login`, `(auth)/signup` — client login/signup
  - `(dashboard)/workouts`, `/food`, `/measurements` — the three logging
    features, one folder each
  - `api/` — server routes the dashboard pages call into
- `src/lib/prisma.ts` — shared Prisma client instance

## Build order

Follow the 10-step order from planning: scaffold → git init/push → schema
→ auth → the three logging features (one commit each) → consistency
ranking job → call booking → packages + Paystack checkout → e-book
purchases → education library → deploy on Vercel.

## Git

```
git init
git add .
git commit -m "Initial Next.js scaffold"
# create the repo on GitHub first, then:
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

Commit after each working feature, push at the end of each session, and
switch to feature branches + PRs once auth and payments are live.
