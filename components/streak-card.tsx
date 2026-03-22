interface Props {
  streak: number;
}

export function StreakCard({ streak }: Props) {
  const flame = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '○';
  const sub   = streak === 0
    ? 'Complete all tasks to start your streak'
    : `${streak} day${streak > 1 ? 's' : ''} of total commitment`;

  return (
    <div className="bg-dos-surface border border-dos-border rounded-[4px] p-5 mb-4 flex items-center gap-4">
      <div className="font-space-mono text-[48px] font-bold text-dos-amber leading-none flex-shrink-0">
        {streak}
      </div>
      <div className="flex-1">
        <div className="font-barlow text-[20px] font-bold tracking-[0.05em] text-dos-text">
          DAYS PERFECT
        </div>
        <div className="font-space-mono text-[10px] text-dos-text-dim mt-[2px]">{sub}</div>
      </div>
      <div className="text-[32px]">{flame}</div>
    </div>
  );
}
