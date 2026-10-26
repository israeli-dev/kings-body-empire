/**
 * Hand-rolled SVG charts — no charting dependency, no client JavaScript.
 * Everything here is a server component: the page ships HTML with the drawing
 * already in it, which keeps the dashboard fast on Nigerian mobile data.
 */
import {
  compactNumber,
  shortDate,
  type ActivityCell,
  type CalorieSeries,
  type VolumeSeries,
  type WeightSeries,
} from "@/lib/progress-core";

const GOLD = "#F5B301";
const GOLD_SOFT = "#FFD978";
const LINE = "#2C251C";
const MUTED = "#A79F94";

const W = 640;
const H = 210;
const PAD = { left: 46, right: 14, top: 16, bottom: 26 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel2/60 px-6 text-center">
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}

function yAxis(min: number, max: number) {
  const span = max - min || 1;
  return (value: number) => PAD.top + PLOT_H - ((value - min) / span) * PLOT_H;
}

/** Axis title / grid line shared by both cartesian charts. */
function GridLines({
  min,
  max,
  format,
}: {
  min: number;
  max: number;
  format: (value: number) => string;
}) {
  const scale = yAxis(min, max);
  const mid = (min + max) / 2;
  return (
    <>
      {[max, mid, min].map((value) => {
        const y = scale(value);
        return (
          <g key={value}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke={LINE} strokeWidth={1} />
            <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill={MUTED}>
              {format(value)}
            </text>
          </g>
        );
      })}
    </>
  );
}

