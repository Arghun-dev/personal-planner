"use server";

import { createClient } from "@/lib/supabase/server";
import type { AppState, NoteContent, TodoNote } from "@/lib/types";

const PLANNER_KEY = "personal";

export async function loadState(): Promise<AppState | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("planner_state")
    .select("data")
    .eq("key", PLANNER_KEY)
    .maybeSingle();
  return (data?.data as AppState) ?? null;
}

export async function saveState(state: AppState): Promise<void> {
  const supabase = await createClient();
  await supabase.from("planner_state").upsert({
    key: PLANNER_KEY,
    data: state,
    updated_at: new Date().toISOString(),
  });
}

// ── Knowledge Notes ──────────────────────────────────────────────────────

const NOTE_IMAGE_BUCKET = "todo-note-images";
const NOTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024; // 8MB

interface TodoNoteRow {
  id: string;
  todo_id: string;
  title: string;
  content: NoteContent;
  plain_text: string;
  created_at: string;
  updated_at: string;
}

function rowToNote(row: TodoNoteRow): TodoNote {
  return {
    id: row.id,
    todoId: row.todo_id,
    title: row.title,
    content: row.content,
    plainText: row.plain_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All knowledge notes, newest first — used by the centralized Knowledge page. */
export async function loadTodoNotes(): Promise<TodoNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todo_notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("loadTodoNotes failed:", error.message);
    return [];
  }
  return ((data as TodoNoteRow[]) ?? []).map(rowToNote);
}

/** The single note belonging to one Todo, if it has ever been created. */
export async function loadTodoNote(todoId: string): Promise<TodoNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todo_notes")
    .select("*")
    .eq("todo_id", todoId)
    .maybeSingle();
  if (error) {
    console.error("loadTodoNote failed:", error.message);
    return null;
  }
  return data ? rowToNote(data as TodoNoteRow) : null;
}

export async function saveTodoNote(input: {
  todoId: string;
  title: string;
  content: NoteContent;
  plainText: string;
}): Promise<TodoNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todo_notes")
    .upsert(
      {
        todo_id: input.todoId,
        title: input.title,
        content: input.content,
        plain_text: input.plainText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "todo_id" },
    )
    .select("*")
    .single();
  if (error) {
    console.error("saveTodoNote failed:", error.message);
    return null;
  }
  return rowToNote(data as TodoNoteRow);
}

export async function deleteTodoNote(todoId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("todo_notes").delete().eq("todo_id", todoId);
}

/** Bulk-delete notes for todos that were just removed (keeps Knowledge in sync). */
export async function deleteTodoNotes(todoIds: string[]): Promise<void> {
  if (todoIds.length === 0) return;
  const supabase = await createClient();
  await supabase.from("todo_notes").delete().in("todo_id", todoIds);
}

/** Lightweight lookup used to show a "has note" indicator on task rows. */
export async function loadNoteTodoIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("todo_notes").select("todo_id");
  if (error) {
    console.error("loadNoteTodoIds failed:", error.message);
    return [];
  }
  return ((data as { todo_id: string }[]) ?? []).map((r) => r.todo_id);
}

/** Uploads an image for use inside a note's editor and returns its public URL. */
export async function uploadNoteImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "No file provided." };
  if (!file.type.startsWith("image/")) {
    return { error: "Only image files are supported." };
  }
  if (file.size > NOTE_IMAGE_MAX_BYTES) {
    return { error: "Image is too large (max 8MB)." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(NOTE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("uploadNoteImage failed:", error.message);
    return { error: error.message };
  }

  const { data } = supabase.storage.from(NOTE_IMAGE_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
