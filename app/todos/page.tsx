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
  SaveIcon,
  FilterIcon,
} from "lucide-react";
import type { TodoItem, TodoTag } from "@/lib/types";

// ── helpers ───────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap">
      <CheckIcon className="size-2.5 stroke-3" /> Done
    </span>
  ) : (
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

// ── Inline tag picker dropdown ─────────────────────────────────────────────
function TagPickerDropdown({
  allTags,
  selectedIds,
  onChange,
}: {
  allTags: TodoTag[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (allTags.length === 0)
    return (
      <span className="text-muted-foreground/40 text-[11px]">
        No tags defined
      </span>
    );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2 py-0.5 transition-colors"
      >
        <TagIcon className="size-2.5" /> Add tag
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            zIndex: 9999,
          }}
          className="min-w-40 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1"
        >
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
        </div>
      )}
    </div>
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
    patch: Partial<Pick<TodoItem, "text" | "tagIds" | "link">>,
  ) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.text);
  const [draftLink, setDraftLink] = useState(item.link ?? "");
  const [draftTagIds, setDraftTagIds] = useState<string[]>(item.tagIds);
  const textRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraftText(item.text);
    setDraftLink(item.link ?? "");
    setDraftTagIds(item.tagIds);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function commitEdit() {
    const text = draftText.trim();
    if (!text) return;
    const link = draftLink.trim() || undefined;
    onUpdate({ text, link, tagIds: draftTagIds });
    setEditing(false);
  }

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  const itemTags = allTags.filter((t) => item.tagIds.includes(t.id));

  if (editing) {
    return (
      <tr className="border-b border-border last:border-0 bg-muted/20">
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
              if (e.key === "Escape") cancelEdit();
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
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") cancelEdit();
              }}
              placeholder="https://..."
              className="w-full bg-transparent border-b border-border outline-none text-xs py-0.5 placeholder:text-muted-foreground/50"
            />
          </div>
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap">
          {formatDate(item.createdAt)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={commitEdit}
              disabled={!draftText.trim()}
              className="cursor-pointer inline-flex items-center justify-center size-6 rounded hover:bg-primary/10 text-primary transition-colors disabled:opacity-40"
              title="Save"
            >
              <SaveIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="cursor-pointer inline-flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground transition-colors"
              title="Cancel"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={cn(
        "group border-b border-border last:border-0 transition-colors hover:bg-muted/30",
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
          <StatusBadge done={item.done} />
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
  } = usePersonalPlanner();

  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "done">(
    "all",
  );
  const [tagFilter, setTagFilter] = useState<string | null>(null);

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
