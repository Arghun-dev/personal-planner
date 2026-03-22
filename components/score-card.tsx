import { SCORE_STATUSES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Props {
  done:  number;
  total: number;
  score: number;
}

export function ScoreCard({ done, total, score }: Props) {
  const statusIdx = Math.min(Math.floor(score / 17), 6);
  const isHigh    = score >= 80;

  return (
    <div className="bg-dos-surface border border-dos-border rounded-[4px] p-5 mb-4">
      <div className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em] uppercase">
        Today&apos;s Completion
      </div>

      <div className={cn('font-space-mono text-[64px] font-bold leading-none my-2', isHigh ? 'text-dos-green' : 'text-dos-amber')}>
        {score}%
      </div>

      <div className="h-[6px] bg-dos-border rounded-[1px] my-3 overflow-hidden">
        <div
          className={cn('h-full rounded-[1px] transition-[width] duration-500', isHigh ? 'bg-dos-green' : 'bg-dos-amber')}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="flex justify-between">
        <span className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em]">
          {SCORE_STATUSES[statusIdx]}
        </span>
        <span className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em]">
          {done}/{total}
        </span>
      </div>
    </div>
  );
}
