"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  SearchIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  UnlinkIcon,
} from "lucide-react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { Header } from "@/components/header";
import { loadTodoNotes } from "@/lib/actions";
import type { TodoNote } from "@/lib/types";
import { formatRelativeTime } from "@/lib/todo-utils";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "open" | "done" | "orphaned";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open tasks" },
  { key: "done", label: "Completed tasks" },
  { key: "orphaned", label: "Unlinked" },
];

function snippet(text: string, max = 160): string {
  const clean = text.replace(/[#*`>_-]/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

export default function KnowledgePage() {
  const planner = usePersonalPlanner();
  const [notes, setNotes] = useState<TodoNote[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    loadTodoNotes().then(setNotes);
  }, []);

  const todoById = useMemo(() => {
    const map = new Map<string, (typeof planner.todos.items)[number]>();
    for (const it of planner.todos.items) map.set(it.id, it);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner.todos.items]);

  const filtered = useMemo(() => {
    if (!notes) return [];
    const q = query.trim().toLowerCase();
    return notes.filter((note) => {
      const todo = todoById.get(note.todoId);
      if (filter === "open" && (!todo || todo.done)) return false;
      if (filter === "done" && (!todo || !todo.done)) return false;
      if (filter === "orphaned" && todo) return false;
      if (!q) return true;
      const haystack = `${note.title} ${note.plainText} ${todo?.text ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [notes, query, filter, todoById]);

  if (!planner.hydrated || notes === null) return null;

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={planner.streak}
        score={planner.score}
        gymCount={planner.gymCount}
        dateDisplay={planner.dateDisplay}
        badHabitStreak={planner.badHabitStreak}
      />

      <main className="max-w-275 mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
            <BookOpenIcon className="size-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Knowledge</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {notes.length} note{notes.length === 1 ? "" : "s"} across all
              tasks
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-card overflow-visible">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes by title or content..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 min-w-0"
            />
          </div>

          <div className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap border-b border-border">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                  filter === f.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-[12px] text-muted-foreground/60 py-10 px-4">
              {notes.length === 0
                ? "No knowledge notes yet. Open any task and tap the notebook icon to start one."
                : "No notes match your search."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((note) => {
                const todo = todoById.get(note.todoId);
                const displayTitle =
                  note.title.trim() || todo?.text || "Untitled note";
                return (
                  <Link
                    key={note.id}
                    href={`/todos/${note.todoId}/notes`}
                    className="group flex items-start gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">
                          {displayTitle}
                        </span>
                        {todo ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                              todo.done
                                ? "bg-chart-1/10 text-chart-1"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {todo.done ? (
                              <CheckCircle2Icon className="size-2.5" />
                            ) : (
                              <CircleIcon className="size-2.5" />
                            )}
                            {todo.done ? "Done" : "Open"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                            <UnlinkIcon className="size-2.5" />
                            Unlinked
                          </span>
                        )}
                      </div>
                      {note.plainText && (
                        <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2">
                          {snippet(note.plainText)}
                        </p>
                      )}
                      <p className="text-[10px] font-mono text-muted-foreground/70 mt-1.5">
                        Updated {formatRelativeTime(note.updatedAt)}
                      </p>
                    </div>

                    {todo && (
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.location.href = `/todos?focus=${todo.id}`;
                        }}
                        title="Open in Tasks"
                        className="cursor-pointer shrink-0 mt-0.5 inline-flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ArrowRightIcon className="size-3.5" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
