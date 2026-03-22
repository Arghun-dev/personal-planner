"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { AppState, TodoItem, TodoTag } from "@/lib/types";
import { getSchedule, DAYS, DAYS_FULL, MONTHS } from "@/lib/constants";

const DEFAULT_STATE: AppState = {
  days: {},
  gym: {},
  sleep: {},
  notes: {},
  todos: { tags: [], items: [] },
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
    localStorage.setItem("personalPlanner", JSON.stringify(newState));
  } catch {
    /* ignore */
  }
}

export function usePersonalPlanner() {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE;
    try {
      const raw = localStorage.getItem("personalPlanner");
      return raw ? (JSON.parse(raw) as AppState) : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => setHydrated(true));
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
  };
}
