"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  badHabits: Record<string, boolean>;
  badHabitStreak: number;
  badHabitCleanDays: number;
  onToggle: (dayKey: string) => void;
}

export function BadHabitTracker({
  badHabits,
  badHabitStreak,
  badHabitCleanDays,
  onToggle,
}: Props) {
  // Build last 14 days (oldest first)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (13 - i));
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    return {
      key,
      dayNum: d.getDate(),
      dow: DOW_SHORT[d.getDay()],
      isToday: key === todayKey,
    };
  });

  // Progress toward next streak: days into the current incomplete group of 7
  const progressDays = badHabitCleanDays % 7;
  const barValue = (progressDays / 7) * 100;

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
    badHabitCleanDays === 0
      ? "Mark today clean to start your streak"
      : progressDays === 0
        ? `${badHabitStreak} week${badHabitStreak !== 1 ? "s" : ""} clean — keep going!`
        : `${progressDays}/7 days toward week ${badHabitStreak + 1}`;

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
              clean week{badHabitStreak !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-[24px]">{emoji}</span>
        </div>

        <div className="font-mono text-[10px] text-muted-foreground mb-3">
          {subtitle}
        </div>

        {/* Day grid — 14 days, 7 per row */}
        <div className="grid grid-cols-7 gap-[5px] mb-3">
          {days.map(({ key, dayNum, dow, isToday }) => {
            const clean = !!badHabits[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                title={`${dow} ${dayNum} — ${clean ? "clean ✓" : "not marked"}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 rounded-[2px] border text-center transition-all cursor-pointer",
                  clean
                    ? "bg-primary border-primary text-primary-foreground"
                    : isToday
                      ? "border-primary text-muted-foreground hover:bg-primary/10"
                      : "border-border text-muted-foreground/50 hover:border-muted-foreground",
                )}
              >
                <span className="text-[10px] leading-none">
                  {clean ? "✓" : "○"}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-tight leading-none opacity-70">
                  {dayNum}
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
