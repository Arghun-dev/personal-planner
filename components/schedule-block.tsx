import { cn } from "@/lib/utils";
import type { TagType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "lucide-react";

interface Props {
  time: string;
  title: string;
  sub: string;
  tag: TagType;
  done: boolean;
  active: boolean;
  onToggle: () => void;
}

export function ScheduleBlock({
  time,
  title,
  sub,
  tag,
  done,
  active,
  onToggle,
}: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left border rounded-[4px] mb-2 overflow-hidden transition-colors duration-200 cursor-pointer",
        done
          ? "border-dos-green-dim bg-dos-green-bg"
          : active
            ? "border-dos-amber-dim bg-dos-amber-bg shadow-[0_0_0_1px_var(--dos-amber-dim)]"
            : "border-border bg-card hover:border-input",
      )}
    >
      <div className="flex items-center gap-4 px-4 py-[0.85rem]">
        {/* Checkbox indicator — visual only, no interactive button */}
        <div
          className={cn(
            "size-5 rounded-[3px] flex-shrink-0 border-[1.5px] flex items-center justify-center transition-colors",
            done
              ? "bg-chart-1 border-chart-1 text-white"
              : "border-input bg-transparent",
          )}
        >
          {done && <CheckIcon className="size-3 stroke-[3]" />}
        </div>

        {/* Time */}
        <div
          className={cn(
            "font-mono text-[11px] min-w-[100px] tracking-[0.05em]",
            done
              ? "text-dos-green"
              : active
                ? "text-dos-amber"
                : "text-muted-foreground",
          )}
        >
          {time}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-sans font-bold text-[17px] tracking-[0.02em] leading-none mb-[2px]",
              active && !done ? "text-dos-amber" : "text-foreground",
            )}
          >
            {title}
            {active && !done && (
              <span className="ml-2 bg-dos-amber text-dos-bg font-mono text-[9px] tracking-[0.15em] px-2 py-[2px] inline-block align-middle dos-pulse">
                NOW
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.05em]">
            {sub}
          </div>
        </div>

        {/* Tag */}
        <Badge
          variant="outline"
          className={`tag-${tag} font-mono text-[9px] font-bold tracking-[0.15em] uppercase rounded-[2px] h-auto py-[3px] border-transparent`}
        >
          {tag}
        </Badge>
      </div>
    </button>
  );
}
