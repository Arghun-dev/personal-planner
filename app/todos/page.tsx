"use client";

import { useState, useRef, useEffect } from "react";
import { usePersonalPlanner } from "@/hooks/use-personal-planner";
import { Header } from "@/components/header";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
  TagIcon,
  FilterIcon,
  PlusIcon,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { TodoItem, TodoTag } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDueDate(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(item: Pick<TodoItem, "done" | "dueDate">): boolean {
  return !item.done && !!item.dueDate && item.dueDate < getTodayISO();
}

function StatusBadge({ done, overdue }: { done: boolean; overdue?: boolean }) {
  if (done)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
        <CheckIcon className="size-2.5 stroke-3" /> Done
      </span>
    );
  if (overdue)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
        Delayed
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
      Open
    </span>
  );
}

function TagPill({ tag, onRemove }: { tag: TodoTag; onRemove?: () => void }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tag.color,
      )}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer opacity-60 hover:opacity-100 leading-none"
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </span>
  );
}

// ── Inline tag picker dropdown ──────────────────────────────────────────────
function TagPickerDropdown({
  allTags,
  selectedIds,
  onChange,
  onOpenChange,
}: {
  allTags: TodoTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  if (allTags.length === 0)
    return (
      <span className="text-muted-foreground/40 text-[11px]">
        No tags defined
      </span>
    );

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2 py-0.5 transition-colors"
        >
          <TagIcon className="size-2.5" /> Add tag
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {allTags.map((tag) => {
          const sel = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() =>
                onChange(
                  sel
                    ? selectedIds.filter((id) => id !== tag.id)
                    : [...selectedIds, tag.id],
                )
              }
              className="cursor-pointer flex items-center justify-between gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-left text-sm"
            >
              <TagPill tag={tag} />
              {sel && <CheckIcon className="size-3 text-primary shrink-0" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ── Editable row ──────────────────────────────────────────────────────────
function TodoTableRow({
  item,
  allTags,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: TodoItem;
  allTags: TodoTag[];
  onToggle: () => void;
  onUpdate: (
    patch: Partial<Pick<TodoItem, "text" | "tagIds" | "link" | "dueDate">>,
  ) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.text);
  const [draftLink, setDraftLink] = useState(item.link ?? "");
  const [draftTagIds, setDraftTagIds] = useState<string[]>(item.tagIds);
  const [draftDueDate, setDraftDueDate] = useState(item.dueDate ?? "");
  const textRef = useRef<HTMLInputElement>(null);
  const trRef = useRef<HTMLTableRowElement>(null);
  const tagPickerOpenRef = useRef(false);
  const commitRef = useRef<() => void>(() => {});

  function startEdit() {
    setDraftText(item.text);
    setDraftLink(item.link ?? "");
    setDraftTagIds(item.tagIds);
    setDraftDueDate(item.dueDate ?? "");
    setEditing(true);
  }

  function revert() {
    setDraftText(item.text);
    setDraftLink(item.link ?? "");
    setDraftTagIds(item.tagIds);
    setDraftDueDate(item.dueDate ?? "");
    setEditing(false);
  }

  // Kept in sync after every render so setTimeout callbacks always see fresh state
  useEffect(() => {
    commitRef.current = () => {
      const text = draftText.trim();
      if (!text) {
        revert();
        return;
      }
      onUpdate({
        text,
        link: draftLink.trim() || undefined,
        tagIds: draftTagIds,
        dueDate: draftDueDate || undefined,
      });
      setEditing(false);
    };
  });

  function commitEdit() {
    const text = draftText.trim();
    if (!text) {
      revert();
      return;
    }
    onUpdate({
      text,
      link: draftLink.trim() || undefined,
      tagIds: draftTagIds,
      dueDate: draftDueDate || undefined,
    });
    setEditing(false);
  }

  function handleRowBlur(e: React.FocusEvent<HTMLTableRowElement>) {
    // Focus stayed inside the row
    if (trRef.current?.contains(e.relatedTarget as Node)) return;
    // Focus moved into an open Radix portal (tag picker dropdown)
    if (
      (e.relatedTarget as Element | null)?.closest(
        "[data-radix-popper-content-wrapper]",
      )
    )
      return;
    // Tag picker is open — let handleTagPickerOpenChange handle the save
    if (tagPickerOpenRef.current) return;
    commitEdit();
  }

  function handleTagPickerOpenChange(open: boolean) {
    tagPickerOpenRef.current = open;
    if (!open) {
      // Picker just closed — save if focus is now outside the row
      setTimeout(() => {
        if (!trRef.current?.contains(document.activeElement)) {
          commitRef.current();
        }
      }, 0);
    }
  }

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  const itemTags = allTags.filter((t) => item.tagIds.includes(t.id));

  if (editing) {
    return (
      <tr
        ref={trRef}
        onBlur={handleRowBlur}
        className="border-b border-border last:border-0 bg-muted/20"
      >
        {/* Status */}
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} className="cursor-pointer">
            <StatusBadge done={item.done} />
          </button>
        </td>

        {/* Text */}
        <td className="px-4 py-3">
          <input
            ref={textRef}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") revert();
            }}
            className="w-full bg-transparent border-b border-primary outline-none text-sm py-0.5"
          />
        </td>

        {/* Tags */}
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {allTags
              .filter((t) => draftTagIds.includes(t.id))
              .map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  onRemove={() =>
                    setDraftTagIds((ids) => ids.filter((id) => id !== tag.id))
                  }
                />
              ))}
            <TagPickerDropdown
              allTags={allTags}
              selectedIds={draftTagIds}
              onChange={setDraftTagIds}
              onOpenChange={handleTagPickerOpenChange}
            />
          </div>
        </td>

        {/* Link */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <LinkIcon className="size-3 text-muted-foreground shrink-0" />
            <input
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") revert();
              }}
              placeholder="https://..."
              className="w-full bg-transparent border-b border-border outline-none text-xs py-0.5 placeholder:text-muted-foreground/50"
            />
          </div>
        </td>

        {/* Due Date */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <CalendarIcon className="size-3 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={draftDueDate}
              onChange={(e) => setDraftDueDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") revert();
              }}
              className="bg-transparent border-b border-border outline-none text-xs py-0.5 w-28 text-foreground"
            />
          </div>
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
          {formatDate(item.createdAt)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3" />
      </tr>
    );
  }

  const overdue = isOverdue(item);
  return (
    <tr
      className={cn(
        "group border-b border-border last:border-0 transition-colors",
        overdue
          ? "bg-red-50 hover:bg-red-100/70 dark:bg-red-950/20"
          : "hover:bg-muted/30",
        item.done && "opacity-60",
      )}
    >
      {/* Status */}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="cursor-pointer"
          title={item.done ? "Mark open" : "Mark done"}
        >
          <StatusBadge done={item.done} overdue={overdue} />
        </button>
      </td>

      {/* Text */}
      <td className="px-4 py-3">
        <span
          className={cn(
            "leading-snug",
            item.done && "line-through text-muted-foreground",
          )}
        >
          {item.text}
        </span>
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {itemTags.length > 0 ? (
            itemTags.map((tag) => <TagPill key={tag.id} tag={tag} />)
          ) : (
            <span className="text-muted-foreground/40 text-[11px]">—</span>
          )}
        </div>
      </td>

      {/* Link */}
      <td className="px-4 py-3">
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline text-xs max-w-45 truncate"
          >
            <LinkIcon className="size-3 shrink-0" />
            {item.link.replace(/^https?:\/\//, "").slice(0, 28)}
            {item.link.replace(/^https?:\/\//, "").length > 28 ? "…" : ""}
          </a>
        ) : (
          <span className="text-muted-foreground/40 text-[11px]">—</span>
        )}
      </td>

      {/* Due Date */}
      <td className="px-4 py-3 text-[11px] whitespace-nowrap">
        {item.dueDate ? (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              overdue ? "text-red-600 font-semibold" : "text-muted-foreground",
            )}
          >
            {overdue && <CalendarIcon className="size-3" />}
            {formatDueDate(item.dueDate)}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
        {formatDate(item.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={startEdit}
            className="cursor-pointer inline-flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Edit"
          >
            <PencilIcon className="size-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="cursor-pointer inline-flex items-center justify-center size-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
          >
            <Trash2Icon className="size-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function TodosPage() {
  const {
    hydrated,
    todos,
    streak,
    score,
    gymCount,
    dateDisplay,
    badHabitStreak,
    toggleTodoItem,
    deleteTodoItem,
    updateTodoItem,
    addTodoItem,
  } = usePersonalPlanner();

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">(
    "all",
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // New task form state
  const [newText, setNewText] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [showNewLink, setShowNewLink] = useState(false);

  function handleAddNewTask() {
    const text = newText.trim();
    if (!text) return;
    const link = newLink.trim() || undefined;
    const dueDate = newDueDate || undefined;
    addTodoItem(text, newTagIds, link, dueDate);
    setNewText("");
    setNewTagIds([]);
    setNewLink("");
    setNewDueDate("");
    setShowNewLink(false);
  }

  if (!hydrated) return null;

  const { items, tags } = todos;

  const filtered = items
    .filter((it) => {
      if (statusFilter === "open") return !it.done;
      if (statusFilter === "done") return it.done;
      return true;
    })
    .filter((it) => {
      if (!tagFilter) return true;
      return it.tagIds.includes(tagFilter);
    });

  const sorted = [...filtered].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    // Among open tasks: overdue first, then tasks with due dates (earliest first)
    if (!a.done) {
      const ao = isOverdue(a),
        bo = isOverdue(b);
      if (ao !== bo) return ao ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
    }
    return b.createdAt - a.createdAt;
  });

  const hasActiveFilter = statusFilter !== "all" || tagFilter !== null;

  function clearFilters() {
    setStatusFilter("all");
    setTagFilter(null);
  }

  return (
    <div className="min-h-screen bg-dos-bg text-dos-text font-sans text-base">
      <Header
        streak={streak}
        score={score}
        gymCount={gymCount}
        dateDisplay={dateDisplay}
        badHabitStreak={badHabitStreak}
      />

      <main className="max-w-275 mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">All Tasks</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.filter((it) => !it.done).length} open ·{" "}
              {items.filter((it) => it.done).length} done · {items.length} total
              {hasActiveFilter && (
                <span className="ml-1 text-primary">
                  · {sorted.length} shown
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Add task form ── */}
        <div className="rounded-xl ring-1 ring-foreground/10 bg-card mb-4 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3">
            <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNewTask()}
              placeholder="Add a task..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 min-w-0"
            />
            <div className="relative shrink-0" title="Set due date">
              <button
                type="button"
                className={cn(
                  "cursor-pointer inline-flex items-center justify-center size-7 rounded hover:bg-muted transition-colors",
                  newDueDate
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={
                  newDueDate
                    ? `Due: ${formatDueDate(newDueDate)}`
                    : "Set due date"
                }
              >
                <CalendarIcon className="size-3.5" />
              </button>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                aria-label="Due date"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNewLink((v) => !v)}
              className={cn(
                "cursor-pointer inline-flex items-center justify-center size-7 rounded hover:bg-muted transition-colors shrink-0",
                showNewLink || newLink
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Add link"
            >
              <LinkIcon className="size-3.5" />
            </button>
            {tags.length > 0 && (
              <TagPickerDropdown
                allTags={tags}
                selectedIds={newTagIds}
                onChange={setNewTagIds}
              />
            )}
            <Button
              size="sm"
              onClick={handleAddNewTask}
              disabled={!newText.trim()}
              className="h-7 px-3 text-xs shrink-0"
            >
              Add
            </Button>
          </div>
          {(newTagIds.length > 0 || showNewLink || newDueDate) && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-muted/20 border-t border-border text-xs">
              {showNewLink && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <LinkIcon className="size-3 text-muted-foreground shrink-0" />
                  <input
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNewTask()}
                    placeholder="https://..."
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0"
                  />
                </div>
              )}
              {newDueDate && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarIcon className="size-3" />
                  Due {formatDueDate(newDueDate)}
                  <button
                    type="button"
                    onClick={() => setNewDueDate("")}
                    className="cursor-pointer hover:text-foreground leading-none ml-0.5"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </span>
              )}
              {newTagIds.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {newTagIds.map((tid) => {
                    const tag = tags.find((t) => t.id === tid);
                    if (!tag) return null;
                    return (
                      <TagPill
                        key={tid}
                        tag={tag}
                        onRemove={() =>
                          setNewTagIds((ids) => ids.filter((id) => id !== tid))
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <FilterIcon className="size-3" />
            <span className="font-semibold uppercase tracking-widest">
              Filter
            </span>
          </div>

          {/* Status filters */}
          {(["all", "open", "done"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors capitalize cursor-pointer",
                statusFilter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary",
              )}
            >
              {s === "all" ? "All status" : s}
            </button>
          ))}

          {/* Divider */}
          {tags.length > 0 && <span className="text-border">|</span>}

          {/* Tag filters */}
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer",
                tagFilter === tag.id
                  ? tag.color + " ring-2 ring-offset-1 ring-primary/30"
                  : "border-border text-muted-foreground hover:border-primary",
              )}
            >
              {tag.name}
              <span className="opacity-60">
                {items.filter((it) => it.tagIds.includes(tag.id)).length}
              </span>
            </button>
          ))}

          {/* Clear */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-1"
            >
              <XIcon className="size-3" /> Clear
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-24 text-sm">
            No tasks yet. Add some from the main page.
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center text-muted-foreground py-24 text-sm">
            No tasks match the current filters.
          </div>
        ) : (
          <div className="rounded-xl ring-1 ring-foreground/10 bg-card overflow-visible">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-24">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Task
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-52">
                    Tags
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-52">
                    Link
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-28">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground w-28">
                    Added
                  </th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <TodoTableRow
                    key={item.id}
                    item={item}
                    allTags={tags}
                    onToggle={() => toggleTodoItem(item.id)}
                    onUpdate={(patch) => updateTodoItem(item.id, patch)}
                    onDelete={() => deleteTodoItem(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
