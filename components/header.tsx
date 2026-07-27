"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

interface StatChipProps {
  label: string;
  value: string;
  dotClassName?: string;
  className?: string;
}

function StatChip({ label, value, dotClassName, className }: StatChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full bg-muted/70 pl-2.5 pr-3 py-1.5",
        className,
      )}
    >
      {dotClassName && (
        <span className={cn("size-1.5 rounded-full shrink-0", dotClassName)} />
      )}
      <div className="flex flex-col leading-none gap-0.5">
        <span className="font-mono text-[8px] tracking-[0.18em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="font-mono text-[14px] font-bold leading-none text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

interface Props {
  streak: number;
  score: number;
  gymCount: number;
  badHabitStreak: number;
  dateDisplay: string;
}

export function Header({
  streak,
  score,
  gymCount,
  badHabitStreak,
  dateDisplay,
}: Props) {
  const pathname = usePathname();
  return (
    <header className="px-4 sm:px-8 py-3 sm:py-4 sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border/70 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-primary-foreground shrink-0 shadow-[0_4px_10px_-4px_var(--primary)]">
              <LogoMark className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.28em] text-foreground uppercase leading-none">
                Personal Planner
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-muted-foreground tracking-[0.15em] mt-1 truncate">
                {dateDisplay}
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-muted/60 rounded-full p-1">
            <Link
              href="/"
              className={`text-[11px] font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all ${
                pathname === "/"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </Link>
            <Link
              href="/todos"
              className={`text-[11px] font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all ${
                pathname === "/todos"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasks
            </Link>
            <Link
              href="/dashboard"
              className={`text-[11px] font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all ${
                pathname === "/dashboard"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Stats
            </Link>
            <Link
              href="/knowledge"
              className={`text-[11px] font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all ${
                pathname === "/knowledge" || pathname.startsWith("/todos/")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Knowledge
            </Link>
          </nav>
        </div>

        <div className="flex gap-1.5 sm:gap-2 items-center shrink-0">
          <StatChip
            label="Streak"
            value={String(streak)}
            dotClassName="bg-primary"
          />
          <StatChip
            label="Today"
            value={`${score}%`}
            dotClassName="bg-chart-1"
          />
          <StatChip
            label="Gym"
            value={`${gymCount}/5`}
            dotClassName="bg-destructive"
            className="hidden sm:flex"
          />
          <StatChip
            label="Habits"
            value={`${badHabitStreak}w`}
            dotClassName="bg-chart-3"
            className="hidden sm:flex"
          />
        </div>
      </div>
    </header>
  );
}
