export type TagType = "sleep" | "growth" | "work" | "gym" | "meal" | "rest";

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

export interface DayData {
  tasks: Record<string, boolean>;
  completed?: boolean;
}

export interface AppState {
  days: Record<string, DayData>;
  /** weekKey → stringified day index (0-6) → done */
  gym: Record<string, Record<string, boolean>>;
  sleep: Record<string, number>;
  notes: Record<string, string>;
  todos: TodoState;
}
