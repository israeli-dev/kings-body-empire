/**
 * Seeds the database with a coach/admin account, an optional demo client,
 * the starter program + e-book catalogue, sample lessons and call slots.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  diagnoseConnectionError,
  inspectDatabaseUrl,
  parseDatabaseUrl,
} from "../src/lib/db-diagnostics";
import { rankForActiveDays } from "../src/lib/rank-core";

const prisma = new PrismaClient();

const DEMO_CLIENT = {
  name: "Demo Client",
  email: "client@kingsbodyempire.com",
  password: "ClientPass123!",
};

// The catalogue shown everywhere in the app. Prices here are the ones Paystack
// actually charges (monthly, via Paystack Plans created on first checkout).
const PACKAGES = [
  {
    slug: "gain-10kg",
    title: "Gain 10kg in 12 Weeks",
    durationWeeks: 12,
    priceKobo: 5_000_000, // ₦50,000/month
    description:
      "Twelve weeks to put on 10 kilograms the Nigerian way — progressive training, calorie-dense local meals and weekly check-ins that keep you accountable.",
    contents: [
      "12-week progressive training block (gym or home)",
      "Custom calorie & protein targets from your stats",
      "Calorie-dense Nigerian bulk meals with portions",
      "Weekly check-in and rank review",
      "Priority WhatsApp support",
    ],
  },
  {
    slug: "lose-10kg-fat",
    title: "Lose 10kg of Fat in 16 Weeks",
    durationWeeks: 16,
    priceKobo: 5_000_000, // ₦50,000/month
    description:
      "Sixteen weeks to drop 10 kilograms of fat — a calorie target built around the food you already eat, conditioning that fits in your day and a weekly scale review.",
    contents: [
      "16-week fat-loss block (gym or home)",
      "Calorie target built around Nigerian meals",
      "High-satiety meal plans with portions",
      "3 strength days + 2 conditioning sessions weekly",
      "Weekly weigh-in and rank review",
    ],
  },
  {
    slug: "massive-chest-home",
    title: "Build a Huge & Massive Chest at Home in 8 Weeks",
    durationWeeks: 8,
    priceKobo: 2_500_000, // ₦25,000/month
    description:
      "Eight weeks of push-up progression — feet-elevated, archer, pseudo-planche — for a chest that fills any shirt, with zero equipment.",
    contents: [
      "8-week home chest block (zero equipment)",
      "Push-up progression: incline → archer → pseudo-planche",
      "Volume chart and rest-pyramid progression built in",
      "Upper- and lower-chest finisher circuits",
      "Form-check videos reviewed weekly",
    ],
  },
  {
    slug: "premium-1-on-1",
    title: "Premium 1-on-1 Coaching (Video Call Available)",
    durationWeeks: 12,
    priceKobo: 15_000_000, // ₦150,000/month
    description:
      "The full bespoke experience — a plan built around your body, your schedule and your kitchen, with weekly video calls and unlimited check-ins.",
    contents: [
      "Fully bespoke training programme",
      "Weekly 1-on-1 video calls",
      "Unlimited check-ins and form reviews",
      "Travel, event and holiday week plans",
      "Direct line to the coach, 7 days a week",
    ],
  },
  {
    slug: "hourglass-shape",
    title: "Build an Hourglass Shape",
    durationWeeks: 16,
    priceKobo: 5_000_000, // ₦50,000/month
    description:
      "Sixteen weeks to sculpt the hourglass — glute-and-waist training, waist-friendly nutrition and progress photos every four weeks so you watch the curve come in.",
    contents: [
      "16-week shape-focused training block",
      "Glute & waist sculpting (hip thrusts, oblique work, side planks)",
      "Waist-snatching nutrition: protein-first, fibre-rich",
      "Progress photos every 4 weeks, coached feedback",
      "Weekly check-in and rank review",
    ],
  },
];

/// Old starter programs — retired, not deleted, so historical subscriptions
/// and purchases still resolve.
const RETIRED_PACKAGE_SLUGS = ["foundation", "transformation", "elite-1-on-1"];

// The e-book catalogue. `fileUrl` is intentionally left out for now — the
// coach will paste the Cloudinary link from the admin page once each file is
// ready; until then the books list as "Coming soon" and cannot be bought.
const BOOKS = [
  {
    slug: "bulk-up-10kg-nigerian-way",
    title: "How to Bulk-Up by 10kg in 8 Weeks — the Nigerian Way",
    description:
      "The exact 8-week mass-gain system for Nigerian lifters: progressive training, calorie-dense local meals and a weekly weigh-in protocol that puts 10 clean kilograms on you.",
    priceKobo: 800_000, // ₦8,000
    coverUrl: "/images/books/bulk-up-nigerian.jpg",
  },
  {
    slug: "super-bulk-up-diet",
    title: "Super Bulk-Up Diet (Full Recipe Included)",
    description:
      "The complete bulk-up diet built around Nigerian kitchens — full recipes, calorie and protein counts per plate, and a two-week shopping list to go with it.",
    priceKobo: 200_000, // ₦2,000
    coverUrl: "/images/books/bulk-up-diet.jpg",
  },
  {
    slug: "the-ultimate-skin-regiment",
    title: "The Ultimate Skin Regiment",
    description:
      "A simple, effective daily skin routine — cleanse, treat, moisturise and protect — built for Nigerian skin and humidity, with a weekly shopping list.",
    priceKobo: 200_000, // ₦2,000
    coverUrl: "/images/books/skin-regiment.jpg",
  },
];

/// Old placeholder e-books — retired, not deleted, so purchase history stays valid.
const RETIRED_BOOK_SLUGS = ["the-kings-kitchen", "hypertrophy-blueprint", "cut-without-crashing"];

const LESSONS = [
  {
    title: "Sample lesson — How to set your daily calories",
    category: "Diet",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Sample lesson — Building your first 4-day split",
    category: "Workout",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Sample lesson — Why fat loss stalls in week 5",
    category: "Fat Loss",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Sample lesson — Eating enough to grow",
    category: "Bulking",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
  {
    title: "Sample lesson — Sleep, the cheapest supplement",
    category: "Rest",
    videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
  },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@kingsbodyempire.com")
    .trim()
    .toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const adminName = process.env.ADMIN_NAME || "Coach King";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", name: adminName, referralCode: "COACHKBE" },
    create: {
      email: adminEmail,
      name: adminName,
      role: "ADMIN",
      referralCode: "COACHKBE",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`✓ admin ready: ${admin.email}`);

  if (process.env.SEED_DEMO_CLIENT !== "false") {
    const demo = await prisma.user.upsert({
      where: { email: DEMO_CLIENT.email },
      update: { referralCode: "DEMOKBE7" },
      create: {
        name: DEMO_CLIENT.name,
        email: DEMO_CLIENT.email,
        referralCode: "DEMOKBE7",
        passwordHash: await bcrypt.hash(DEMO_CLIENT.password, 10),
      },
    });
    console.log(`✓ demo client ready: ${demo.email} / ${DEMO_CLIENT.password}`);
    await seedDemoHistory(demo.id);
  }

  for (const pkg of PACKAGES) {
    await prisma.package.upsert({
      where: { slug: pkg.slug },
      update: {
        title: pkg.title,
        description: pkg.description,
        durationWeeks: pkg.durationWeeks,
        priceKobo: pkg.priceKobo,
        contents: pkg.contents,
        isActive: true,
        billingInterval: "MONTHLY",
      },
      create: { ...pkg, billingInterval: "MONTHLY" },
    });
  }
  const retiredPackages = await prisma.package.updateMany({
    where: { slug: { in: RETIRED_PACKAGE_SLUGS } },
    data: { isActive: false },
  });
  console.log(`✓ ${PACKAGES.length} programs ready (${retiredPackages.count} old programs retired)`);

  for (const book of BOOKS) {
    await prisma.book.upsert({
      where: { slug: book.slug },
      update: {
        title: book.title,
        description: book.description,
        priceKobo: book.priceKobo,
        coverUrl: book.coverUrl,
        isActive: true,
      },
      create: book,
    });
  }
  const retiredBooks = await prisma.book.updateMany({
    where: { slug: { in: RETIRED_BOOK_SLUGS } },
    data: { isActive: false },
  });
  console.log(`✓ ${BOOKS.length} e-books ready (${retiredBooks.count} old e-books retired)`);

  const lessonCount = await prisma.educationContent.count();
  if (lessonCount === 0) {
    await prisma.educationContent.createMany({ data: LESSONS });
    console.log(`✓ ${LESSONS.length} sample lessons added`);
  } else {
    console.log(`• ${lessonCount} lessons already exist — skipped`);
  }

  // Two call slots per day for the next 7 days, 18:00 and 19:00 Lagos (WAT = UTC+1).
  const now = new Date();
  let slotsCreated = 0;

  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    for (const hourWAT of [18, 19]) {
      const startTime = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + dayOffset,
          hourWAT - 1,
          0,
          0,
        ),
      );
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const existing = await prisma.coachAvailability.findFirst({ where: { startTime } });
      if (!existing) {
        await prisma.coachAvailability.create({ data: { startTime, endTime } });
        slotsCreated += 1;
      }
    }
  }
  console.log(`✓ ${slotsCreated} call slots created (of 14 attempted)`);

  console.log("\nReferral codes for testing: COACHKBE (admin), DEMOKBE7 (demo client)");
  console.log("Try /?ref=DEMOKBE7, then sign up and subscribe as a new client.");

  console.log("\nDone. Log in with:");
  console.log(`  admin  → ${adminEmail} / ${adminPassword}`);
  if (process.env.SEED_DEMO_CLIENT !== "false") {
    console.log(`  client → ${DEMO_CLIENT.email} / ${DEMO_CLIENT.password}`);
  }
}

/**
 * Gives the demo client a believable week of logs so the consistency rank,
 * progress charts and dashboard are not empty on a fresh install.
 *
 * Only runs when the client has no logs at all, so re-seeding never duplicates
 * anything you logged by hand.
 */
