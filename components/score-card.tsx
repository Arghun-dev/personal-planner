import { SCORE_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Props {
  done: number;
  total: number;
  score: number;
}

export function ScoreCard({ done, total, score }: Props) {
  const statusIdx = Math.min(Math.floor(score / 17), 6);
  const isHigh = score >= 80;

  return (
    <Card className="mb-4 rounded-[4px] gap-0">
      <CardContent className="p-5">
        <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
          Today&apos;s Completion
        </div>

        <div
          className={cn(
            "font-mono text-5xl sm:text-[64px] font-bold leading-none my-2",
            isHigh ? "text-chart-1" : "text-primary",
          )}
        >
          {score}%
        </div>

        <Progress
          value={score}
          className={cn(
            "my-3 h-[6px] rounded-[1px]",
            isHigh && "[&_[data-slot=progress-indicator]]:bg-chart-1",
          )}
        />

        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-muted-foreground tracking-[0.15em]">
            {SCORE_STATUSES[statusIdx]}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-[0.15em]">
            {done}/{total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
