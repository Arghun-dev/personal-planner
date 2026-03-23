import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SleepEntry } from "@/lib/types";

interface SleepDay {
  key: string;
  dayLabel: string;
  hrs: number;
}

interface Props {
  sleepData: SleepDay[];
  todaySleep?: number;
  todaySleepEntry?: SleepEntry;
  plannedWakeTime?: string;
  onOpenModal: () => void;
}

function fmt24to12(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function wakeDeltaLabel(
  planned: string,
  actual: string,
): { label: string; className: string } | null {
  const [pH, pM] = planned.split(":").map(Number);
  const [aH, aM] = actual.split(":").map(Number);
  const delta = aH * 60 + aM - (pH * 60 + pM);
  if (Math.abs(delta) < 5)
    return { label: "on time", className: "text-chart-1" };
  const abs = Math.abs(delta);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const time = [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""]
    .filter(Boolean)
    .join(" ");
  if (delta > 0)
    return {
      label: `+${time} late`,
      className: delta > 30 ? "text-destructive" : "text-yellow-500",
    };
  return { label: `${time} early`, className: "text-chart-1" };
}

export function SleepTracker({
  sleepData,
  todaySleep,
  todaySleepEntry,
  plannedWakeTime,
  onOpenModal,
}: Props) {
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

        {/* Wake time actual vs planned */}
        {todaySleepEntry?.wakeTime && (
          <div className="flex items-end justify-between mt-3 px-0.5">
            <div>
              <div className="font-mono text-[9px] text-muted-foreground tracking-[0.12em] uppercase mb-0.5">
                Woke at
              </div>
              <div className="font-mono text-[16px] font-bold text-foreground leading-none">
                {fmt24to12(todaySleepEntry.wakeTime)}
              </div>
            </div>
            {plannedWakeTime && (
              <div className="text-right">
                <div className="font-mono text-[9px] text-muted-foreground tracking-[0.12em] uppercase mb-0.5">
                  Planned
                </div>
                <div className="font-mono text-[16px] font-bold text-muted-foreground leading-none flex items-baseline gap-1.5">
                  {fmt24to12(plannedWakeTime)}
                  {(() => {
                    const delta = wakeDeltaLabel(
                      plannedWakeTime,
                      todaySleepEntry.wakeTime!,
                    );
                    if (!delta) return null;
                    return (
                      <span
                        className={`font-mono font-bold text-[10px] ${delta.className}`}
                      >
                        {delta.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

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
