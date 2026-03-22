"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TodoItem, TodoTag } from "@/lib/types";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckIcon,
  PlusIcon,
  TagIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

// ── Colour palette for tags ────────────────────────────────────────────────
const TAG_COLORS = [
  { label: "Violet", value: "bg-violet-100 text-violet-700 border-violet-200" },
  { label: "Blue", value: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "Cyan", value: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { label: "Green", value: "bg-green-100 text-green-700 border-green-200" },
  { label: "Yellow", value: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { label: "Orange", value: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Red", value: "bg-red-100 text-red-700 border-red-200" },
  { label: "Pink", value: "bg-pink-100 text-pink-700 border-pink-200" },
  { label: "Gray", value: "bg-gray-100 text-gray-600 border-gray-200" },
];

// ── TagPill ────────────────────────────────────────────────────────────────
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
          className="opacity-60 hover:opacity-100 transition-opacity leading-none"
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </span>
  );
}

// ── ColorSwatch row ────────────────────────────────────────────────────────
function ColorSwatches({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onSelect(c.value)}
          className={cn(
            "size-5 rounded-full border-2 transition-all",
            c.value.split(" ")[0],
            selected === c.value
              ? "border-foreground scale-110"
              : "border-transparent",
          )}
        />
      ))}
    </div>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────
