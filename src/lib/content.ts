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

export const TESTIMONIALS = [
  {
    quote:
      "Twelve weeks of logging, twelve weeks of showing up. Down 11kg and I finally understand what I am eating.",
    name: "Ahmed O.",
    detail: "Transformation program",
  },
  {
    quote:
      "The consistency rank sounds small until you are one day away from Diamond. It kept me training on the days I wanted to skip.",
    name: "Chinaza U.",
    detail: "Elite 1-on-1",
  },
  {
    quote:
      "Coach mapped my meals around Nigerian food instead of some imported plan I could never keep. That is why it worked.",
    name: "Tunde A.",
    detail: "Foundation program",
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
 * pay) lives in the database. Keep these three prices in step with
 * `PACKAGES` in prisma/seed.ts — /pricing and checkout always read the database.
 */
export const FEATURED_PROGRAMS = [
  {
    slug: "foundation",
    title: "Foundation",
    durationWeeks: 4,
    priceKobo: 2_000_000,
    description:
      "Four weeks to build the habit: training plan, food template and weekly check-ins.",
  },
  {
    slug: "transformation",
    title: "Transformation",
    durationWeeks: 12,
    priceKobo: 2_500_000,
    description:
      "The full programme. Progressive training blocks, meal planning and rank coaching.",
  },
  {
    slug: "elite-1-on-1",
    title: "Elite 1-on-1",
    durationWeeks: 8,
    priceKobo: 3_000_000,
    description:
      "Direct access to the coach: fortnightly calls, form reviews and a plan built around you.",
  },
] as const;
