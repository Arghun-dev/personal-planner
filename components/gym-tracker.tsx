import { cn } from '@/lib/utils';
import { DAYS } from '@/lib/constants';

interface Props {
  gymDays:  Record<string, boolean>;
  gymCount: number;
  todayIdx: number;
  onToggle: (idx: number) => void;
}

export function GymTracker({ gymDays, gymCount, todayIdx, onToggle }: Props) {
  const barWidth = Math.min((gymCount / 4) * 100, 100);

  return (
    <div className="bg-dos-surface border border-dos-border rounded-[4px] p-5 mb-4">
      <div className="flex items-baseline gap-2">
        <span className="font-space-mono text-[22px] font-bold text-dos-red">{gymCount}</span>
        <span className="text-dos-text-dim text-[14px] font-barlow">/ 4 sessions this week</span>
      </div>

      <div className="grid grid-cols-7 gap-[6px] my-3">
        {DAYS.map((day, i) => {
          const done = !!gymDays[String(i)];
          return (
            <button
              key={day}
              type="button"
              onClick={() => onToggle(i)}
              className={cn(
                'aspect-square border rounded-[2px] flex flex-col items-center justify-center cursor-pointer transition-all duration-150',
                done
                  ? 'bg-dos-red-bg border-dos-red-dim'
                  : i === todayIdx
                    ? 'border-dos-amber-dim'
                    : 'border-dos-border hover:border-dos-border2',
              )}
            >
              <div className="text-[14px] mb-[1px] leading-none">{done ? '💪' : '○'}</div>
              <div className={cn('font-space-mono text-[9px] uppercase tracking-[0.05em]', done ? 'text-dos-red' : 'text-dos-text-dim')}>
                {day}
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-[6px] bg-dos-border rounded-[1px] mt-2 overflow-hidden">
        <div
          className="h-full rounded-[1px] bg-dos-red transition-[width] duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}
