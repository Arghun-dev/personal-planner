import { cn } from '@/lib/utils';
import type { TagType } from '@/lib/types';

interface Props {
  time:     string;
  title:    string;
  sub:      string;
  tag:      TagType;
  done:     boolean;
  active:   boolean;
  onToggle: () => void;
}

export function ScheduleBlock({ time, title, sub, tag, done, active, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left border rounded-[4px] mb-2 overflow-hidden transition-colors duration-200 cursor-pointer',
        done
          ? 'border-dos-green-dim bg-dos-green-bg'
          : active
            ? 'border-dos-amber-dim bg-dos-amber-bg shadow-[0_0_0_1px_#7a5510]'
            : 'border-dos-border bg-dos-surface hover:border-dos-border2',
      )}
    >
      <div className="flex items-center gap-4 px-4 py-[0.85rem]">
        {/* Checkbox */}
        <div
          className={cn(
            'w-5 h-5 border-[1.5px] rounded-[2px] flex-shrink-0 flex items-center justify-center transition-all duration-150',
            done ? 'bg-dos-green border-dos-green' : 'border-dos-border2',
          )}
        >
          {done && (
            <div
              className="w-[10px] h-[6px] border-l-2 border-b-2"
              style={{ borderColor: '#0d0f0e', transform: 'rotate(-45deg) translateY(-1px)' }}
            />
          )}
        </div>

        {/* Time */}
        <div
          className={cn(
            'font-space-mono text-[11px] min-w-[100px] tracking-[0.05em]',
            done ? 'text-dos-green' : active ? 'text-dos-amber' : 'text-dos-text-dim',
          )}
        >
          {time}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              'font-barlow font-bold text-[17px] tracking-[0.02em] leading-none mb-[2px]',
              active && !done ? 'text-dos-amber' : 'text-dos-text',
            )}
          >
            {title}
            {active && !done && (
              <span className="ml-2 bg-dos-amber text-dos-bg font-space-mono text-[9px] tracking-[0.15em] px-2 py-[2px] inline-block align-middle dos-pulse">
                NOW
              </span>
            )}
          </div>
          <div className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.05em]">
            {sub}
          </div>
        </div>

        {/* Tag */}
        <span className={`tag-${tag} font-space-mono text-[9px] px-2 py-[3px] rounded-[2px] tracking-[0.15em] uppercase flex-shrink-0`}>
          {tag}
        </span>
      </div>
    </button>
  );
}
