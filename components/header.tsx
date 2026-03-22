"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface StatChipProps {
  label: string;
  value: string;
  variant?: "default" | "secondary" | "outline";
}

function StatChip({ label, value, variant = "default" }: StatChipProps) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <Badge
        variant={variant}
        className="font-mono text-[15px] font-bold leading-none h-auto px-2 py-0.5 rounded-[3px]"
      >
        {value}
      </Badge>
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

export function Header({ streak, score, gymCount, badHabitStreak, dateDisplay }: Props) {
  const pathname = usePathname();
  return (
    <header className="px-8 py-4 flex items-center justify-between sticky top-0 bg-background z-50">
      <div className="flex items-center gap-6">
        <div>
          <div className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
            PERSONAL PLANNER
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] mt-px">
            {dateDisplay}
          </div>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-colors ${
              pathname === "/"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Today
          </Link>
          <Link
            href="/todos"
            className={`text-[11px] font-semibold px-3 py-1 rounded-md transition-colors ${
              pathname === "/todos"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            All Tasks
          </Link>
        </nav>
      </div>

      <div className="flex gap-8 items-center sm:gap-4">
        <StatChip label="Streak" value={String(streak)} />
        <StatChip label="Today" value={`${score}%`} />
        <StatChip label="Gym/wk" value={`${gymCount}/5`} variant="secondary" />
        <StatChip label="No habits" value={`${badHabitStreak}w`} variant="outline" />
      </div>
      <Separator className="absolute bottom-0 left-0 right-0" />
    </header>
  );
}
