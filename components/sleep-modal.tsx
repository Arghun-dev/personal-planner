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

interface Props {
  open: boolean;
  onSave: (hrs: number) => void;
  onClose: () => void;
}

export function SleepModal({ open, onSave, onClose }: Props) {
  const [value, setValue] = useState(8);

  function handleSave() {
    const hrs = Number(value);
    if (!isNaN(hrs)) onSave(hrs);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="rounded-[4px] w-[320px]"
      >
        <DialogHeader>
          <div className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
            {"// Log Sleep"}
          </div>
          <DialogTitle className="font-sans text-[18px] font-semibold">
            Hours slept
          </DialogTitle>
        </DialogHeader>

        <Input
          type="number"
          min={0}
          max={12}
          step={0.5}
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="font-mono text-[20px] text-center rounded-[2px]"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="font-mono text-[10px] tracking-[0.1em]"
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
