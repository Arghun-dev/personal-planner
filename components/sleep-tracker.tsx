import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SleepDay {
  key: string;
  dayLabel: string;
  hrs: number;
}

interface Props {
  sleepData: SleepDay[];
  todaySleep?: number;
  onOpenModal: () => void;
}

export function SleepTracker({ sleepData, todaySleep, onOpenModal }: Props) {
  return (
    <Card className="mb-4 rounded-[4px] gap-0">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
              Last Night
            </div>
            <div className="font-mono text-[28px] font-bold text-primary">
              {todaySleep != null ? `${todaySleep} hrs` : "— hrs"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
              Target
            </div>
            <div className="font-mono text-[20px] font-bold text-muted-foreground">
              8 hrs
            </div>
          </div>
        </div>

        {/* Mini bar chart – last 7 days */}
        <div className="grid grid-cols-7 gap-1 mt-3">
          {sleepData.map(({ key, dayLabel, hrs }) => {
            const pct = Math.min((hrs / 10) * 100, 100);
            const isGoal = hrs >= 8;
            return (
              <div key={key} className="flex flex-col items-center gap-[3px]">
                <div className="h-[40px] w-full bg-border rounded-[1px] flex items-end overflow-hidden">
                  <div
                    className="w-full rounded-[1px] transition-[height] duration-300"
                    style={{
                      height: `${pct}%`,
                      background: isGoal
                        ? "var(--color-primary)"
                        : "color-mix(in oklch, var(--color-primary) 40%, var(--color-background))",
                    }}
                  />
                </div>
                <div className="font-mono text-[8px] text-muted-foreground/60">
                  {dayLabel}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full mt-3 font-mono text-[11px] tracking-[0.1em] hover:border-primary hover:text-primary"
          onClick={onOpenModal}
        >
          LOG LAST NIGHT&apos;S SLEEP
        </Button>
      </CardContent>
    </Card>
  );
}
