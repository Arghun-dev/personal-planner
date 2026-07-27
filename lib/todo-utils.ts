import type { TodoItem, TodoPriority, TodoTag } from "@/lib/types";

// ── Date helpers ─────────────────────────────────────────────────────────

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getTodayISO(): string {
  return toISO(new Date());
}

export function formatDueDate(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** "Updated 3h ago" / "Updated just now" style relative label for a timestamp. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(
  item: Pick<TodoItem, "done" | "dueDate">,
  today = getTodayISO(),
): boolean {
  return !item.done && !!item.dueDate && item.dueDate < today;
}

/**
 * A task "counts toward today" if it's explicitly due today, or if it has no
 * due date at all (undated tasks are treated as always-actionable backlog).
 * Used by the dashboard's schedule-block breakdown and the compact Tasks
 * widget so both agree on what "today" means.
 */
export function isDueTodayOrUndated(
  item: Pick<TodoItem, "dueDate">,
  today = getTodayISO(),
): boolean {
  return !item.dueDate || item.dueDate === today;
}

// ── Urgency grouping (full task list) ───────────────────────────────────

export type TaskGroupKey = "overdue" | "today" | "upcoming" | "nodate" | "done";

export const TASK_GROUP_ORDER: TaskGroupKey[] = [
  "overdue",
  "today",
  "upcoming",
  "nodate",
  "done",
];

export const TASK_GROUP_LABEL: Record<TaskGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  nodate: "No due date",
  done: "Done",
};

export function getTaskGroup(
  item: Pick<TodoItem, "done" | "dueDate">,
  today = getTodayISO(),
): TaskGroupKey {
  if (item.done) return "done";
  if (!item.dueDate) return "nodate";
  if (item.dueDate < today) return "overdue";
  if (item.dueDate === today) return "today";
  return "upcoming";
}

const PRIORITY_RANK: Record<"none" | TodoPriority, number> = {
  high: 0,
  med: 1,
  none: 2,
};

/** Priority first (high → med → none), then earliest due date, then newest first. */
export function compareTasks(a: TodoItem, b: TodoItem): number {
  const pa = PRIORITY_RANK[a.priority ?? "none"];
  const pb = PRIORITY_RANK[b.priority ?? "none"];
  if (pa !== pb) return pa - pb;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return b.createdAt - a.createdAt;
}

// ── Quick-add shorthand parsing ─────────────────────────────────────────
// "#tag" → tag by name, "!high"/"!med" → priority, "@today"/"@tomorrow"/
// "@mon".."@sun"/"@YYYY-MM-DD" → due date. Matched tokens are stripped from
// the saved text; unmatched ones (e.g. a partial "#" while still typing) are
// left alone.

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface ParsedQuickAdd {
  cleanText: string;
  tagIds: string[];
  matchedTags: TodoTag[];
  priority?: TodoPriority;
  dueDate?: string;
  dueLabel?: string;
}

export function parseQuickAdd(raw: string, tags: TodoTag[]): ParsedQuickAdd {
  let text = raw;
  const tagIds: string[] = [];
  const matchedTags: TodoTag[] = [];
  let priority: TodoPriority | undefined;
  let dueDate: string | undefined;
  let dueLabel: string | undefined;

  text = text.replace(/#([\w-]+)/g, (whole, name: string) => {
    const tag = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) return whole;
    if (!tagIds.includes(tag.id)) {
      tagIds.push(tag.id);
      matchedTags.push(tag);
    }
    return "";
  });

  text = text.replace(/!(\w+)/g, (whole, word: string) => {
    const w = word.toLowerCase();
    if (w === "high" || w === "h") {
      priority = "high";
      return "";
    }
    if (w === "med" || w === "medium" || w === "m") {
      priority = "med";
      return "";
    }
    return whole;
  });

  text = text.replace(/@(\S+)/g, (whole, word: string) => {
    const w = word.toLowerCase();
    const today = new Date();
    if (w === "today") {
      dueDate = toISO(today);
      dueLabel = "Today";
      return "";
    }
    if (w === "tomorrow" || w === "tmrw") {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      dueDate = toISO(d);
      dueLabel = "Tomorrow";
      return "";
    }
    const wdIdx = WEEKDAYS.indexOf(w.slice(0, 3));
    if (wdIdx !== -1) {
      const d = new Date(today);
      let diff = wdIdx - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      dueDate = toISO(d);
      dueLabel = formatDueDate(toISO(d));
      return "";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(w)) {
      dueDate = w;
      dueLabel = formatDueDate(w);
      return "";
    }
    return whole;
  });

  return {
    cleanText: text.replace(/\s+/g, " ").trim(),
    tagIds,
    matchedTags,
    priority,
    dueDate,
    dueLabel,
  };
}
