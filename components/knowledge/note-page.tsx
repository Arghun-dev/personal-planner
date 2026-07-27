"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeftIcon, BookOpenIcon, CheckIcon, Trash2Icon } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { loadTodoNote, saveTodoNote, deleteTodoNote } from "@/lib/actions";
import type { NoteContent, TodoNote } from "@/lib/types";
import { cn } from "@/lib/utils";

const NoteEditor = dynamic(
  () => import("@/components/knowledge/note-editor").then((m) => m.NoteEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
    ),
  },
);

type SaveStatus = "idle" | "saving" | "saved";

export function NotePage({ todoId }: { todoId: string }) {
  const planner = usePersonalPlanner();
  const [note, setNote] = useState<TodoNote | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const contentRef = useRef<NoteContent>([]);
  const plainTextRef = useRef("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The app applies a global CSS `zoom: 1.25` on desktop (see globals.css).
  // CSS zoom breaks floating-ui's position math, which BlockNote's side
  // menu / slash menu / toolbars rely on — so this route opts out of the
  // zoom entirely for as long as it's mounted.
  useEffect(() => {
    document.body.classList.add("bn-no-zoom");
    return () => document.body.classList.remove("bn-no-zoom");
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadTodoNote(todoId).then((loaded) => {
      if (cancelled) return;
      setNote(loaded);
      setTitle(loaded?.title ?? "");
      contentRef.current = loaded?.content ?? [];
      plainTextRef.current = loaded?.plainText ?? "";
    });
    return () => {
      cancelled = true;
    };
  }, [todoId]);

  const scheduleSave = useCallback(
    (nextTitle: string) => {
      setStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const saved = await saveTodoNote({
          todoId,
          title: nextTitle,
          content: contentRef.current,
          plainText: plainTextRef.current,
        });
        if (saved) setNote(saved);
        setStatus("saved");
      }, 600);
    },
    [todoId],
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    scheduleSave(value);
  }

  function handleEditorChange(content: NoteContent, plainText: string) {
    contentRef.current = content;
    plainTextRef.current = plainText;
    scheduleSave(title);
  }

  async function handleDelete() {
    if (!confirm("Delete this knowledge note? This can't be undone.")) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await deleteTodoNote(todoId);
    setNote(null);
    setTitle("");
    contentRef.current = [];
    plainTextRef.current = "";
    setStatus("idle");
  }

  if (!planner.hydrated || note === undefined) return null;

  const todo = planner.todos.items.find((it) => it.id === todoId);

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={planner.streak}
        score={planner.score}
        gymCount={planner.gymCount}
        dateDisplay={planner.dateDisplay}
        badHabitStreak={planner.badHabitStreak}
      />

      <main className="max-w-225 mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/todos"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            {todo ? (
              <span className="truncate max-w-100">
                Back to <span className="text-foreground">{todo.text}</span>
              </span>
            ) : (
              "Back to Tasks"
            )}
          </Link>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-[11px] font-mono text-muted-foreground transition-opacity",
                status === "idle" && "opacity-0",
              )}
            >
              {status === "saving" ? (
                "Saving…"
              ) : status === "saved" ? (
                <span className="inline-flex items-center gap-1">
                  <CheckIcon className="size-3" /> Saved
                </span>
              ) : null}
            </span>
            {note && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                title="Delete note"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {!todo && (
          <div className="mb-4 rounded-lg border border-dashed border-border px-4 py-3 text-[12px] text-muted-foreground">
            This todo no longer exists, but its knowledge note is preserved
            here.
          </div>
        )}

        <div className="rounded-xl border border-border bg-card shadow-card px-6 sm:px-12 py-8 sm:py-12 min-h-150">
          <div className="flex items-center gap-2 mb-4 text-muted-foreground/70">
            <BookOpenIcon className="size-4" />
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase">
              Knowledge Note
            </span>
          </div>

          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={todo?.text || "Untitled"}
            className="w-full bg-transparent outline-none text-3xl font-bold tracking-tight placeholder:text-muted-foreground/40 mb-6"
          />

          <NoteEditor initialContent={note?.content} onChange={handleEditorChange} />
        </div>
      </main>
    </div>
  );
}
