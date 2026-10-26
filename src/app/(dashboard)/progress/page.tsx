import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ActivityHeatmap,
  CalorieChart,
  ChartCard,
  VolumeChart,
  WeightChart,
} from "@/components/progress-charts";
import { getCurrentUser } from "@/lib/api";
import { getProgress } from "@/lib/progress";
import { parseRange } from "@/lib/progress-core";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

const RANGE_TABS = [
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
] as const;

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fprogress");

  const range = parseRange(searchParams.range);
  const progress = await getProgress(user.id, range);
  const { stats } = progress;

  const statCards = [
    {
      label: "Current weight",
      value: stats.latestWeightKg === null ? "—" : `${stats.latestWeightKg} kg`,
      detail:
        stats.weightChangeKg === null
          ? "Add a second reading for a trend"
          : `${stats.weightChangeKg > 0 ? "+" : ""}${stats.weightChangeKg} kg this range`,
      tone:
        stats.weightChangeKg === null || stats.weightChangeKg === 0
          ? ""
          : stats.weightChangeKg < 0
            ? "text-success"
            : "text-goldSoft",
    },
    {
      label: "Streak",
      value: `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`,
      detail: `Best run: ${stats.bestStreak} day${stats.bestStreak === 1 ? "" : "s"}`,
      tone: "",
    },
    {
      label: "Active days",
      value: `${stats.activeDays}/${range}`,
      detail:
        stats.daysSinceLastLog === null
          ? "Nothing logged yet"
          : stats.daysSinceLastLog === 0
            ? "Logged today"
            : `Last log ${stats.daysSinceLastLog} day${stats.daysSinceLastLog === 1 ? "" : "s"} ago`,
      tone: stats.daysSinceLastLog !== null && stats.daysSinceLastLog > 2 ? "text-goldSoft" : "",
    },
    {
      label: "Sessions",
      value: stats.totalSessions.toString(),
      detail: `${stats.totalVolumeKg.toLocaleString("en-NG")} kg moved`,
      tone: "",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Progress</p>
          <h1 className="mt-2 text-3xl font-semibold">What the numbers are doing</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Weight, training volume, calories and consistency — drawn from the logs you already
            keep. Nothing here needs a spreadsheet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {RANGE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={`/progress?range=${tab.value}`}
              className={
                tab.value === range ? "btn-primary btn-sm" : "btn-secondary btn-sm"
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-tight">
            <p className="text-xs uppercase tracking-wider text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            <p className={`mt-1 text-xs ${stat.tone || "text-muted"}`}>{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <ChartCard title="Weight" hint="One point per day (last reading wins)">
          <WeightChart series={progress.weight} />
        </ChartCard>

        <ChartCard title="Consistency" hint={`${range} days`}>
          <ActivityHeatmap cells={progress.activity} />
          <div className="mt-5 grid gap-2">
            <Link href="/workouts" className="btn-secondary justify-between">
              <span>🏋️ Log a workout</span>
              <span className="text-muted">→</span>
            </Link>
            <Link href="/measurements" className="btn-secondary justify-between">
              <span>📏 Add a weigh-in</span>
              <span className="text-muted">→</span>
            </Link>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Training volume" hint="Sets × reps × load, per week">
        <VolumeChart series={progress.volume} />
      </ChartCard>

      <ChartCard
        title="Calories"
        hint={
          stats.averageCalories
            ? `Average ${stats.averageCalories.toLocaleString("en-NG")} kcal`
            : "Daily intake"
        }
      >
        <CalorieChart series={progress.calories} />
      </ChartCard>

      <section className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Want the plan, not just the charts?</h2>
          <p className="mt-1 text-sm text-muted">
            Programs add a training plan, a food template and coach check-ins — billed monthly,
            cancel any time.
          </p>
        </div>
        <Link href="/pricing" className="btn-primary">
          See programs
        </Link>
      </section>
    </div>
  );
}