export function WeightChart({ series }: { series: WeightSeries }) {
  const points = series.points;

  if (points.length === 0) {
    return (
      <EmptyChart>
        No weight readings in this range yet. Add one under{" "}
        <span className="text-goldSoft">Measurements</span> and the line starts here.
      </EmptyChart>
    );
  }

  const values = points.map((point) => point.weightKg);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(0.5, (rawMax - rawMin) * 0.15);
  const min = Math.floor(rawMin - padding);
  const max = Math.ceil(rawMax + padding);

  const scale = yAxis(min, max);
  const span = Math.max(1, points.length - 1);
  const x = (index: number) =>
    points.length === 1
      ? PAD.left + PLOT_W / 2
      : PAD.left + (index / span) * PLOT_W;

  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${scale(point.weightKg)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + PLOT_H} L${x(0)},${PAD.top + PLOT_H} Z`;
  const last = points[points.length - 1];
  const change = series.changeKg;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-gold">{last.weightKg} kg</span>
        {change !== null && (
          <span
            className={`text-sm font-medium ${
              change === 0 ? "text-muted" : change < 0 ? "text-success" : "text-goldSoft"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change} kg over {points.length} readings
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Weight trend: ${points.length} readings from ${points[0].weightKg}kg to ${last.weightKg}kg`}
      >
        <defs>
          <linearGradient id="weight-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.28" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
          </linearGradient>
        </defs>

        <GridLines min={min} max={max} format={(value) => `${Math.round(value)}`} />

        <path d={area} fill="url(#weight-fill)" />
        <path d={line} fill="none" stroke={GOLD} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point, index) => (
          <circle key={point.date} cx={x(index)} cy={scale(point.weightKg)} r={index === points.length - 1 ? 4.5 : 2.5} fill={index === points.length - 1 ? GOLD_SOFT : GOLD}>
            <title>{`${shortDate(point.date)}: ${point.weightKg} kg`}</title>
          </circle>
        ))}

        <text x={PAD.left} y={H - 8} fontSize={10} fill={MUTED}>
          {shortDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={10} fill={MUTED}>
            {shortDate(last.date)}
          </text>
        )}
      </svg>
    </div>
  );
}

export function VolumeChart({ series }: { series: VolumeSeries }) {
  if (series.weeks.every((week) => week.sessions === 0)) {
    return (
      <EmptyChart>
        No workouts in this range. Log a session under{" "}
        <span className="text-goldSoft">Workouts</span> and your weekly volume appears here.
      </EmptyChart>
    );
  }

  const values = series.weeks.map((week) => week.volumeKg);
  const max = Math.max(1, ...values) * 1.1;
  const scale = yAxis(0, max);
  const slot = PLOT_W / series.weeks.length;
  const barWidth = Math.max(3, slot * 0.62);
  const baseline = PAD.top + PLOT_H;
  const labelEvery = series.weeks.length > 8 ? 2 : 1;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-gold">
          {compactNumber(series.totalVolumeKg)} kg
        </span>
        <span className="text-sm text-muted">
          lifted across {series.totalSessions} session{series.totalSessions === 1 ? "" : "s"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Weekly training volume for the last ${series.weeks.length} weeks`}
      >
        <GridLines min={0} max={max} format={compactNumber} />

        {series.weeks.map((week, index) => {
          const height = Math.max(week.volumeKg > 0 ? 3 : 0, baseline - scale(week.volumeKg));
          const x = PAD.left + index * slot + (slot - barWidth) / 2;
          return (
            <g key={week.weekStart}>
              {height > 0 && (
                <rect
                  x={x}
                  y={baseline - height}
                  width={barWidth}
                  height={height}
                  rx={3}
                  fill={index === series.weeks.length - 1 ? GOLD_SOFT : GOLD}
                  opacity={index === series.weeks.length - 1 ? 1 : 0.72}
                >
                  <title>
                    {`Week of ${shortDate(week.weekStart)}: ${compactNumber(week.volumeKg)} kg · ${week.sessions} session${week.sessions === 1 ? "" : "s"}`}
                  </title>
                </rect>
              )}
              {index % labelEvery === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill={MUTED}
                >
                  {shortDate(week.weekStart)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function CalorieChart({ series }: { series: CalorieSeries }) {
  if (series.loggedDays === 0) {
    return (
      <EmptyChart>
        No calories logged in this range. Add meals under{" "}
        <span className="text-goldSoft">Food</span> to see your daily intake.
      </EmptyChart>
    );
  }

  const max = Math.max(1, ...series.days.map((day) => day.calories)) * 1.1;
  const scale = yAxis(0, max);
  const slot = PLOT_W / series.days.length;
  const barWidth = Math.max(2, slot * 0.66);
  const baseline = PAD.top + PLOT_H;
  const averageY = series.average ? scale(series.average) : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold text-gold">
          {series.average ? `${series.average.toLocaleString("en-NG")} kcal` : "—"}
        </span>
        <span className="text-sm text-muted">
          average on {series.loggedDays} logged day{series.loggedDays === 1 ? "" : "s"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Daily calories for the last ${series.days.length} days`}
      >
        <GridLines min={0} max={max} format={compactNumber} />

        {series.days.map((day, index) => {
          const height = day.calories > 0 ? Math.max(3, baseline - scale(day.calories)) : 0;
          return (
            <g key={day.date}>
              {height > 0 && (
                <rect
                  x={PAD.left + index * slot + (slot - barWidth) / 2}
                  y={baseline - height}
                  width={barWidth}
                  height={height}
                  rx={2}
                  fill={GOLD}
                  opacity={0.7}
                >
                  <title>{`${shortDate(day.date)}: ${day.calories.toLocaleString("en-NG")} kcal`}</title>
                </rect>
              )}
            </g>
          );
        })}

        {averageY !== null && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={averageY}
            y2={averageY}
            stroke={GOLD_SOFT}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.8}
          >
            <title>Average</title>
          </line>
        )}

        <text x={PAD.left} y={H - 8} fontSize={10} fill={MUTED}>
          {shortDate(series.days[0].date)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize={10} fill={MUTED}>
          {shortDate(series.days[series.days.length - 1].date)}
        </text>
      </svg>
    </div>
  );
}

const LEVEL_CLASSES: Record<ActivityCell["level"], string> = {
  0: "border-line bg-panel2",
  1: "border-gold/25 bg-gold/20",
  2: "border-gold/45 bg-gold/50",
  3: "border-gold/70 bg-gold",
};

export function ActivityHeatmap({ cells }: { cells: ActivityCell[] }) {
  const active = cells.filter((cell) => cell.count > 0).length;

  return (
    <div>
      <p className="text-sm text-muted">
        <span className="font-medium text-ink">{active}</span> active day
        {active === 1 ? "" : "s"} out of {cells.length}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5" role="img" aria-label={`${active} active days`}>
        {cells.map((cell) => (
          <span
            key={cell.date}
            className={`h-4 w-4 rounded-[3px] border ${LEVEL_CLASSES[cell.level]}`}
            title={`${shortDate(cell.date)}: ${
              cell.count === 0 ? "nothing logged" : `${cell.count} entr${cell.count === 1 ? "y" : "ies"}`
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <span>Less</span>
        {([0, 1, 2, 3] as const).map((level) => (
          <span key={level} className={`h-3 w-3 rounded-[2px] border ${LEVEL_CLASSES[level]}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
