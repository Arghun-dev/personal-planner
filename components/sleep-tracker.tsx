interface SleepDay {
  key:      string;
  dayLabel: string;
  hrs:      number;
}

interface Props {
  sleepData:   SleepDay[];
  todaySleep?: number;
  onOpenModal: () => void;
}

export function SleepTracker({ sleepData, todaySleep, onOpenModal }: Props) {
  return (
    <div className="bg-dos-surface border border-dos-border rounded-[4px] p-5 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em] uppercase">
            Last Night
          </div>
          <div className="font-space-mono text-[28px] font-bold" style={{ color: '#7070ff' }}>
            {todaySleep != null ? `${todaySleep} hrs` : '— hrs'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-space-mono text-[10px] text-dos-text-dim tracking-[0.15em] uppercase">
            Target
          </div>
          <div className="font-space-mono text-[20px] font-bold text-dos-text-dim">8 hrs</div>
        </div>
      </div>

      {/* Mini bar chart – last 7 days */}
      <div className="grid grid-cols-7 gap-1 mt-3">
        {sleepData.map(({ key, dayLabel, hrs }) => {
          const pct    = Math.min((hrs / 10) * 100, 100);
          const isGoal = hrs >= 8;
          return (
            <div key={key} className="flex flex-col items-center gap-[3px]">
              <div className="h-[40px] w-full bg-dos-border rounded-[1px] flex items-end overflow-hidden">
                <div
                  className="w-full rounded-[1px] transition-[height] duration-300"
                  style={{ height: `${pct}%`, background: isGoal ? '#7070ff' : '#3333aa' }}
                />
              </div>
              <div className="font-space-mono text-[8px] text-dos-text-muted">{dayLabel}</div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenModal}
        className="w-full mt-3 py-3 bg-transparent border border-dos-border2 text-dos-text font-space-mono text-[11px] tracking-[0.1em] cursor-pointer rounded-[2px] transition-all duration-150 hover:bg-dos-surface2 hover:border-dos-amber-dim hover:text-dos-amber"
      >
        LOG LAST NIGHT&apos;S SLEEP
      </button>
    </div>
  );
}
