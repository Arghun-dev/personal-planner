"use client";

import { useEffect } from "react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { Header } from "@/components/header";
import { TaskList } from "@/components/task-list";

export default function TodosPage() {
  const {
    hydrated,
    todos,
    notedTodoIds,
    streak,
    score,
    gymCount,
    dateDisplay,
    badHabitStreak,
    addTodoItem,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    reorderTodoItems,
    bulkCompleteTodoItems,
    bulkDeleteTodoItems,
    bulkAddTagToItems,
    addTodoTag,
    updateTodoTag,
    deleteTodoTag,
  } = usePersonalPlanner();

  // Deep-link support: /todos?focus=<todoId> (used by the Knowledge page's
  // "Open Todo" action) scrolls to and briefly highlights that task row.
  useEffect(() => {
    if (!hydrated) return;
    const focusId = new URLSearchParams(window.location.search).get("focus");
    if (!focusId) return;
    const el = document.getElementById(`todo-row-${focusId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("task-row-highlight");
    const t = setTimeout(() => el.classList.remove("task-row-highlight"), 1600);
    window.history.replaceState(null, "", "/todos");
    return () => clearTimeout(t);
  }, [hydrated]);

  if (!hydrated) return null;

  const { items } = todos;

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={streak}
        score={score}
        gymCount={gymCount}
        dateDisplay={dateDisplay}
        badHabitStreak={badHabitStreak}
      />

      <main className="max-w-275 mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">All Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.filter((it) => !it.done).length} open ·{" "}
            {items.filter((it) => it.done).length} done · {items.length} total
          </p>
        </div>

        <TaskList
          mode="full"
          items={todos.items}
          tags={todos.tags}
          notedIds={notedTodoIds}
          onAddItem={addTodoItem}
          onToggleItem={toggleTodoItem}
          onDeleteItem={deleteTodoItem}
          onUpdateItem={updateTodoItem}
          onReorderItems={reorderTodoItems}
          onBulkComplete={bulkCompleteTodoItems}
          onBulkDelete={bulkDeleteTodoItems}
          onBulkAddTag={bulkAddTagToItems}
          onAddTag={addTodoTag}
          onUpdateTag={updateTodoTag}
          onDeleteTag={deleteTodoTag}
        />
      </main>
    </div>
  );
}
