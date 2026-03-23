"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SleepEntry } from "@/lib/types";

interface Props {
  open: boolean;
  onSave: (entry: SleepEntry) => void;
  onClose: () => void;
  currentEntry?: SleepEntry;
}

function calcHrsFromTimes(bedTime: string, wakeTime: string): number | null {
  if (!bedTime || !wakeTime) return null;
  const [bH, bM] = bedTime.split(":").map(Number);
  const [wH, wM] = wakeTime.split(":").map(Number);
  const bedMins = bH * 60 + bM;
  let wakeMins = wH * 60 + wM;
  if (wakeMins <= bedMins) wakeMins += 24 * 60; // overnight
  return Math.round(((wakeMins - bedMins) / 60) * 10) / 10;
}

export function SleepModal({ open, onSave, onClose, currentEntry }: Props) {
  const [bedTime, setBedTime] = useState(currentEntry?.bedTime ?? "");
  const [wakeTime, setWakeTime] = useState(currentEntry?.wakeTime ?? "");
  // null = auto-calc from times; number = manually overridden
  const [hrsOverride, setHrsOverride] = useState<number | null>(null);

  const autoHrs = calcHrsFromTimes(bedTime, wakeTime);
  const hrs =
    hrsOverride !== null ? hrsOverride : (autoHrs ?? currentEntry?.hrs ?? 8);
  const autoCalc = hrsOverride === null && autoHrs !== null;

  function handleSave() {
    const entry: SleepEntry = {
      hrs,
      ...(bedTime ? { bedTime } : {}),
      ...(wakeTime ? { wakeTime } : {}),
    };
    onSave(entry);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent showCloseButton={false} className="rounded-lg w-85">
        <DialogHeader>
          <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            {"// Log Sleep"}
          </div>
          <DialogTitle className="font-sans text-[18px] font-semibold">
            Last night&apos;s sleep
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Bed time
              </label>
              <Input
                type="time"
                value={bedTime}
                onChange={(e) => {
                  setBedTime(e.target.value);
                  setHrsOverride(null);
                }}
                className="font-mono text-[13px] rounded-[2px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Wake time
              </label>
              <Input
                type="time"
                value={wakeTime}
                onChange={(e) => {
                  setWakeTime(e.target.value);
                  setHrsOverride(null);
                }}
                className="font-mono text-[13px] rounded-[2px]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
              Hours slept
              {autoCalc && (
                <span className="normal-case font-sans text-[10px] text-primary/60">
                  auto-calculated
                </span>
              )}
            </label>
            <Input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={hrs}
              onChange={(e) => setHrsOverride(parseFloat(e.target.value))}
              className="font-mono text-[20px] text-center rounded-[2px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="font-mono text-[10px] tracking-widest"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            className="font-mono text-[12px] tracking-[0.15em]"
          >
            SAVE SLEEP LOG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
