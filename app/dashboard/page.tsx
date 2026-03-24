"use client";

import { useState } from "react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { useDashboardData, type PeriodDays } from "@/hooks/use-dashboard-data";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// ── Protocol colours ─────────────────────────────────────────────────────────
const PROTOCOL_COLORS: Record<string, string> = {
  sleep: "#7c3aed",
  growth: "#2563eb",
  work: "#ea580c",
  gym: "#dc2626",
  meal: "#ca8a04",
  rest: "#16a34a",
  other: "#9ca3af",
};
const PROTOCOL_ORDER = [
  "sleep",
  "growth",
  "work",
  "gym",
  "meal",
  "rest",
  "other",
];

// ── Shared chart styles ───────────────────────────────────────────────────────
const TICK_STYLE = { fill: "#9ca3af", fontSize: 11 } as const;
const GRID_STROKE = "#f3f4f6";
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  fontSize: 12,
  color: "#374151",
  padding: "6px 10px",
};
const TOOLTIP_CURSOR = { stroke: "#e5e7eb", strokeWidth: 1 };

// ── Color helpers ─────────────────────────────────────────────────────────────
function sleepColor(hrs: number) {
  if (hrs === 0) return "#f3f4f6";
  if (hrs >= 8) return "#22c55e";
  if (hrs >= 6) return "#f59e0b";
  return "#ef4444";
}
function gymColor(n: number) {
  if (n >= 5) return "#22c55e";
  if (n >= 3) return "#f59e0b";
  if (n > 0) return "#ef4444";
  return "#f3f4f6";
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <div className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-1">
          {label}
        </div>
        <div
          className={cn(
            "text-3xl font-bold font-mono leading-none",
            valueClass,
          )}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Chart Card wrapper ────────────────────────────────────────────────────────
function ChartCard({
  title,
  height = 260,
  children,
  className,
}: {
  title: string;
  height?: number | "auto";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="px-5 pt-1 pb-0">
        <CardTitle className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent
        className="px-5 pb-3 min-w-0"
        style={height === "auto" ? { minHeight: 60 } : { height }}
      >
        {children}
      </CardContent>
    </Card>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <div className="h-2.5 w-16 bg-muted rounded animate-pulse mb-2.5" />
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="w-full animate-pulse rounded bg-muted" style={{ height }} />
  );
}

// ── Period button ─────────────────────────────────────────────────────────────
function PeriodBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "font-mono text-[11px] font-semibold px-3 py-1.5 rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {children}
    </button>
  );
}

// ── Custom Tooltip components ─────────────────────────────────────────────────
interface TooltipPayloadItem {
  value: number;
  name?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ScoreTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-semibold text-xs mb-0.5">{label}</div>
      <div>
        Score: <b>{payload[0].value}%</b>
      </div>
    </div>
  );
}

function SleepTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value as number;
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-semibold text-xs mb-0.5">{label}</div>
      <div>
        Sleep: <b>{v > 0 ? `${v}h` : "—"}</b>
      </div>
    </div>
  );
}

function GymTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-semibold text-xs mb-0.5">Week of {label}</div>
      <div>
        Sessions: <b>{payload[0].value}</b>
      </div>
    </div>
  );
}

function ProtocolTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-semibold text-xs mb-0.5 uppercase">{label}</div>
      <div>
        Completion: <b>{payload[0].value}%</b>
      </div>
    </div>
  );
}

interface StatusPayload extends TooltipPayloadItem {
  payload: { name: string; value: number; total: number; fill: string };
}

interface StatusTooltipProps {
  active?: boolean;
  payload?: StatusPayload[];
}

