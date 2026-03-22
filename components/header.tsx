interface StatChipProps {
  label: string;
  value: string;
  green?: boolean;
}

function StatChip({ label, value, green }: StatChipProps) {
  return (
    <div className="flex flex-col items-end gap-[1px]">
      <span className="font-space-mono text-[9px] tracking-[0.2em] text-dos-text-dim uppercase">
        {label}
      </span>
      <span className={`font-space-mono text-[18px] font-bold leading-none ${green ? 'text-dos-green' : 'text-dos-amber'}`}>
        {value}
      </span>
    </div>
  );
}

interface Props {
  streak:      number;
  score:       number;
  gymCount:    number;
  dateDisplay: string;
}

export function Header({ streak, score, gymCount, dateDisplay }: Props) {
  return (
    <header className="border-b border-dos-border px-8 py-4 flex items-center justify-between sticky top-0 bg-dos-bg z-50">
      <div>
        <div className="font-space-mono text-[11px] tracking-[0.3em] text-dos-amber uppercase">
          DISCIPLINE<span className="text-dos-text-dim"> // </span>OS
        </div>
        <div className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em] mt-[1px]">
          {dateDisplay}
        </div>
      </div>

      <div className="flex gap-8 items-center sm:gap-4">
        <StatChip label="Streak"  value={String(streak)} />
        <StatChip label="Today"   value={`${score}%`} />
        <StatChip label="Gym/wk"  value={`${gymCount}/4`} green />
      </div>
    </header>
  );
}
