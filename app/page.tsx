"use client";

import { useState, useEffect } from "react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { Header } from "@/components/header";
import { SectionLabel } from "@/components/section-label";
import { ScheduleBlock } from "@/components/schedule-block";
import type { BlockStatus } from "@/components/schedule-block";
import { ScoreCard } from "@/components/score-card";
import { StreakCard } from "@/components/streak-card";
import { GymTracker } from "@/components/gym-tracker";
import { SleepTracker } from "@/components/sleep-tracker";
import { SleepModal } from "@/components/sleep-modal";
import { TodoManager } from "@/components/todo-manager";
import { BadHabitTracker } from "@/components/bad-habit-tracker";
import { cn } from "@/lib/utils";
import { ClockIcon, CircleIcon } from "lucide-react";

function getTodayWeekIdx(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

/** Grace period in minutes after a block ends before it becomes "failed" */
const GRACE_MINS = 60;

function nowH() {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60;
}

/** Minutes since a block's end time passed (negative = not yet past) */
function minsSincePast(end: number, start: number): number {
  const h = nowH();
  if (start > end) {
    if (h >= end && h < start) return (h - end) * 60;
    return -1;
  }
  if (h >= end) return (h - end) * 60;
  return -1;
}

function isBlockActive(start: number, end: number): boolean {
  const h = nowH();
  return start > end ? h >= start || h < end : h >= start && h < end;
}

function isBlockPast(start: number, end: number): boolean {
  const h = nowH();
  if (start > end) return h >= end && h < start;
  return h >= end;
}

function WakeDelta({ actual, planned }: { actual: string; planned: string }) {
  const [aH, aM] = actual.split(":").map(Number);
  const [pH, pM] = planned.split(":").map(Number);
  const delta = aH * 60 + aM - (pH * 60 + pM);
  if (Math.abs(delta) < 5)
    return (
      <span className="font-mono text-[10px] text-chart-1 ml-auto">
        on time
      </span>
    );
  const abs = Math.abs(delta);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const t = [h > 0 ? `${h}h` : "", m > 0 ? `${m}m` : ""]
    .filter(Boolean)
    .join(" ");
  if (delta > 0)
    return (
      <span
        className={`font-mono text-[10px] ml-auto ${
          delta > 30 ? "text-destructive" : "text-yellow-500"
        }`}
      >
        +{t} late
      </span>
    );
  return (
    <span className="font-mono text-[10px] text-chart-1 ml-auto">
      {t} early
    </span>
  );
}

export default function Home() {
  const {
    hydrated,
    scheduleWithState,
    doneTasks,
    total,
    score,
    streak,
    gymDays,
    gymCount,
    sleepData,
    todaySleep,
    todaySleepEntry,
    plannedWakeTime,
    todos,
    badHabits,
    badHabitStreak,
    dateDisplay,
    toggleTask,
    toggleGym,
    logSleep,
    logWakeTime,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    reorderTodoItems,
    addTodoTag,
    updateTodoTag,
    deleteTodoTag,
    toggleBadHabitClean,
  } = usePersonalPlanner();

  const [sleepModalOpen, setSleepModalOpen] = useState(false);

  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={streak}
        score={score}
        gymCount={gymCount}
        dateDisplay={dateDisplay}
        badHabitStreak={badHabitStreak}
      />

      <main className="max-w-[1100px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <SectionLabel>today&apos;s protocol</SectionLabel>

          <div>
            {(() => {
              const n = new Date();
              const rawH = n.getHours();
              const nowLabel = `${rawH % 12 || 12}:${String(n.getMinutes()).padStart(2, "0")} ${rawH < 12 ? "AM" : "PM"}`;

              // Wake delay: how many hours late the user woke up (0 if on time / early)
              const wakeDelayH = (() => {
                if (!todaySleepEntry?.wakeTime || !plannedWakeTime) return 0;
                const [pH, pM] = plannedWakeTime.split(":").map(Number);
                const [aH, aM] = todaySleepEntry.wakeTime
                  .split(":")
                  .map(Number);
                const delayMins = aH * 60 + aM - (pH * 60 + pM);
                return delayMins > 0 ? delayMins / 60 : 0;
              })();

              return scheduleWithState.map((block) => {
                const blockTagIds = todos.tags
                  .filter((t) => t.name.toLowerCase() === block.tag)
                  .map((t) => t.id);
                const blockTasks = todos.items.filter((it) =>
                  it.tagIds.some((tid) => blockTagIds.includes(tid)),
                );
                const hasWakeRow = block.id === "s1" || block.id === "w1";
                const hasTasks = blockTasks.length > 0;
                const hasSubItems = hasWakeRow || hasTasks;

                // For wake/commute blocks, shift effective times by actual delay
                const isWakeBlock = block.id === "s1" || block.id === "w1";
                const effectiveStart = isWakeBlock
                  ? block.start + wakeDelayH
                  : block.start;
                const effectiveEnd = isWakeBlock
                  ? block.end + wakeDelayH
                  : block.end;
                const effectiveActive = isWakeBlock
                  ? isBlockActive(effectiveStart, effectiveEnd)
                  : block.active;
                const effectivePast = isWakeBlock
                  ? isBlockPast(effectiveStart, effectiveEnd)
                  : block.past;

                // ── Compute block status ──────────────────────────────────────────────────────
                let status: BlockStatus;
                let interactive = false;

                if (effectiveActive) {
                  status = "active";
                } else if (!effectivePast) {
                  status = "future";
                } else {
                  const minsLate = minsSincePast(effectiveEnd, effectiveStart);

                  if (isWakeBlock) {
                    // Status driven purely by wake delay vs target — never manual
                    if (!todaySleepEntry?.wakeTime) {
                      // No wake time logged yet
                      status = minsLate > GRACE_MINS ? "failed" : "prompting";
                    } else {
                      const delayMins = wakeDelayH * 60;
                      if (delayMins <= 15) status = "done";
                      else if (delayMins <= 30) status = "partial";
                      else status = "failed";
                    }
                  } else if (block.tag === "sleep") {
                    if (!todaySleepEntry || todaySleepEntry.hrs === 0) {
                      status = minsLate > GRACE_MINS ? "failed" : "prompting";
                    } else {
                      const ratio = todaySleepEntry.hrs / 8;
                      if (ratio >= 1) status = "done";
                      else if (ratio >= 0.5) status = "partial";
                      else status = "failed";
                    }
                  } else if (block.tag === "work") {
                    if (blockTasks.length === 0) {
                      if (block.done) status = "done";
                      else if (minsLate > GRACE_MINS) status = "failed";
                      else status = "prompting";
                      interactive = !block.done;
                    } else {
                      const doneCount = blockTasks.filter((t) => t.done).length;
                      if (doneCount === blockTasks.length) status = "done";
                      else if (doneCount > 0) status = "partial";
                      else
                        status = minsLate > GRACE_MINS ? "failed" : "prompting";
                    }
                  } else if (block.tag === "growth") {
                    // Status is always system-controlled for growth blocks — never interactive.
                    // Derived exclusively from tasks tagged "growth".
                    if (blockTasks.length === 0) {
                      status = minsLate > GRACE_MINS ? "failed" : "prompting";
                    } else {
                      const doneCount = blockTasks.filter((t) => t.done).length;
                      if (doneCount === blockTasks.length) status = "done";
                      else if (doneCount > 0) status = "partial";
                      else
                        status = minsLate > GRACE_MINS ? "failed" : "prompting";
                    }
                  } else if (hasTasks) {
                    const doneCount = blockTasks.filter((t) => t.done).length;
                    if (doneCount === blockTasks.length) status = "done";
                    else if (doneCount > 0) status = "partial";
                    else
                      status = minsLate > GRACE_MINS ? "failed" : "prompting";
                  } else {
                    if (block.done) {
                      status = "done";
                      interactive = true;
                    } else if (minsLate > GRACE_MINS) {
                      status = "failed";
                      interactive = true;
                    } else {
                      status = "prompting";
                      interactive = true;
                    }
                  }
                }

                return (
                  <div key={block.id} className="mb-2">
                    <ScheduleBlock
                      time={block.time}
                      title={block.title}
                      sub={block.sub}
                      tag={block.tag}
                      status={status}
                      interactive={interactive}
                      nowTime={effectiveActive ? nowLabel : undefined}
                      onToggle={() => toggleTask(block.id)}
                    />
                    {hasSubItems && (
                      <div className="ml-4 pl-3 border-l-2 border-border/50 mt-0.5 space-y-0">
                        {hasWakeRow && (
                          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-r-md">
                            <ClockIcon className="size-3 text-muted-foreground/60 shrink-0" />
                            <span className="font-mono text-[9px] text-muted-foreground tracking-widest uppercase select-none">
                              Actual wake
                            </span>
                            <input
                              type="time"
                              value={todaySleepEntry?.wakeTime ?? ""}
                              onChange={(e) => logWakeTime(e.target.value)}
                              className="font-mono text-[11px] bg-transparent outline-none border-b border-dashed border-border/60 focus:border-primary text-foreground transition-colors cursor-pointer"
                            />
                            {todaySleepEntry?.wakeTime && plannedWakeTime && (
                              <WakeDelta
                                actual={todaySleepEntry.wakeTime}
                                planned={plannedWakeTime}
                              />
                            )}
                          </div>
                        )}
                        {hasTasks &&
                          blockTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-r-md hover:bg-muted/20 transition-colors"
                            >
                              <CircleIcon
                                className={cn(
                                  "size-2.5 shrink-0",
                                  task.done
                                    ? "text-chart-1 fill-chart-1"
                                    : "text-muted-foreground/40",
                                )}
                              />
                              <span
                                className={cn(
                                  "text-[12px] leading-snug",
                                  task.done
                                    ? "line-through text-muted-foreground/50"
                                    : "text-muted-foreground",
                                )}
                              >
                                {task.text}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="mt-4">
            <SectionLabel>tasks</SectionLabel>
            <TodoManager
              items={todos.items}
              tags={todos.tags}
              onAddItem={addTodoItem}
              onToggleItem={toggleTodoItem}
              onDeleteItem={deleteTodoItem}
              onUpdateItem={updateTodoItem}
              onReorderItems={reorderTodoItems}
              onAddTag={addTodoTag}
              onUpdateTag={updateTodoTag}
              onDeleteTag={deleteTodoTag}
            />
          </div>
        </div>

        <div>
          <SectionLabel>discipline score</SectionLabel>
          <ScoreCard done={doneTasks} total={total} score={score} />

          <SectionLabel>consistency streak</SectionLabel>
          <StreakCard streak={streak} />

          <SectionLabel>weekly gym tracker</SectionLabel>
          <GymTracker
            gymDays={gymDays}
            gymCount={gymCount}
            todayIdx={getTodayWeekIdx()}
            onToggle={toggleGym}
          />

          <SectionLabel>leaving bad habits</SectionLabel>
          <BadHabitTracker
            badHabits={badHabits}
            badHabitStreak={badHabitStreak}
            onToggle={toggleBadHabitClean}
          />

          <SectionLabel>sleep log</SectionLabel>
          <SleepTracker
            sleepData={sleepData}
            todaySleep={todaySleep}
            todaySleepEntry={todaySleepEntry}
            plannedWakeTime={plannedWakeTime}
            onOpenModal={() => setSleepModalOpen(true)}
          />
        </div>
      </main>

      <SleepModal
        key={sleepModalOpen ? "open" : "closed"}
        open={sleepModalOpen}
        onSave={logSleep}
        currentEntry={todaySleepEntry}
        onClose={() => setSleepModalOpen(false)}
      />
    </div>
  );
}
