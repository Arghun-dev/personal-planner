"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { AppState } from "@/lib/types";
import { SCHEDULE, DAYS, DAYS_FULL, MONTHS } from "@/lib/constants";

const DEFAULT_STATE: AppState = { days: {}, gym: {}, sleep: {}, notes: {} };

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getWeekKey(): string {
  const d = new Date();
  const dow = d.getDay() || 7; // make Sunday = 7
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow + 1);
  return `${mon.getFullYear()}-${mon.getMonth() + 1}-${mon.getDate()}`;
}

function isActiveBlock(start: number, end: number): boolean {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  return start > end ? h >= start || h < end : h >= start && h < end;
}

function computeStreak(state: AppState): number {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(d);
    check.setDate(d.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth() + 1}-${check.getDate()}`;
    if (state.days?.[key]?.completed) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function persist(newState: AppState) {
  try {
    localStorage.setItem("disciplineOS", JSON.stringify(newState));
  } catch {
    /* ignore */
  }
}

export function useDisciplineOS() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE;
    try {
      const raw = localStorage.getItem("disciplineOS");
      return raw ? (JSON.parse(raw) as AppState) : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => setHydrated(true));
  }, []);

  // ── Derived values (recomputed each render so active blocks stay fresh) ──

  const todayKey = getTodayKey();
  const weekKey = getWeekKey();

  const todayTasks = state.days?.[todayKey]?.tasks ?? {};
  const doneTasks = SCHEDULE.filter((b) => todayTasks[b.id]).length;
  const score =
    SCHEDULE.length > 0 ? Math.round((doneTasks / SCHEDULE.length) * 100) : 0;
  const streak = computeStreak(state);
  const gymDays = state.gym?.[weekKey] ?? {};
  const gymCount = Object.values(gymDays).filter(Boolean).length;
  const todaySleep = state.sleep?.[todayKey];
  const notes = state.notes?.[todayKey] ?? "";

  const scheduleWithState = SCHEDULE.map((block) => ({
    ...block,
    done: !!todayTasks[block.id],
    active: isActiveBlock(block.start, block.end),
  }));

  const sleepData = (() => {
    const d = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() - (6 - i));
      const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
      const hrs = state.sleep?.[key] ?? 0;
      const dayLabel = DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1];
      return { key, dayLabel, hrs };
    });
  })();

  const dateDisplay = (() => {
    const d = new Date();
    return `${DAYS_FULL[d.getDay()].toUpperCase()}, ${MONTHS[d.getMonth()].toUpperCase()} ${d.getDate()} ${d.getFullYear()}`;
  })();

  // ── Mutations ──

  const toggleTask = useCallback((id: string) => {
    setState((prev) => {
      const key = getTodayKey();
      const dayData = prev.days?.[key] ?? { tasks: {} };
      const tasks = { ...dayData.tasks, [id]: !dayData.tasks[id] };
      const allDone = SCHEDULE.every((b) => !!tasks[b.id]);
      const next: AppState = {
        ...prev,
        days: {
          ...prev.days,
          [key]: { ...dayData, tasks, completed: allDone },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  const toggleGym = useCallback((dayIdx: number) => {
    setState((prev) => {
      const wk = getWeekKey();
      const week = prev.gym?.[wk] ?? {};
      const next: AppState = {
        ...prev,
        gym: {
          ...prev.gym,
          [wk]: { ...week, [String(dayIdx)]: !week[String(dayIdx)] },
        },
      };
      persist(next);
      return next;
    });
  }, []);

  const logSleep = useCallback((hrs: number) => {
    setState((prev) => {
      const key = getTodayKey();
      const next: AppState = { ...prev, sleep: { ...prev.sleep, [key]: hrs } };
      persist(next);
      return next;
    });
  }, []);

  const updateNotes = useCallback((text: string) => {
    setState((prev) => {
      const key = getTodayKey();
      const next: AppState = { ...prev, notes: { ...prev.notes, [key]: text } };
      persist(next);
      return next;
    });
  }, []);

  const resetToday = useCallback(() => {
    setState((prev) => {
      const key = getTodayKey();
      const newDays = { ...prev.days };
      delete newDays[key];
      const next: AppState = { ...prev, days: newDays };
      persist(next);
      return next;
    });
  }, []);

  return {
    hydrated,
    scheduleWithState,
    doneTasks,
    total: SCHEDULE.length,
    score,
    streak,
    gymDays,
    gymCount,
    sleepData,
    todaySleep,
    notes,
    dateDisplay,
    toggleTask,
    toggleGym,
    logSleep,
    updateNotes,
    resetToday,
  };
}
