import { Card, CardContent } from "@/components/ui/card";

interface Props {
  streak: number;
}

export function StreakCard({ streak }: Props) {
  const flame = streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "○";
  const sub =
    streak === 0
      ? "Complete all tasks to start your streak"
      : `${streak} day${streak > 1 ? "s" : ""} of total commitment`;

  return (
    <Card className="mb-4 rounded-[4px] gap-0">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="font-mono text-[48px] font-bold text-primary leading-none flex-shrink-0">
          {streak}
        </div>
        <div className="flex-1">
          <div className="font-sans text-[20px] font-bold tracking-[0.05em] text-foreground">
            DAYS PERFECT
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-[2px]">
            {sub}
          </div>
        </div>
        <div className="text-[32px]">{flame}</div>
      </CardContent>
    </Card>
  );
}
