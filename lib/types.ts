export type TagType =
  | "sleep"
  | "growth"
  | "work"
  | "gym"
  | "meal"
  | "rest"
  | "other";

// ── Todo Manager ───────────────────────────────────────────────────────────
export interface TodoTag {
  id: string;
  name: string;
  color: string; // tailwind bg color token, e.g. "bg-violet-100 text-violet-700"
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  tagIds: string[];
  createdAt: number;
  link?: string;
  /** ISO date "YYYY-MM-DD". Optional — only set when user picks a due date. */
  dueDate?: string;
}

export interface TodoState {
  tags: TodoTag[];
  items: TodoItem[];
}
// ───────────────────────────────────────────────────────────────────────────

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  sub: string;
  tag: TagType;
  /** Hour in 24h decimal, e.g. 5.75 = 05:45 */
  start: number;
  end: number;
}

export interface SleepEntry {
  hrs: number;
  /** "22:00" in 24-h format */
  bedTime?: string;
  /** "06:00" in 24-h format */
  wakeTime?: string;
}

export interface DayData {
  tasks: Record<string, boolean>;
  completed?: boolean;
}

export interface AppState {
  days: Record<string, DayData>;
  /** weekKey → stringified day index (0-6) → done | "skipped" */
  gym: Record<string, Record<string, boolean | "skipped">>;
  /** Backward-compatible: old entries are plain numbers, new entries are SleepEntry */
  sleep: Record<string, number | SleepEntry>;
  notes: Record<string, string>;
  todos: TodoState;
  /**
   * Bad-habit tracking: weekKey → true means the user stayed clean that entire week
   * (they mark it manually at week end). Streak = consecutive clean weeks.
   */
  badHabits: Record<string, boolean>;
}
