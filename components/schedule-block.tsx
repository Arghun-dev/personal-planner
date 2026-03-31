import { cn } from "@/lib/utils";
import type { TagType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, MinusIcon, XIcon } from "lucide-react";

export type BlockStatus =
  | "future" // hasn't started yet
  | "active" // currently running
  | "prompting" // past, grace period, needs attention
  | "done" // fully completed (green)
  | "partial" // partially completed (yellow)
  | "failed"; // missed / not completed (red)

interface Props {
  time: string;
  title: string;
  sub: string;
  tag: TagType;
  status: BlockStatus;
  /** Whether the user can manually toggle this block */
  interactive: boolean;
  /** Current time label shown inside the active block */
  nowTime?: string;
  onToggle: () => void;
}

function StatusCheckbox({ status }: { status: BlockStatus }) {
  if (status === "done") {
    return (
      <div className="size-5 rounded-[3px] shrink-0 border-[1.5px] flex items-center justify-center bg-chart-1 border-chart-1 text-white transition-colors">
        <CheckIcon className="size-3 stroke-3" />
      </div>
    );
  }
  if (status === "partial") {
    return (
      <div className="size-5 rounded-[3px] shrink-0 border-[1.5px] flex items-center justify-center bg-yellow-400 border-yellow-400 text-white transition-colors">
        <MinusIcon className="size-3 stroke-3" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="size-5 rounded-[3px] shrink-0 border-[1.5px] flex items-center justify-center bg-destructive border-destructive text-white transition-colors">
        <XIcon className="size-3 stroke-3" />
      </div>
    );
  }
  // future / active / prompting — empty box
  return (
    <div className="size-5 rounded-[3px] shrink-0 border-[1.5px] border-input bg-transparent transition-colors" />
  );
}

export function ScheduleBlock({
  time,
  title,
  sub,
  tag,
  status,
  interactive,
  nowTime,
  onToggle,
}: Props) {
  const isActive = status === "active";
  const isPrompting = status === "prompting";
  const isDone = status === "done";
  const isPartial = status === "partial";
  const isFailed = status === "failed";

  return (
    <button
      type="button"
      onClick={interactive ? onToggle : undefined}
      disabled={!interactive}
      className={cn(
        "w-full text-left border rounded-lg mb-0 overflow-hidden transition-colors duration-200",
        interactive ? "cursor-pointer" : "cursor-default",
        isPrompting && "block-bump",
        isDone
          ? "border-dos-green-dim bg-dos-green-bg"
          : isPartial
            ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
            : isFailed
              ? "border-destructive/40 bg-destructive/5"
              : isActive
                ? "border-dos-amber-dim bg-dos-amber-bg shadow-[0_0_0_1px_var(--dos-amber-dim)]"
                : isPrompting
                  ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20"
                  : "border-border bg-card hover:border-input",
        !interactive &&
          !isActive &&
          !isDone &&
          !isPartial &&
          !isFailed &&
          !isPrompting
          ? "opacity-60"
          : "",
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-[0.85rem]">
        <StatusCheckbox status={status} />

        {/* Time */}
        <div
          className={cn(
            "font-mono text-[10px] sm:text-[11px] min-w-19 sm:min-w-25 tracking-[0.05em]",
            isDone
              ? "text-dos-green"
              : isActive
                ? "text-dos-amber"
                : isPrompting
                  ? "text-orange-500"
                  : isFailed
                    ? "text-destructive"
                    : "text-muted-foreground",
          )}
        >
          {time}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "font-sans font-bold text-[15px] sm:text-[17px] tracking-[0.02em] leading-none mb-0.5",
              isActive && "text-dos-amber",
              isPrompting && "text-orange-600 dark:text-orange-400",
            )}
          >
            {title}
            {isActive && (
              <span className="ml-2 bg-dos-amber text-dos-bg font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 inline-block align-middle dos-pulse">
                NOW
              </span>
            )}
            {isPrompting && (
              <span className="ml-2 bg-orange-400 text-white font-mono text-[9px] tracking-[0.15em] px-2 py-0.5 inline-block align-middle">
                LOG IT
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground tracking-[0.05em]">
            {sub}
          </div>
          {nowTime && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="size-1.5 rounded-full bg-dos-amber/60 shrink-0" />
              <span className="font-mono text-[10px] text-dos-amber/70 tracking-[0.08em]">
                {nowTime}
              </span>
            </div>
          )}
        </div>

        {/* Tag */}
        <Badge
          variant="outline"
          className={`tag-${tag} font-mono text-[9px] font-bold tracking-[0.15em] uppercase rounded-[2px] h-auto py-0.75 border-transparent`}
        >
          {tag}
        </Badge>
      </div>
    </button>
  );
}
