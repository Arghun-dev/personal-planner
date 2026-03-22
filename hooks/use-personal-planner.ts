"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { AppState, TodoItem, TodoTag } from "@/lib/types";
import { getSchedule, DAYS, DAYS_FULL, MONTHS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const PLANNER_KEY = "personal";

const DEFAULT_STATE: AppState = {
  days: {},
  gym: {},
  sleep: {},
  notes: {},
  todos: { tags: [], items: [] },
  badHabits: {},
};

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

function computeBadHabitStreak(state: AppState): number {
  // Count consecutive clean weeks going backwards from current week
  let streak = 0;
  const monday = new Date();
  const dow = monday.getDay() || 7;
  monday.setDate(monday.getDate() - dow + 1);
  monday.setHours(0, 0, 0, 0);
  for (let i = 0; i < 104; i++) {
    const wkStart = new Date(monday);
    wkStart.setDate(monday.getDate() - i * 7);
    const key = `${wkStart.getFullYear()}-${wkStart.getMonth() + 1}-${wkStart.getDate()}`;
    if (state.badHabits?.[key]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
  void supabase
    .from("planner_state")
    .upsert({ key: PLANNER_KEY, data: newState, updated_at: new Date().toISOString() });
}

export function usePersonalPlanner() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    supabase
      .from("planner_state")
      .select("data")
      .eq("key", PLANNER_KEY)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) setState(row.data as AppState);
        startTransition(() => setHydrated(true));
      });
  }, []);

  // Pick the right schedule for today
  const todayKey = getTodayKey();
  const weekKey = getWeekKey();
  const SCHEDULE = getSchedule(new Date().getDay());

  const todayTasks = state.days?.[todayKey]?.tasks ?? {};
  const doneTasks = SCHEDULE.filter((b) => todayTasks[b.id]).length;
  const score =
    SCHEDULE.length > 0 ? Math.round((doneTasks / SCHEDULE.length) * 100) : 0;
  const streak = computeStreak(state);
  const gymDays = state.gym?.[weekKey] ?? {};
  const gymCount = Object.values(gymDays).filter(Boolean).length;
  const todaySleep = state.sleep?.[todayKey];
  const notes = state.notes?.[todayKey] ?? "";
  const todos = state.todos ?? { tags: [], items: [] };
  const badHabits = state.badHabits ?? {};
  const badHabitStreak = computeBadHabitStreak(state);

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

  const toggleTask = useCallback(
    (id: string) => {
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
    },
    [SCHEDULE],
  );

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

  // ── Todo mutations ──────────────────────────────────────────────────────

  const addTodoItem = useCallback(
    (text: string, tagIds: string[], link?: string) => {
      setState((prev) => {
        const todos = prev.todos ?? { tags: [], items: [] };
        const item: TodoItem = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          done: false,
          tagIds,
          createdAt: Date.now(),
          ...(link ? { link } : {}),
        };
        const next: AppState = {
          ...prev,
          todos: { ...todos, items: [...todos.items, item] },
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  const toggleTodoItem = useCallback((id: string) => {
    setState((prev) => {
      const todos = prev.todos ?? { tags: [], items: [] };
      const next: AppState = {
        ...prev,
        todos: {
          ...todos,
          items: todos.items.map((it) =>
            it.id === id ? { ...it, done: !it.done } : it,
          ),
        },
      };
      persist(next);
      return next;
    });
  }, []);

  const deleteTodoItem = useCallback((id: string) => {
    setState((prev) => {
      const todos = prev.todos ?? { tags: [], items: [] };
      const next: AppState = {
        ...prev,
        todos: { ...todos, items: todos.items.filter((it) => it.id !== id) },
      };
      persist(next);
      return next;
    });
  }, []);

  const updateTodoItem = useCallback(
    (
      id: string,
      patch: Partial<Pick<TodoItem, "text" | "tagIds" | "link">>,
    ) => {
      setState((prev) => {
        const todos = prev.todos ?? { tags: [], items: [] };
        const next: AppState = {
          ...prev,
          todos: {
            ...todos,
            items: todos.items.map((it) =>
              it.id === id ? { ...it, ...patch } : it,
            ),
          },
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  const addTodoTag = useCallback((name: string, color: string) => {
    setState((prev) => {
      const todos = prev.todos ?? { tags: [], items: [] };
      const tag: TodoTag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        color,
      };
      const next: AppState = {
        ...prev,
        todos: { ...todos, tags: [...todos.tags, tag] },
      };
      persist(next);
      return next;
    });
  }, []);

  const updateTodoTag = useCallback(
    (id: string, patch: Partial<Pick<TodoTag, "name" | "color">>) => {
      setState((prev) => {
        const todos = prev.todos ?? { tags: [], items: [] };
        const next: AppState = {
          ...prev,
          todos: {
            ...todos,
            tags: todos.tags.map((tg) =>
              tg.id === id ? { ...tg, ...patch } : tg,
            ),
          },
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  const deleteTodoTag = useCallback((id: string) => {
    setState((prev) => {
      const todos = prev.todos ?? { tags: [], items: [] };
      const next: AppState = {
        ...prev,
        todos: {
          tags: todos.tags.filter((tg) => tg.id !== id),
          items: todos.items.map((it) => ({
            ...it,
            tagIds: it.tagIds.filter((tid) => tid !== id),
          })),
        },
      };
      persist(next);
      return next;
    });
  }, []);
  // ── Bad habit mutations ────────────────────────────────────────────────

  const toggleBadHabitClean = useCallback((weekKey: string) => {
    setState((prev) => {
      const bh = prev.badHabits ?? {};
      const next: AppState = {
        ...prev,
        badHabits: { ...bh, [weekKey]: !bh[weekKey] },
      };
      persist(next);
      return next;
    });
  }, []);

  // ───────────────────────────────────────────────────────────────────────

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
    todos,
    badHabits,
    badHabitStreak,
    dateDisplay,
    toggleTask,
    toggleGym,
    logSleep,
    updateNotes,
    resetToday,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    addTodoTag,
    updateTodoTag,
    deleteTodoTag,
    toggleBadHabitClean,
  };
}