function Dropdown({
  triggerContent,
  triggerClassName,
  children,
  align = "end",
  className,
}: {
  triggerContent: React.ReactNode;
  triggerClassName?: string;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {triggerContent}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            marginTop: 4,
            ...(align === "end" ? { right: 0 } : { left: 0 }),
          }}
          className={cn(
            "z-9999 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ── TagPickerBody (renders the list inside a popover; caller owns the <PopoverContent>) ──
function TagPickerBody({
  allTags,
  selectedIds,
  onToggle,
}: {
  allTags: TodoTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
        Add tag
      </p>
      {allTags.length === 0 && (
        <p className="text-[11px] text-muted-foreground px-1 py-1">
          No tags yet. Use &ldquo;Manage tags&rdquo; to create one.
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {allTags.map((tag) => {
          const sel = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left w-full"
            >
              <TagPill tag={tag} />
              {sel && <CheckIcon className="size-3 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── TagManagerPanel ────────────────────────────────────────────────────────
function TagManagerPanel({
  tags,
  onAdd,
  onUpdate,
  onDelete,
}: {
  tags: TodoTag[];
  onAdd: (name: string, color: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<TodoTag, "name" | "color">>,
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0].value);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newColor);
    setNewName("");
  }

  function startEdit(tag: TodoTag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function commitEdit() {
    if (!editingId) return;
    const name = editName.trim();
    if (name) onUpdate(editingId, { name, color: editColor });
    setEditingId(null);
  }

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="space-y-1">
          {tags.map((tag) =>
            editingId === tag.id ? (
              <div
                key={tag.id}
                className="flex flex-col gap-2 p-2 rounded-lg border bg-muted/40"
              >
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                  className="h-7 text-sm"
                  autoFocus
                />
                <ColorSwatches selected={editColor} onSelect={setEditColor} />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-6 text-xs px-2 flex-1"
                    onClick={commitEdit}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs px-2"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={tag.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 group"
              >
                <TagPill tag={tag} />
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tag.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          New tag
        </p>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Tag name..."
            className="h-7 text-sm flex-1"
          />
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
        <ColorSwatches selected={newColor} onSelect={setNewColor} />
        {newName.trim() && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            Preview:{" "}
            <TagPill tag={{ id: "_", name: newName.trim(), color: newColor }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── TodoRow ────────────────────────────────────────────────────────────────
function TodoRow({
  item,
  allTags,
  onToggle,
  onDelete,
  onUpdate,
}: {
  item: TodoItem;
  allTags: TodoTag[];
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Pick<TodoItem, "text" | "tagIds">>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitEdit() {
    const text = draft.trim();
    if (text && text !== item.text) onUpdate({ text });
    setEditing(false);
  }

  const itemTags = allTags.filter((t) => item.tagIds.includes(t.id));

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-muted/50",
        item.done && "opacity-60",
      )}
    >
      {/* Checkbox visual */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 size-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors",
          item.done
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input hover:border-primary",
        )}
      >
        {item.done && <CheckIcon className="size-2.5 stroke-3" />}
      </button>

      {/* Text + tags */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") {
                setDraft(item.text);
                setEditing(false);
              }
            }}
            onBlur={commitEdit}
            className="w-full bg-transparent outline-none text-sm border-b border-primary"
            autoFocus
          />
        ) : (
          <p
            className={cn(
              "text-sm leading-snug cursor-text select-none",
              item.done && "line-through text-muted-foreground",
            )}
            onDoubleClick={() => {
              setEditing(true);
              setDraft(item.text);
            }}
          >
            {item.text}
          </p>
        )}

        {itemTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {itemTags.map((tag) => (
              <TagPill
                key={tag.id}
                tag={tag}
                onRemove={() =>
                  onUpdate({
                    tagIds: item.tagIds.filter((id) => id !== tag.id),
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Row actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
        <Dropdown
          className="w-52 p-2"
          triggerClassName="inline-flex items-center justify-center size-6 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          triggerContent={<TagIcon className="size-3" />}
        >
          <TagPickerBody
            allTags={allTags}
            selectedIds={item.tagIds}
            onToggle={(tagId) => {
              const next = item.tagIds.includes(tagId)
                ? item.tagIds.filter((id) => id !== tagId)
                : [...item.tagIds, tagId];
              onUpdate({ tagIds: next });
            }}
          />
        </Dropdown>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center size-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2Icon className="size-3" />
        </button>
      </div>
    </div>
  );
}

// ── Main TodoManager ───────────────────────────────────────────────────────
interface Props {
  items: TodoItem[];
  tags: TodoTag[];
  onAddItem: (text: string, tagIds: string[]) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (
    id: string,
    patch: Partial<Pick<TodoItem, "text" | "tagIds">>,
  ) => void;
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (
    id: string,
    patch: Partial<Pick<TodoTag, "name" | "color">>,
  ) => void;
  onDeleteTag: (id: string) => void;
}

export function TodoManager({
  items,
  tags,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}: Props) {
  const [newText, setNewText] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  function handleAdd() {
    const text = newText.trim();
    if (!text) return;
    onAddItem(text, newTagIds);
    setNewText("");
    setNewTagIds([]);
  }

  const filtered = activeFilter
    ? items.filter((it) => it.tagIds.includes(activeFilter))
    : items;

  const sorted = [
    ...filtered.filter((it) => !it.done),
    ...filtered.filter((it) => it.done),
  ];

  const openCount = items.filter((it) => !it.done).length;

  return (
    <Card className="rounded-xl gap-0 overflow-visible">
      <CardContent className="p-0">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Tasks</span>
            {openCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 rounded-full"
              >
                {openCount}
              </Badge>
            )}
          </div>
          <Dropdown
            className="w-72 p-4"
            triggerClassName="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            triggerContent={
              <>
                <TagIcon className="size-3" />
                Manage tags
              </>
            }
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Tag Manager
            </p>
            <TagManagerPanel
              tags={tags}
              onAdd={onAddTag}
              onUpdate={onUpdateTag}
              onDelete={onDeleteTag}
            />
          </Dropdown>
        </div>

        <Separator />

        {/* ── Tag filter bar ── */}
        {tags.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
                  activeFilter === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setActiveFilter(activeFilter === tag.id ? null : tag.id)
                  }
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                    activeFilter === tag.id
                      ? tag.color + " ring-2 ring-offset-1 ring-primary/30"
                      : "border-border text-muted-foreground hover:border-primary",
                  )}
                >
                  {tag.name}
                  <span className="text-[9px] opacity-70">
                    {items.filter((it) => it.tagIds.includes(tag.id)).length}
                  </span>
                </button>
              ))}
            </div>
            <Separator />
          </>
        )}

        {/* ── New task input ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
          <input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a task..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60 min-w-0"
          />

          {newTagIds.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
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

          {tags.length > 0 && (
            <Dropdown
              className="w-52 p-2"
              triggerClassName="inline-flex items-center justify-center size-7 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              triggerContent={<TagIcon className="size-3.5" />}
            >
              <TagPickerBody
                allTags={tags}
                selectedIds={newTagIds}
                onToggle={(id) =>
                  setNewTagIds((ids) =>
                    ids.includes(id)
                      ? ids.filter((i) => i !== id)
                      : [...ids, id],
                  )
                }
              />
            </Dropdown>
          )}

          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="h-7 px-3 text-xs shrink-0"
          >
            Add
          </Button>
        </div>

        {/* ── Task list ── */}
        <div className="py-1">
          {sorted.length === 0 ? (
            <p className="text-center text-[12px] text-muted-foreground/60 py-8">
              {activeFilter
                ? "No tasks with this tag."
                : "No tasks yet. Add one above."}
            </p>
          ) : (
            sorted.map((item) => (
              <TodoRow
                key={item.id}
                item={item}
                allTags={tags}
                onToggle={() => onToggleItem(item.id)}
                onDelete={() => onDeleteItem(item.id)}
                onUpdate={(patch) => onUpdateItem(item.id, patch)}
              />
            ))
          )}
        </div>

        {/* ── Footer ── */}
        {items.filter((it) => it.done).length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {items.filter((it) => it.done).length} completed
              </span>
              <button
                type="button"
                onClick={() =>
                  items
                    .filter((it) => it.done)
                    .forEach((it) => onDeleteItem(it.id))
                }
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear completed
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
