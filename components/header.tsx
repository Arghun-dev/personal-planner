import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface StatChipProps {
  label: string;
  value: string;
  variant?: "default" | "secondary" | "outline";
}

function StatChip({ label, value, variant = "default" }: StatChipProps) {
  return (
    <div className="flex flex-col items-end gap-[2px]">
      <span className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
        {label}
      </span>
      <Badge
        variant={variant}
        className="font-mono text-[15px] font-bold leading-none h-auto px-2 py-[2px] rounded-[3px]"
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
  dateDisplay: string;
}

export function Header({ streak, score, gymCount, dateDisplay }: Props) {
  return (
    <header className="px-8 py-4 flex items-center justify-between sticky top-0 bg-background z-50">
      <div>
        <div className="font-mono text-[11px] tracking-[0.3em] text-primary uppercase">
          PERSONAL<span className="text-muted-foreground"> // </span>PLANNER
        </div>
        <div className="font-mono text-[10px] text-muted-foreground tracking-[0.15em] mt-[1px]">
          {dateDisplay}
        </div>
      </div>

      <div className="flex gap-8 items-center sm:gap-4">
        <StatChip label="Streak" value={String(streak)} />
        <StatChip label="Today" value={`${score}%`} />
        <StatChip label="Gym/wk" value={`${gymCount}/4`} variant="secondary" />
      </div>
      <Separator className="absolute bottom-0 left-0 right-0" />
    </header>
  );
}
