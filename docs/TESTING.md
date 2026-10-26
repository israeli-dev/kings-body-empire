# Manual test checklist

Work through this list after `npm run db:migrate && npm run db:seed && npm run dev`.
Everything below runs without Paystack keys except step 7.

## 1. Public site

- [ ] `/` loads: hero, features, programs, how it works, testimonials, FAQ, footer.
- [ ] Nav links work on mobile (Menu button) and desktop.
- [ ] `/pricing` lists the three seeded programs with naira prices and contents.
- [ ] `/books` lists three e-books; each **Details** link opens `/books/<slug>`.
- [ ] `/checkout/success` and `/checkout/failure` render something sensible.
- [ ] A made-up URL (e.g. `/nope`) shows the 404 page.

## 2. Auth

- [ ] `/dashboard` while logged out redirects to
      `/login?callbackUrl=%2Fdashboard`.
- [ ] Log in as `admin@kingsbodyempire.com / ChangeMe123!` → lands on `/dashboard`.
- [ ] Log out (top-right) → returns to `/`, and `/dashboard` is protected again.
- [ ] `/signup` with a new email → account created and signed in automatically.
- [ ] `/signup` with the same email again → "An account with that email already exists."
- [ ] `/signup` with password `short` → client-side error; a 7-char password sent
      straight to the API returns a 400.
- [ ] Log in with a wrong password → "That email or password is not right."

## 3. Logging (as the demo client)

- [ ] `/workouts`: log "Bench press, 4 sets, 8 reps, 70kg" → appears in Recent
      sessions and the success message shows.
- [ ] `/workouts`: submit sets = 0 → validation error from the API stays visible.
- [ ] Delete a workout → row disappears; the rank (header badge) recalculates.
- [ ] `/food`: log a meal with calories → shows "kcal today" for today's meals.
- [ ] `/measurements`: save weight + waist only → the other fields stay empty
      (null), and the "latest" cards show just what you filled in.
- [ ] Save a second measurement with a different weight → delta shows vs previous.

## 4. Rank

- [ ] `/dashboard` shows the 7-day grid, active days and the progress bar.
- [ ] Log one entry → badge stays **Bronze** (1 active day).
- [ ] Log on a second distinct day (or temporarily insert rows with
      `npm run db:studio` and different `loggedAt` dates) → **Silver**.
- [ ] `GET /api/rank` while signed in returns `rank`, `activeDays`, `streak`,
      `nextRank`, `daysToNextRank`.

## 5. Call booking

- [ ] As **admin**, `/book-call` shows the "Add availability" form; add a slot a
      few days ahead → it appears under Available times.
- [ ] Attempt to add a slot whose end time is before the start → 400 error text.
- [ ] As **client**, `/book-call` shows your phone/notes fields; press **Book**
      with no phone → "Add your phone number first…".
- [ ] Enter a phone, press **Book** → "Call booked…" and the slot disappears from
      the available list.
- [ ] As admin, `/book-call` now lists the booking with client name, email,
      phone and note.
- [ ] As client, press **Cancel** on the booking → the slot reappears.
- [ ] As client, `/admin` redirects to `/dashboard` (client is not an admin).

## 6. Education library

- [ ] As admin, add a lesson with a YouTube link → card appears with the
      YouTube thumbnail; click it → player opens inline.
- [ ] Add a lesson with a non-http link → "Video link must start with http…".
- [ ] Filter by category → grid narrows; "All" restores it.
- [ ] Delete a lesson → card disappears (admin only; clients see no delete button).

## 7. Payments (needs Paystack **test** keys in `.env`)

Without keys:

- [ ] `/pricing` shows the "Payments are not configured" notice.
- [ ] Pressing **Buy** shows that message as an error and nothing is charged.

With keys (`sk_test_…`):

- [ ] **Buy** on a program → redirected to Paystack checkout, amount equals the
      price (Paystack shows it in naira).
- [ ] Pay with a Paystack test card (`4084 0840 8408 4081`, any future expiry,
      CVV `408`, PIN `0000`, OTP `123456`).
- [ ] Redirected to `/checkout/success`; the program appears on `/dashboard`
      under "Your programs" and in `/admin` with status **PAID**.
- [ ] `/books/<slug>` after buying → **Download the PDF** works; the underlying
      file URL only appears through `/api/books/<slug>/download`.
- [ ] Open `/api/books/<slug>/download` in a private window while logged out →
      redirected to `/login`; logged in without buying → back to the book page
      with "That download is for buyers only."
- [ ] Abandon a checkout (close the Paystack tab) → purchase stays `PENDING`
      in `/admin`; nothing is unlocked.
- [ ] Webhook: `curl -X POST http://localhost:3000/api/paystack/webhook -H
      'Content-Type: application/json' -H 'x-paystack-signature: bogus' -d '{}'`
      → `401 {"error":"Invalid signature"}`.
- [ ] Duplicate webhook deliveries for the same reference do not create a
      second purchase or double-unlock (idempotent).

## 8. Production build

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm start   # then re-check a few pages at http://localhost:3000
```

- [ ] `npm run build` completes without type errors.
- [ ] `npm test` shows 43 passing tests.
