/** Static marketing copy. Edit freely — nothing here touches the database. */

export const EDUCATION_CATEGORIES = [
  "Diet",
  "Workout",
  "Fat Loss",
  "Bulking",
  "Rest",
] as const;

export type EducationCategory = (typeof EDUCATION_CATEGORIES)[number];

/**
 * The toolkit cards. `href` points at the page that actually does the thing, so
 * every card on the landing page is a working link — signed out it routes to
 * login and comes straight back to the form.
 */
export const FEATURES = [
  {
    title: "Workout log",
    body: "Log every lift — exercise, sets, reps and load. Your training history stays in one place.",
    icon: "🏋️",
    href: "/workouts",
    cta: "Log a workout",
  },
  {
    title: "Food log",
    body: "Track what you eat and the calories behind it. Honest data beats guesswork.",
    icon: "🥗",
    href: "/food",
    cta: "Log a meal",
  },
  {
    title: "Body measurements",
    body: "Weight, waist, chest, shoulders, arms. Watch the tape move week by week.",
    icon: "📏",
    href: "/measurements",
    cta: "Add measurements",
  },
  {
    title: "Consistency rank",
    body: "Bronze to Diamond. Show up on 6 of 7 days and the rank takes care of itself.",
    icon: "👑",
    href: "/progress",
    cta: "See your rank",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    body: "Free to start. No card needed — just your name, email and a password.",
  },
  {
    step: "02",
    title: "Log training and food",
    body: "Thirty seconds a day. The dashboard shows your streak, rank and trends.",
  },
  {
    step: "03",
    title: "Get coached",
    body: "Book a call, pick a program or grab an e-book when you are ready to go deeper.",
  },
] as const;

export const FAQ = [
  {
    q: "Do I need a gym?",
    a: "No. Every program includes a home option with bodyweight and band progressions. If you have a gym, use the barbell version of the same plan.",
  },
  {
    q: "How is the rank calculated?",
    a: "We count the distinct days you logged a workout, meal or measurement in the last seven. Two days is Silver, four is Gold, six is Diamond.",
  },
  {
    q: "What happens after I pay?",
    a: "Paystack charges you in naira and we unlock the program or e-book on your account immediately. Programs are billed monthly and renew through Paystack until you cancel — your coach reaches out within 24 hours after the first payment.",
  },
  {
    q: "Can I cancel a program?",
    a: "Yes. Open the dashboard and press Cancel subscription. Billing stops at once and you keep access until the end of the month you already paid for — nothing is taken back.",
  },
  {
    q: "Do referrals really give free days?",
    a: "Yes. Share your code from the dashboard. When a friend signs up with it and starts a program, you both get 7 extra days, applied automatically.",
  },
  {
    q: "Can I cancel a booked call?",
    a: "Yes — cancel from the Book a Call page and the slot is released for someone else.",
  },
] as const;

/**
 * Shown on the landing page; the real catalogue (and the price people actually
 * pay) lives in the database. Keep these prices in step with `PACKAGES` in
 * prisma/seed.ts — /pricing and checkout always read the database. Prices are
 * charged monthly via Paystack subscription at checkout.
 */
export const FEATURED_PROGRAMS = [
  {
    slug: "gain-10kg",
    title: "Gain 10kg in 12 Weeks",
    durationWeeks: 12,
    priceKobo: 5_000_000, // ₦50,000/month
    badge: "Most popular",
    description:
      "A 12-week mass-gain block: progressive overload, calorie-dense Nigerian meals and weekly weigh-ins until the 10kg is on.",
  },
  {
    slug: "lose-10kg-fat",
    title: "Lose 10kg of Fat in 16 Weeks",
    durationWeeks: 16,
    priceKobo: 5_000_000, // ₦50,000/month
    badge: null,
    description:
      "A 16-week fat-loss block: a calorie target built around your kitchen, high-satiety meals, conditioning and weekly check-ins.",
  },
  {
    slug: "massive-chest-home",
    title: "Build a Huge & Massive Chest at Home in 8 Weeks",
    durationWeeks: 8,
    priceKobo: 2_500_000, // ₦25,000/month
    badge: null,
    description:
      "Eight weeks of progressive push-up mastery — feet-elevated, archer, pseudo-planche — for a chest that fills any shirt, no gym needed.",
  },
  {
    slug: "premium-1-on-1",
    title: "Premium 1-on-1 Coaching (Video Call Available)",
    durationWeeks: 12,
    priceKobo: 15_000_000, // ₦150,000/month
    badge: "Premium",
    description:
      "Direct access to the coach: weekly video calls, a plan built around your body and schedule, unlimited check-ins and priority support.",
  },
  {
    slug: "hourglass-shape",
    title: "Build an Hourglass Shape",
    durationWeeks: 16,
    priceKobo: 5_000_000, // ₦50,000/month
    badge: null,
    description:
      "A 16-week shape-focused block: glute-and-waist training, waist-snatching nutrition and photos every four weeks to see the curve come in.",
  },
] as const;
