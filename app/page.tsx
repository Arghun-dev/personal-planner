"use client";

import { useState, useEffect } from "react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { Header } from "@/components/header";
import { SectionLabel } from "@/components/section-label";
import { ScheduleBlock } from "@/components/schedule-block";
import { ScoreCard } from "@/components/score-card";
import { StreakCard } from "@/components/streak-card";
import { GymTracker } from "@/components/gym-tracker";
import { SleepTracker } from "@/components/sleep-tracker";
import { SleepModal } from "@/components/sleep-modal";
import { TodoManager } from "@/components/todo-manager";
import { Button } from "@/components/ui/button";

function getTodayWeekIdx(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
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
    todos,
    dateDisplay,
    toggleTask,
    toggleGym,
    logSleep,
    resetToday,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    addTodoTag,
    updateTodoTag,
    deleteTodoTag,
  } = usePersonalPlanner();

  const [sleepModalOpen, setSleepModalOpen] = useState(false);

  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!hydrated) return null;

  function handleReset() {
    if (window.confirm("Reset all of today's tasks? This cannot be undone.")) {
      resetToday();
    }
  }

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={streak}
        score={score}
        gymCount={gymCount}
        dateDisplay={dateDisplay}
      />

      <main className="max-w-[1100px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <SectionLabel>today&apos;s protocol</SectionLabel>

          <div>
            {scheduleWithState.map((block) => (
              <ScheduleBlock
                key={block.id}
                time={block.time}
                title={block.title}
                sub={block.sub}
                tag={block.tag}
                done={block.done}
                active={block.active}
                onToggle={() => toggleTask(block.id)}
              />
            ))}
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

          <SectionLabel>sleep log</SectionLabel>
          <SleepTracker
            sleepData={sleepData}
            todaySleep={todaySleep}
            onOpenModal={() => setSleepModalOpen(true)}
          />

          <div className="text-right mt-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              className="font-mono text-[9px] tracking-[0.15em]"
            >
              RESET TODAY
            </Button>
          </div>
        </div>
      </main>

      <SleepModal
        open={sleepModalOpen}
        onSave={logSleep}
        onClose={() => setSleepModalOpen(false)}
      />
    </div>
  );
}
