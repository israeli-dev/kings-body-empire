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

const PACKAGES = [
  {
    slug: "foundation",
    title: "Foundation",
    durationWeeks: 4,
    priceKobo: 2_000_000, // ₦20,000
    description:
      "Four weeks to build the habit. A training plan you can finish, a food template built around Nigerian meals and one check-in a week.",
    contents: [
      "4-week training plan (gym or home)",
      "Nigerian food template with portions",
      "Weekly check-in and rank review",
      "WhatsApp support",
    ],
  },
  {
    slug: "transformation",
    title: "Transformation",
    durationWeeks: 12,
    priceKobo: 2_500_000, // ₦25,000
    description:
      "The full programme. Progressive training blocks, meal planning and coaching on consistency — the boring part that actually works.",
    contents: [
      "12 weeks of progressive training blocks",
      "Custom calorie and protein targets",
      "Fortnightly video calls",
      "Form review on lifts",
      "Priority WhatsApp support",
    ],
  },
  {
    slug: "elite-1-on-1",
    title: "Elite 1-on-1",
    durationWeeks: 8,
    priceKobo: 3_000_000, // ₦30,000
    description:
      "Direct access to the coach. A plan built around your body, your schedule and your kitchen, adjusted every two weeks.",
    contents: [
      "Fully bespoke training programme",
      "Weekly 1-on-1 calls",
      "Unlimited form reviews",
      "Travel and event week plans",
      "Direct line to the coach",
    ],
  },
];

const BOOKS = [
  {
    slug: "the-kings-kitchen",
    title: "The King's Kitchen",
    description:
      "Forty Nigerian meals with calories and protein per serving, plus a two-week cutting plan you can cook on a Sunday.",
    priceKobo: 750_000,
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    slug: "hypertrophy-blueprint",
    title: "Hypertrophy Blueprint",
    description:
      "The 12-week upper/lower block that builds size with four sessions a week — including deload rules and progression targets.",
    priceKobo: 1_000_000,
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    slug: "cut-without-crashing",
    title: "Cut Without Crashing",
    description:
      "How to drop fat without losing your strength, your sleep or your mind. Includes the refeed protocol and travel weeks.",
    priceKobo: 850_000,
    fileUrl:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
];

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
  console.log(`✓ ${PACKAGES.length} programs ready`);

  for (const book of BOOKS) {
    await prisma.book.upsert({
      where: { slug: book.slug },
      update: {
        title: book.title,
        description: book.description,
        priceKobo: book.priceKobo,
        fileUrl: book.fileUrl,
        isActive: true,
      },
      create: book,
    });
  }
  console.log(`✓ ${BOOKS.length} e-books ready`);

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