async function seedDemoHistory(userId: string) {
  const existing = await prisma.workoutLog.count({ where: { userId } });
  if (existing > 0) {
    console.log("• demo client already has logs — history skipped");
    return;
  }

  // Day offsets from today: a five-day week with two rest days.
  const DAYS = [6, 5, 4, 1, 0];
  const now = new Date();

  /** The given day at 18:00 Lagos time (WAT = UTC+1). */
  function at(daysAgo: number, hourWAT = 18) {
    // 18:00 Lagos time (WAT = UTC+1) so the entry lands on the intended day.
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysAgo,
        hourWAT - 1,
        0,
        0,
      ),
    );
  }

  const workouts = [
    { exercise: "Squat", sets: 5, reps: 5, weightKg: 90 },
    { exercise: "Bench press", sets: 4, reps: 8, weightKg: 70 },
    { exercise: "Deadlift", sets: 3, reps: 5, weightKg: 120 },
    { exercise: "Overhead press", sets: 4, reps: 8, weightKg: 45 },
    { exercise: "Pull-up", sets: 4, reps: 8, weightKg: null },
  ];

  const meals = [
    { description: "Oatmeal, eggs and banana", calories: 620 },
    { description: "Jollof rice with grilled chicken", calories: 880 },
    { description: "Beans, plantain and fish stew", calories: 760 },
    { description: "Greek yoghurt and groundnuts", calories: 340 },
    { description: "Pepper soup with goat meat", calories: 540 },
  ];

  const weights = [96.4, 96.0, 95.6, 95.1, 94.7];

  for (const [index, daysAgo] of DAYS.entries()) {
    const loggedAt = at(daysAgo);
    const workout = workouts[index % workouts.length];
    const meal = meals[index % meals.length];

    await prisma.workoutLog.create({ data: { userId, ...workout, loggedAt } });
    await prisma.foodLog.create({ data: { userId, ...meal, loggedAt } });
    await prisma.measurementLog.create({
      data: {
        userId,
        weightKg: weights[index],
        waistCm: 92 - index,
        chestCm: 104 + index * 0.2,
        loggedAt,
      },
    });
  }

  const rank = rankForActiveDays(DAYS.length);
  await prisma.user.update({ where: { id: userId }, data: { rank } });

  console.log(
    `✓ demo history: ${DAYS.length * 3} logs across ${DAYS.length} days (rank ${rank})`,
  );
}

function explainFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const info = parseDatabaseUrl(process.env.DATABASE_URL ?? "");
  const diagnosis = diagnoseConnectionError(message, info);

  console.error("\n─────────────────────────────────────────────");
  console.error(`Seed failed: ${diagnosis.title}`);
  console.error(diagnosis.summary);
  if (info) console.error(`\nDATABASE_URL: ${info.redacted}`);
  console.error("\nWhat to try:");
  for (const fix of diagnosis.fixes) console.error(`  • ${fix}`);

  const staticIssues = info
    ? inspectDatabaseUrl(info, process.env.DATABASE_URL ?? "").filter(
        (issue) => issue.severity === "error",
      )
    : [];
  for (const issue of staticIssues) {
    console.error(`  • ${issue.title}`);
  }
  console.error("\nRun `npm run db:check` for a full diagnosis.");
  console.error("─────────────────────────────────────────────\n");
}

main()
  .catch((error) => {
    explainFailure(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
