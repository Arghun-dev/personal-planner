"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { AppState, SleepEntry, TodoItem, TodoTag } from "@/lib/types";
import { getSchedule, DAYS, DAYS_FULL, MONTHS } from "@/lib/constants";
import { loadState, saveState } from "@/lib/actions";

// Built-in tags matching the schedule block tag types. IDs are stable so
// they can be merged without duplication across state loads.
const BUILT_IN_TAGS: TodoTag[] = [
  {
    id: "builtin-sleep",
    name: "sleep",
    color: "bg-violet-100 text-violet-700 border-violet-200",
  },
  {
    id: "builtin-growth",
    name: "growth",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "builtin-work",
    name: "work",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    id: "builtin-gym",
    name: "gym",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  {
    id: "builtin-meal",
    name: "meal",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  {
    id: "builtin-rest",
    name: "rest",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  {
    id: "builtin-other",
    name: "other",
    color: "bg-gray-100 text-gray-600 border-gray-200",
  },
];

function mergeBuiltInTags(tags: TodoTag[]): TodoTag[] {
  // Remove any duplicate tags by name (keep the first occurrence, preferring built-in IDs)
  const seen = new Set<string>();
  const deduped: TodoTag[] = [];

  // Process built-in tags first so their IDs win over old user-created duplicates
  const builtInIds = new Set(BUILT_IN_TAGS.map((t) => t.id));
  const builtInNames = new Set(BUILT_IN_TAGS.map((t) => t.name.toLowerCase()));

  // Add built-in tags that aren't already represented by name in the existing list
  const existingNames = new Set(tags.map((t) => t.name.toLowerCase()));
  for (const bt of BUILT_IN_TAGS) {
    if (!existingNames.has(bt.name.toLowerCase())) {
      seen.add(bt.name.toLowerCase());
      deduped.push(bt);
    }
  }

  // Add existing tags, skipping ones whose name matches a built-in (the built-in wins)
  // and skipping any duplicate names seen so far
  for (const t of tags) {
    const key = t.name.toLowerCase();
    if (builtInNames.has(key) && !builtInIds.has(t.id)) continue; // superseded by built-in
    if (seen.has(key)) continue; // duplicate name
    seen.add(key);
    deduped.push(t);
  }

  return deduped;
}

const DEFAULT_STATE: AppState = {
  days: {},
  gym: {},
  sleep: {},
  notes: {},
  todos: { tags: [...BUILT_IN_TAGS], items: [] },
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

function normalizeSleepEntry(v: number | SleepEntry | undefined): SleepEntry {
  if (v == null) return { hrs: 0 };
  if (typeof v === "number") return { hrs: v };
  return v;
}

function isActiveBlock(start: number, end: number): boolean {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  return start > end ? h >= start || h < end : h >= start && h < end;
}

// A block is "past" when its end time has already passed.
// For overnight blocks (start > end, e.g. 21:00–05:00) past means
// the current time is after end and before start (i.e. the daytime window).
function isPastBlock(start: number, end: number): boolean {
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  if (start > end) {
    return h >= end && h < start;
  }
  return h >= end;
}

function computeBadHabitStreak(state: AppState): {
  streak: number;
  cleanDays: number;
} {
  // Count consecutive clean days going backwards from today
  let cleanDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    if (state.badHabits?.[key]) {
      cleanDays++;
    } else {
      break;
    }
  }
  return { streak: Math.floor(cleanDays / 7), cleanDays };
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
  // Schedule outside React's render cycle to avoid triggering router updates
  // while a setState updater is still executing (causes "update while rendering" warnings).
  setTimeout(() => void saveState(newState), 0);
}

export function usePersonalPlanner() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadState().then((loaded) => {
      if (loaded) {
        const rawTags = loaded.todos?.tags ?? [];
        const mergedTags = mergeBuiltInTags(rawTags);

        // Build a remapping from any removed duplicate IDs → canonical built-in ID
        const survivingIds = new Set(mergedTags.map((t) => t.id));
        const idRemap = new Map<string, string>();
        for (const t of rawTags) {
          if (!survivingIds.has(t.id)) {
            // Find the built-in that replaced it (same name)
            const canonical = mergedTags.find(
              (m) => m.name.toLowerCase() === t.name.toLowerCase(),
            );
            if (canonical) idRemap.set(t.id, canonical.id);
          }
        }

        const remappedItems = (loaded.todos?.items ?? []).map((it) => {
          if (idRemap.size === 0) return it;
          const newTagIds = it.tagIds.map((tid) => idRemap.get(tid) ?? tid);
          const changed = newTagIds.some((id, i) => id !== it.tagIds[i]);
          return changed ? { ...it, tagIds: newTagIds } : it;
        });

        const mergedTodos = {
          ...loaded.todos,
          tags: mergedTags,
          items: remappedItems,
        };
        setState({ ...loaded, todos: mergedTodos });
      }
      startTransition(() => setHydrated(true));
    });
  }, []);

  // Pick the right schedule for today
  const todayKey = getTodayKey();
  const weekKey = getWeekKey();
  const SCHEDULE = getSchedule(new Date().getDay());

  const todayTasks = state.days?.[todayKey]?.tasks ?? {};
  const doneTasks = SCHEDULE.filter((b) => todayTasks[b.id]).length;
  const streak = computeStreak(state);
  const gymDays = state.gym?.[weekKey] ?? {};
  const gymCount = Object.values(gymDays).filter(Boolean).length;
  const rawSleep = state.sleep?.[todayKey];
  const todaySleep =
    rawSleep != null ? normalizeSleepEntry(rawSleep).hrs : undefined;
  const todaySleepEntry =
    rawSleep != null ? normalizeSleepEntry(rawSleep) : undefined;

  const plannedWakeTime = (() => {
    const sleepBlock = SCHEDULE[0];
    if (!sleepBlock) return "05:00";
    const wakeHour = sleepBlock.end;
    const h = Math.floor(wakeHour);
    const m = Math.round((wakeHour - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  })();

  // ── Score ──────────────────────────────────────────────────────────────
  // Primary: block completion (85%). Secondary: wake accuracy (15%), only
  // when wake time is logged and blockRatio > 0 (prevents false baseline).
  // All done + on-time = 100%. All done + no wake logged = 100%.
  const W_BLOCKS = 0.85;
  const W_WAKE = 0.15;

  const blockRatio = SCHEDULE.length > 0 ? doneTasks / SCHEDULE.length : 0;

  const wakeRatio: number | null = (() => {
    if (!todaySleepEntry?.wakeTime) return null;
    const [pH, pM] = plannedWakeTime.split(":").map(Number);
    const [aH, aM] = todaySleepEntry.wakeTime.split(":").map(Number);
    const deltaMin = aH * 60 + aM - (pH * 60 + pM);
    if (deltaMin <= 0) return 1; // early or on-time = perfect
    if (deltaMin >= 120) return 0; // 2h+ late = 0
    return 1 - deltaMin / 120;
  })();

  const includeWake = wakeRatio !== null && blockRatio > 0;
  const availWeight = W_BLOCKS + (includeWake ? W_WAKE : 0);
  const rawScoreSum =
    blockRatio * W_BLOCKS + (includeWake ? wakeRatio! * W_WAKE : 0);

  const score =
    availWeight > 0 ? Math.round((rawScoreSum / availWeight) * 100) : 0;
  // ──────────────────────────────────────────────────────────────────────
  const notes = state.notes?.[todayKey] ?? "";
  const todos = state.todos ?? { tags: [], items: [] };
  const badHabits = state.badHabits ?? {};
  const { streak: badHabitStreak, cleanDays: badHabitCleanDays } =
    computeBadHabitStreak(state);

  const scheduleWithState = SCHEDULE.map((block) => ({
    ...block,
    done: !!todayTasks[block.id],
    active: isActiveBlock(block.start, block.end),
    past: isPastBlock(block.start, block.end),
  }));

  const sleepData = (() => {
    const d = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(d);
      day.setDate(d.getDate() - (6 - i));
      const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
      const hrs = normalizeSleepEntry(state.sleep?.[key]).hrs;
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

  const logSleep = useCallback((entry: SleepEntry) => {
    setState((prev) => {
      const key = getTodayKey();
      const next: AppState = {
        ...prev,
        sleep: { ...prev.sleep, [key]: entry },
      };
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
    (text: string, tagIds: string[], link?: string, dueDate?: string) => {
      setState((prev) => {
        const todos = prev.todos ?? { tags: [], items: [] };
        const item: TodoItem = {
          id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text,
          done: false,
          tagIds,
          createdAt: Date.now(),
          ...(link ? { link } : {}),
          ...(dueDate ? { dueDate } : {}),
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
      patch: Partial<Pick<TodoItem, "text" | "tagIds" | "link" | "dueDate">>,
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

  const reorderTodoItems = useCallback((fromId: string, toId: string) => {
    setState((prev) => {
      const todos = prev.todos ?? { tags: [], items: [] };
      const items = [...todos.items];
      const fromIdx = items.findIndex((it) => it.id === fromId);
      const toIdx = items.findIndex((it) => it.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      const next: AppState = { ...prev, todos: { ...todos, items } };
      persist(next);
      return next;
    });
  }, []);

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
  const logWakeTime = useCallback((time: string) => {
    setState((prev) => {
      const key = getTodayKey();
      const existing = normalizeSleepEntry(prev.sleep?.[key]);
      const next: AppState = {
        ...prev,
        sleep: { ...prev.sleep, [key]: { ...existing, wakeTime: time } },
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
    todaySleepEntry,
    plannedWakeTime,
    notes,
    todos,
    badHabits,
    badHabitStreak,
    badHabitCleanDays,
    dateDisplay,
    toggleTask,
    toggleGym,
    logSleep,
    logWakeTime,
    updateNotes,
    resetToday,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    reorderTodoItems,
    addTodoTag,
    updateTodoTag,
    deleteTodoTag,
    toggleBadHabitClean,
  };
}
