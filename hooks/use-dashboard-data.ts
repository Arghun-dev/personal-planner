"use client";

import { useState, useEffect, useMemo } from "react";
import type { AppState, SleepEntry, ScheduleItem } from "@/lib/types";
import { getSchedule } from "@/lib/constants";
import { loadState } from "@/lib/actions";

// ── Types ───────────────────────────────────────────────────────────────────
export type PeriodDays = 7 | 14 | 30 | 90;

export interface DayMetrics {
  key: string; // "YYYY-M-D"
  isoDate: string; // "YYYY-MM-DD" for ECharts calendar
  dateLabel: string; // "Mar 24"
  score: number; // 0–100
  doneTasks: number;
  totalTasks: number;
  sleepHrs: number;
  tagCompletions: Record<string, { done: number; total: number }>;
}

export interface GymWeekMetrics {
  weekLabel: string;
  count: number;
}

export interface DashboardData {
  days: DayMetrics[]; // filtered by selected period
  heatmapDays: DayMetrics[]; // always 90 days for the calendar heatmap
  gymWeeks: GymWeekMetrics[];
  avgScore: number;
  avgSleep: number;
  totalGymSessions: number;
  gymStreak: number;
  badHabitStreak: number;
  trackedDays: number;
  statusCounts: { done: number; partial: number; failed: number };
  protocolAverages: Record<string, number>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeSleep(v: number | SleepEntry | undefined): SleepEntry {
  if (v == null) return { hrs: 0 };
  if (typeof v === "number") return { hrs: v };
  return v;
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getWeekKey(d: Date): string {
  const dow = d.getDay() || 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow + 1);
  return `${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`;
}

function fmtDateLabel(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function getPlannedWake(schedule: ScheduleItem[]): string {
  const sleepBlock = schedule[0];
  if (!sleepBlock) return "05:00";
  const h = Math.floor(sleepBlock.end);
  const m = Math.round((sleepBlock.end - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function computeDayScore(
  tasks: Record<string, boolean>,
  sleepEntry: SleepEntry | undefined,
  schedule: ScheduleItem[],
  plannedWakeTime: string,
): number {
  const doneTasks = schedule.filter((b) => !!tasks[b.id]).length;
  const blockRatio = schedule.length > 0 ? doneTasks / schedule.length : 0;
  const W_BLOCKS = 0.85;
  const W_WAKE = 0.15;

  const wakeRatio: number | null = (() => {
    if (!sleepEntry?.wakeTime) return null;
    const [pH, pM] = plannedWakeTime.split(":").map(Number);
    const [aH, aM] = sleepEntry.wakeTime.split(":").map(Number);
    const deltaMin = aH * 60 + aM - (pH * 60 + pM);
    if (deltaMin <= 0) return 1;
    if (deltaMin >= 120) return 0;
    return 1 - deltaMin / 120;
  })();

  const includeWake = wakeRatio !== null && blockRatio > 0;
  const availWeight = W_BLOCKS + (includeWake ? W_WAKE : 0);
  const rawScoreSum =
    blockRatio * W_BLOCKS + (includeWake ? wakeRatio! * W_WAKE : 0);
  return availWeight > 0 ? Math.round((rawScoreSum / availWeight) * 100) : 0;
}

function computeBadHabitStreak(state: AppState): number {
  let streak = 0;
  const monday = new Date();
  const dow = monday.getDay() || 7;
  monday.setDate(monday.getDate() - dow + 1);
  monday.setHours(0, 0, 0, 0);
  for (let i = 0; i < 104; i++) {
    const wkStart = new Date(monday);
    wkStart.setDate(monday.getDate() - i * 7);
    const key = `${wkStart.getFullYear()}-${wkStart.getMonth() + 1}-${wkStart.getDate()}`;
    if (state.badHabits?.[key]) streak++;
    else break;
  }
  return streak;
}

function computeDaysRange(state: AppState, period: number): DayMetrics[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: DayMetrics[] = [];

  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dateToKey(d);
    const schedule = getSchedule(d.getDay());
    const plannedWake = getPlannedWake(schedule);
    const tasks = state.days?.[key]?.tasks ?? {};
    const sleepEntry = normalizeSleep(state.sleep?.[key]);
    const score = computeDayScore(tasks, sleepEntry, schedule, plannedWake);
    const doneTasks = schedule.filter((b) => !!tasks[b.id]).length;

    const tagCompletions: Record<string, { done: number; total: number }> = {};
    for (const block of schedule) {
      if (!tagCompletions[block.tag])
        tagCompletions[block.tag] = { done: 0, total: 0 };
      tagCompletions[block.tag].total++;
      if (tasks[block.id]) tagCompletions[block.tag].done++;
    }

    days.push({
      key,
      isoDate: dateToIso(d),
      dateLabel: fmtDateLabel(d),
      score,
      doneTasks,
      totalTasks: schedule.length,
      sleepHrs: sleepEntry.hrs,
      tagCompletions,
    });
  }
  return days;
}

function computeGymWeeks(state: AppState, period: number): GymWeekMetrics[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seenWeeks = new Set<string>();
  const gymWeeks: GymWeekMetrics[] = [];

  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const wk = getWeekKey(d);
    if (seenWeeks.has(wk)) continue;
    seenWeeks.add(wk);
    const gymData = state.gym?.[wk] ?? {};
    const count = Object.values(gymData).filter((v) => v === true).length;
    gymWeeks.push({
      weekLabel: fmtDateLabel(keyToDate(wk)),
      count,
    });
  }
  return gymWeeks;
}

function computeDashboardData(
  state: AppState,
  period: PeriodDays,
): DashboardData {
  const days = computeDaysRange(state, period);
  const heatmapDays = period === 90 ? days : computeDaysRange(state, 90);
  const gymWeeks = computeGymWeeks(state, period);

  // Aggregates
  const trackedDays = days.filter(
    (d) => d.doneTasks > 0 || d.sleepHrs > 0,
  ).length;
  const scoredDays = days.filter((d) => d.doneTasks > 0 || d.sleepHrs > 0);
  const avgScore =
    scoredDays.length > 0
      ? Math.round(
          scoredDays.reduce((s, d) => s + d.score, 0) / scoredDays.length,
        )
      : 0;
  const sleepDays = days.filter((d) => d.sleepHrs > 0);
  const avgSleep =
    sleepDays.length > 0
      ? Math.round(
          (sleepDays.reduce((s, d) => s + d.sleepHrs, 0) / sleepDays.length) *
            10,
        ) / 10
      : 0;
  const totalGymSessions = gymWeeks.reduce((s, w) => s + w.count, 0);

  // Gym streak: consecutive weeks (going back from current) with ≥ 1 session
  function computeGymStreak(): number {
    let streak = 0;
    const today = new Date();
    // Start from i=1 (last completed week); current week is always in progress
    for (let i = 1; i < 104; i++) {
      const ref = new Date(today);
      ref.setDate(today.getDate() - i * 7);
      const wk = getWeekKey(ref);
      const gymData = state.gym?.[wk] ?? {};
      const count = Object.values(gymData).filter((v) => v === true).length;
      if (count >= 1) streak++;
      else break;
    }
    return streak;
  }
  const gymStreak = computeGymStreak();

  // Status distribution: great ≥80%, ok 40-79%, missed <40%
  const statusCounts = { done: 0, partial: 0, failed: 0 };
  for (const d of days) {
    if (d.totalTasks === 0) continue;
    if (d.score >= 80) statusCounts.done++;
    else if (d.score >= 40) statusCounts.partial++;
    else statusCounts.failed++;
  }

  // Protocol averages (across all days in period)
  const protocolTotals: Record<string, { done: number; total: number }> = {};
  for (const d of days) {
    for (const [tag, { done, total }] of Object.entries(d.tagCompletions)) {
      if (!protocolTotals[tag]) protocolTotals[tag] = { done: 0, total: 0 };
      protocolTotals[tag].done += done;
      protocolTotals[tag].total += total;
    }
  }
  const protocolAverages: Record<string, number> = {};
  for (const [tag, { done, total }] of Object.entries(protocolTotals)) {
    protocolAverages[tag] = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return {
    days,
    heatmapDays,
    gymWeeks,
    avgScore,
    avgSleep,
    totalGymSessions,
    gymStreak,
    badHabitStreak: computeBadHabitStreak(state),
    trackedDays,
    statusCounts,
    protocolAverages,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useDashboardData(period: PeriodDays) {
  const [state, setState] = useState<AppState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadState().then((loaded) => {
      setState(loaded);
      setHydrated(true);
    });
  }, []);

  const data = useMemo(() => {
    if (!state) return null;
    return computeDashboardData(state, period);
  }, [state, period]);

  return { data, hydrated };
}