function StatusTooltip({ active, payload }: StatusTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value, total } = payload[0].payload;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={TOOLTIP_STYLE}>
      <div className="font-semibold text-xs mb-0.5">{name}</div>
      <div>
        {value} day{value !== 1 ? "s" : ""} · <b>{pct}%</b>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { hydrated, streak, score, gymCount, badHabitStreak, dateDisplay } =
    usePersonalPlanner();

  const [period, setPeriod] = useState<PeriodDays>(30);
  const { data, hydrated: dataHydrated } = useDashboardData(period);

  if (!hydrated) return null;

  const xAxisInterval = period <= 14 ? 0 : period <= 30 ? 4 : 9;

  const scoreTrendData =
    data?.days.map((d) => ({ label: d.dateLabel, score: d.score })) ?? [];

  const sleepChartData =
    data?.days.map((d) => ({ label: d.dateLabel, hrs: d.sleepHrs })) ?? [];

  const gymChartData =
    data?.gymWeeks.map((w) => ({ label: w.weekLabel, count: w.count })) ?? [];

  const statusTotal =
    (data?.statusCounts.done ?? 0) +
    (data?.statusCounts.partial ?? 0) +
    (data?.statusCounts.failed ?? 0);

  const statusData = [
    {
      name: "Great (≥80%)",
      value: data?.statusCounts.done ?? 0,
      total: statusTotal,
      fill: "#22c55e",
    },
    {
      name: "OK (40–79%)",
      value: data?.statusCounts.partial ?? 0,
      total: statusTotal,
      fill: "#f59e0b",
    },
    {
      name: "Missed (<40%)",
      value: data?.statusCounts.failed ?? 0,
      total: statusTotal,
      fill: "#ef4444",
    },
  ];

  const protocolData = PROTOCOL_ORDER.filter(
    (tag) =>
      tag !== "gym" &&
      tag !== "rest" &&
      data?.protocolAverages[tag] !== undefined,
  ).map((tag) => ({
    tag: tag.toUpperCase(),
    pct: data!.protocolAverages[tag],
    fill: PROTOCOL_COLORS[tag],
  }));

  return (
    <div className="min-h-screen bg-muted/30 text-foreground font-sans">
      <Header
        streak={streak}
        score={score}
        gymCount={gymCount}
        dateDisplay={dateDisplay}
        badHabitStreak={badHabitStreak}
      />

      <main className="max-w-275 mx-auto px-8 py-8">
        {/* Title + Period filter */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">
              Last {period} days · performance overview
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {([7, 14, 30, 90] as PeriodDays[]).map((p) => (
              <PeriodBtn
                key={p}
                active={period === p}
                onClick={() => setPeriod(p)}
              >
                {p}d
              </PeriodBtn>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {dataHydrated && data ? (
            <>
              <KpiCard
                label="Avg Score"
                value={`${data.avgScore}%`}
                sub={`${data.trackedDays} tracked days`}
                valueClass={
                  data.avgScore >= 80
                    ? "text-green-600"
                    : data.avgScore >= 50
                      ? "text-amber-500"
                      : "text-red-500"
                }
              />
              <KpiCard
                label="Avg Sleep"
                value={`${data.avgSleep}h`}
                sub="target: 8h"
                valueClass={
                  data.avgSleep >= 8
                    ? "text-green-600"
                    : data.avgSleep >= 6
                      ? "text-amber-500"
                      : "text-foreground"
                }
              />
              <Card className="gap-2 py-4">
                <CardContent className="px-4">
                  <div className="text-[10px] font-mono tracking-[0.18em] text-muted-foreground uppercase mb-1">
                    Gym
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold font-mono leading-none text-red-600">
                        {data.totalGymSessions}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                        sessions
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold font-mono leading-none text-orange-500">
                        {data.gymStreak}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                        streak
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <KpiCard
                label="Best Days"
                value={String(data.statusCounts.done)}
                sub="score ≥ 80%"
                valueClass="text-blue-600"
              />
              <KpiCard
                label="Habit Streak"
                value={`${data.badHabitStreak}w`}
                sub="clean weeks"
                valueClass="text-violet-600"
              />
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          )}
        </div>

        {/* Score Trend */}
        <ChartCard title="Score Trend" height={260} className="mb-4">
          {dataHydrated ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <LineChart
                data={scoreTrendData}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={{ stroke: "#e5e7eb" }}
                  interval={xAxisInterval}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={TICK_STYLE}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={38}
                />
                <Tooltip content={<ScoreTooltip />} cursor={TOOLTIP_CURSOR} />
                <ReferenceLine
                  y={80}
                  stroke="#22c55e"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Great",
                    fill: "#22c55e",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{
                    value: "OK",
                    fill: "#f59e0b",
                    fontSize: 10,
                    position: "insideTopRight",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={
                    period <= 14
                      ? { r: 3, fill: "#3b82f6", strokeWidth: 0 }
                      : false
                  }
                  activeDot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartSkeleton height={260} />
          )}
        </ChartCard>

        {/* Sleep + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-4">
          <ChartCard title="Sleep Quality" height={240}>
            {dataHydrated ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                <BarChart
                  data={sleepChartData}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                    interval={xAxisInterval}
                  />
                  <YAxis
                    domain={[0, 12]}
                    ticks={[0, 2, 4, 6, 8, 10, 12]}
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                    width={32}
                  />
                  <Tooltip content={<SleepTooltip />} cursor={TOOLTIP_CURSOR} />
                  <ReferenceLine
                    y={8}
                    stroke="#9ca3af"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: "8h",
                      fill: "#9ca3af",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar dataKey="hrs" radius={[2, 2, 0, 0]} maxBarSize={28}>
                    {sleepChartData.map((d, i) => (
                      <Cell key={i} fill={sleepColor(d.hrs)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={240} />
            )}
          </ChartCard>

          <ChartCard title="Day Status Distribution" height={240}>
            {dataHydrated && statusTotal > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="40%"
                    innerRadius="38%"
                    outerRadius="62%"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<StatusTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      paddingTop: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-mono">
                {dataHydrated ? "No data yet" : <ChartSkeleton height={240} />}
              </div>
            )}
          </ChartCard>
        </div>

        {/* Protocol + Gym */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Protocol Completion Rates"
            height={
              protocolData.length > 0
                ? Math.max(200, protocolData.length * 42 + 32)
                : 220
            }
          >
            {dataHydrated && protocolData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                <BarChart
                  data={protocolData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="tag"
                    tick={{ ...TICK_STYLE, fontSize: 10, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    content={<ProtocolTooltip />}
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  />
                  <Bar dataKey="pct" radius={[0, 3, 3, 0]} maxBarSize={22}>
                    {protocolData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={220} />
            )}
          </ChartCard>

          <ChartCard title="Gym Sessions per Week" height={220}>
            {dataHydrated ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={0}>
                <BarChart
                  data={gymChartData}
                  margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                >
                  <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e7eb" }}
                  />
                  <YAxis
                    domain={[0, 7]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7]}
                    tick={TICK_STYLE}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                  />
                  <Tooltip content={<GymTooltip />} cursor={TOOLTIP_CURSOR} />
                  <ReferenceLine
                    y={5}
                    stroke="#22c55e"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{
                      value: "Goal",
                      fill: "#22c55e",
                      fontSize: 10,
                      position: "insideTopRight",
                    }}
                  />
                  <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={36}>
                    {gymChartData.map((d, i) => (
                      <Cell key={i} fill={gymColor(d.count)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartSkeleton height={220} />
            )}
          </ChartCard>
        </div>
      </main>
    </div>
  );
}
