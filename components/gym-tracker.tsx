import { cn } from "@/lib/utils";
import { DAYS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Props {
  gymDays: Record<string, boolean | "skipped">;
  gymCount: number;
  todayIdx: number;
  onToggle: (idx: number) => void;
}

export function GymTracker({ gymDays, gymCount, todayIdx, onToggle }: Props) {
  const barWidth = Math.min((gymCount / 5) * 100, 100);

  return (
    <Card className="mb-4 rounded-[4px] gap-0">
      <CardContent className="p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[22px] font-bold text-destructive">
            {gymCount}
          </span>
          <span className="text-muted-foreground text-[14px] font-sans">
            / 5 sessions this week
          </span>
        </div>

        <div className="grid grid-cols-7 gap-[6px] my-3">
          {DAYS.map((day, i) => {
            const val = gymDays[String(i)];
            const done = val === true;
            const skipped = val === "skipped";
            return (
              <Button
                key={day}
                type="button"
                variant={done ? "destructive" : "outline"}
                size="icon"
                onClick={() => onToggle(i)}
                className={cn(
                  "h-auto aspect-square flex-col gap-0 py-2 rounded-[2px] font-normal",
                  i === todayIdx && !done && !skipped && "border-primary",
                  skipped && "border-destructive text-destructive",
                )}
              >
                <div className="text-[14px] mb-[1px] leading-none">
                  {done ? "💪" : skipped ? "✕" : "○"}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.05em]">
                  {day}
                </div>
              </Button>
            );
          })}
        </div>

        <Progress
          value={barWidth}
          className="mt-2 h-[6px] rounded-[1px] [&_[data-slot=progress-indicator]]:bg-destructive"
        />
      </CardContent>
    </Card>
  );
}
