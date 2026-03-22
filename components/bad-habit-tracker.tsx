"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** Returns the Monday ISO date string for the week containing the given date */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay() || 7; // Sun=7
  d.setDate(d.getDate() - dow + 1);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Short label like "Mar 10" for a weekKey "2026-3-10" */
function weekLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface Props {
  badHabits: Record<string, boolean>;
  badHabitStreak: number;
  onToggle: (weekKey: string) => void;
}

const TARGET_WEEKS = 4; // visual target on the progress bar (4 weeks = 1 month)

export function BadHabitTracker({
  badHabits,
  badHabitStreak,
  onToggle,
}: Props) {
  // Build last 8 weeks (most recent last)
  const weeks: { key: string; label: string; isCurrent: boolean }[] = [];
  const today = new Date();
  const currentWeekKey = getWeekKey(today);

  for (let i = 7; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const key = getWeekKey(d);
    weeks.push({
      key,
      label: weekLabel(key),
      isCurrent: key === currentWeekKey,
    });
  }

  const barValue = Math.min((badHabitStreak / TARGET_WEEKS) * 100, 100);

  const emoji =
    badHabitStreak >= 12
      ? "🏆"
      : badHabitStreak >= 8
        ? "💎"
        : badHabitStreak >= 4
          ? "🔥"
          : badHabitStreak >= 1
            ? "⚡"
            : "○";

  const subtitle =
    badHabitStreak === 0
      ? "Mark this week clean to start your streak"
      : badHabitStreak === 1
        ? "1 clean week — keep going!"
        : `${badHabitStreak} consecutive clean weeks`;

  return (
    <Card className="mb-4 rounded-[4px] gap-0">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[22px] font-bold text-primary">
              {badHabitStreak}
            </span>
            <span className="text-muted-foreground text-[14px] font-sans">
              / {TARGET_WEEKS} week target
            </span>
          </div>
          <span className="text-[24px]">{emoji}</span>
        </div>

        <div className="font-mono text-[10px] text-muted-foreground mb-3">
          {subtitle}
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-8 gap-[5px] mb-3">
          {weeks.map(({ key, label, isCurrent }) => {
            const clean = !!badHabits[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                title={`Week of ${label} — ${clean ? "clean ✓" : "not marked"}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-[2px] border text-center transition-all cursor-pointer",
                  clean
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary text-muted-foreground hover:bg-primary/10"
                      : "border-border text-muted-foreground/50 hover:border-muted-foreground",
                )}
              >
                <span className="text-[10px] leading-none">
                  {clean ? "✓" : "○"}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-tight leading-none opacity-70">
                  {label.split(" ")[1]}
                </span>
              </button>
            );
          })}
        </div>

        <Progress value={barValue} className="h-[6px] rounded-[1px]" />
      </CardContent>
    </Card>
  );
}
