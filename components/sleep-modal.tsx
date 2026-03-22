'use client';

import { useState } from 'react';

interface Props {
  open:    boolean;
  onSave:  (hrs: number) => void;
  onClose: () => void;
}

export function SleepModal({ open, onSave, onClose }: Props) {
  const [value, setValue] = useState(8);

  if (!open) return null;

  function handleSave() {
    const hrs = Number(value);
    if (!isNaN(hrs)) onSave(hrs);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-dos-surface border border-dos-border2 rounded-[4px] p-6 w-[320px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="font-space-mono text-[11px] tracking-[0.2em] text-dos-text-dim mb-4 uppercase">
          {'// Log Sleep'}
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="font-barlow text-[16px] font-semibold text-dos-text">Hours slept</span>
          <input
            type="number"
            min={0}
            max={12}
            step={0.5}
            value={value}
            onChange={e => setValue(parseFloat(e.target.value))}
            className="bg-dos-surface2 border border-dos-border2 text-dos-text font-space-mono text-[20px] w-[80px] py-2 text-center rounded-[2px] outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 bg-dos-amber border-none text-dos-bg font-space-mono text-[12px] font-bold tracking-[0.15em] cursor-pointer rounded-[2px] mt-2 hover:opacity-90"
        >
          SAVE SLEEP LOG
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 mt-2 bg-transparent border border-dos-border text-dos-text-dim font-space-mono text-[10px] cursor-pointer rounded-[2px] tracking-[0.1em] hover:bg-dos-surface2"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
