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
    <Card className="mb-4 gap-0">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 shrink-0">
          <div className="font-mono text-3xl sm:text-[36px] font-bold text-primary leading-none">
            {streak}
          </div>
        </div>
        <div className="flex-1">
          <div className="font-sans text-[17px] sm:text-[20px] font-bold tracking-[0.05em] text-foreground">
            DAYS PERFECT
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-[2px]">
            {sub}
          </div>
        </div>
        <div className="text-2xl sm:text-[32px]">{flame}</div>
      </CardContent>
    </Card>
  );
}
