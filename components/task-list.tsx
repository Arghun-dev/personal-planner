"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TodoItem, TodoPriority, TodoTag } from "@/lib/types";
import {
  formatDueDate,
  getTaskGroup,
  getTodayISO,
  isOverdue,
  compareTasks,
  parseQuickAdd,
  TASK_GROUP_ORDER,
  TASK_GROUP_LABEL,
  type TaskGroupKey,
} from "@/lib/todo-utils";

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
  LinkIcon,
  CalendarIcon,
  FlagIcon,
  ListChecksIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";

export type TodoPatch = Partial<
  Pick<TodoItem, "text" | "tagIds" | "link" | "dueDate" | "priority">
>;

// ── Colour palette for tags ────────────────────────────────────────────────
// New tags store an actual hex value so any color can be picked. Tags saved
// before this change may still carry the old Tailwind class-list format
// (e.g. "bg-violet-100 text-violet-700 border-violet-200") — both render fine.
const TAG_COLORS = [
  { label: "Violet", value: "#8b5cf6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Cyan", value: "#06b6d4" },
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#eab308" },
  { label: "Orange", value: "#f97316" },
  { label: "Red", value: "#ef4444" },
  { label: "Pink", value: "#ec4899" },
  { label: "Gray", value: "#6b7280" },
];

function isHexColor(color: string): boolean {
  return color.startsWith("#");
}

function hexTagStyle(color: string): React.CSSProperties {
  return {
    backgroundColor: `color-mix(in oklab, ${color} 16%, var(--card))`,
    color,
    borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
  };
}

// ── Small shared bits ───────────────────────────────────────────────────────
function TagPill({ tag, onRemove }: { tag: TodoTag; onRemove?: () => void }) {
  const hex = isHexColor(tag.color);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        !hex && tag.color,
      )}
      style={hex ? hexTagStyle(tag.color) : undefined}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer opacity-60 hover:opacity-100 transition-opacity leading-none"
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </span>
  );
}

function ColorSwatches({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (v: string) => void;
}) {
  const isPreset = TAG_COLORS.some((c) => c.value === selected);
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(selected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {TAG_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onSelect(c.value)}
            style={{ backgroundColor: c.value }}
            className={cn(
              "size-5 rounded-full border-2 transition-all cursor-pointer",
              selected === c.value
                ? "border-foreground scale-110"
                : "border-transparent",
            )}
          />
        ))}
        <label
          title="Custom color"
          style={!isPreset && isValidHex ? { backgroundColor: selected } : undefined}
          className={cn(
            "relative size-5 rounded-full border-2 shrink-0 cursor-pointer overflow-hidden transition-all",
            !isPreset && isValidHex
              ? "border-foreground scale-110"
              : "border-transparent [background:conic-gradient(from_0deg,#ef4444,#eab308,#22c55e,#06b6d4,#3b82f6,#ec4899,#ef4444)]",
          )}
        >
          <input
            type="color"
            value={isValidHex ? selected : "#8b5cf6"}
            onChange={(e) => onSelect(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      {!isPreset && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground shrink-0">
            Custom
          </span>
          <input
            value={selected}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="#7c3aed"
            spellCheck={false}
            className="h-6 w-24 rounded border border-border bg-transparent px-1.5 text-[11px] font-mono outline-none focus:border-primary"
          />
        </div>
      )}
    </div>
  );
}

function Dropdown({
  triggerContent,
  triggerClassName,
  children,
  align = "end",
  className,
  open: controlledOpen,
  onOpenChange,
}: {
  triggerContent: React.ReactNode;
  triggerClassName?: string;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, setOpen]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn("cursor-pointer", triggerClassName)}
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
              className="cursor-pointer flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left w-full"
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
                    className="cursor-pointer p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <PencilIcon className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(tag.id)}
                    className="cursor-pointer p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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

// ── Priority ─────────────────────────────────────────────────────────────
function nextPriority(p?: TodoPriority): TodoPriority | undefined {
  if (p === undefined) return "med";
  if (p === "med") return "high";
  return undefined;
}

function PriorityFlag({
  priority,
  onCycle,
}: {
  priority?: TodoPriority;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onCycle();
      }}
      title={
        priority === "high"
          ? "High priority — click to clear"
          : priority === "med"
            ? "Medium priority — click for high"
            : "Set priority"
      }
      className={cn(
        "mt-[9px] size-1.5 rounded-[2px] shrink-0 cursor-pointer transition-colors",
        priority === "high" && "bg-destructive",
        priority === "med" && "bg-orange-400",
        !priority &&
          "bg-transparent ring-1 ring-inset ring-border hover:ring-muted-foreground/60",
      )}
    />
  );
}

// ── Task row ─────────────────────────────────────────────────────────────
function TaskRow({
  item,
  allTags,
  selectMode,
  selected,
  onToggleSelect,
  onToggle,
  onDelete,
  onUpdate,
  dragHandlers,
  isDragOver,
}: {
  item: TodoItem;
  allTags: TodoTag[];
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (patch: TodoPatch) => void;
  dragHandlers?: {
    onDragStart: () => void;
    onDragEnter: () => void;
    onDragEnd: () => void;
  };
  isDragOver?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.text);
  const [draftLink, setDraftLink] = useState(item.link ?? "");
  const [draftTagIds, setDraftTagIds] = useState<string[]>(item.tagIds);
  const [draftDueDate, setDraftDueDate] = useState(item.dueDate ?? "");
  const [draftPriority, setDraftPriority] = useState<TodoPriority | undefined>(
    item.priority,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function startEdit() {
    setDraftText(item.text);
    setDraftLink(item.link ?? "");
    setDraftTagIds(item.tagIds);
    setDraftDueDate(item.dueDate ?? "");
    setDraftPriority(item.priority);
    setEditing(true);
  }

  function revert() {
    setEditing(false);
  }

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
      priority: draftPriority,
    });
    setEditing(false);
  }

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    if (
      (e.relatedTarget as Element | null)?.closest(
        "[data-radix-popper-content-wrapper]",
      )
    )
      return;
    commitEdit();
  }

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const itemTags = allTags.filter((t) => item.tagIds.includes(t.id));
  const overdue = isOverdue(item);

  if (editing) {
    return (
      <div
        ref={containerRef}
        onBlur={handleContainerBlur}
        className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-muted/30 mx-1.5"
      >
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-1 size-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors cursor-pointer",
            item.done
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input hover:border-primary",
          )}
        >
          {item.done && <CheckIcon className="size-2.5 stroke-3" />}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <input
            ref={inputRef}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") revert();
            }}
            className="w-full bg-transparent outline-none text-sm border-b border-primary py-0.5"
          />
          <div className="flex items-center gap-1">
            <LinkIcon className="size-3 text-muted-foreground shrink-0" />
            <input
              value={draftLink}
              onChange={(e) => setDraftLink(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && revert()}
              placeholder="https://..."
              className="flex-1 bg-transparent outline-none text-xs border-b border-border py-0.5 placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center gap-1">
            <CalendarIcon className="size-3 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={draftDueDate}
              onChange={(e) => setDraftDueDate(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && revert()}
              className="flex-1 bg-transparent outline-none text-xs border-b border-border py-0.5 text-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <FlagIcon className="size-3 text-muted-foreground shrink-0" />
            <button
              type="button"
              onClick={() => setDraftPriority(nextPriority(draftPriority))}
              className={cn(
                "cursor-pointer text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors",
                draftPriority === "high" &&
                  "bg-destructive/10 text-destructive border-destructive/30",
                draftPriority === "med" &&
                  "bg-orange-500/10 text-orange-500 border-orange-500/30",
                !draftPriority &&
                  "border-dashed border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {draftPriority === "high"
                ? "High"
                : draftPriority === "med"
                  ? "Medium"
                  : "No priority"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {allTags
              .filter((t) => draftTagIds.includes(t.id))
              .map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  onRemove={() => {
                    setDraftTagIds((ids) => ids.filter((id) => id !== tag.id));
                    inputRef.current?.focus();
                  }}
                />
              ))}
            <Dropdown
              className="w-52 p-2"
              triggerClassName="cursor-pointer inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border rounded-full px-2 py-0.5 transition-colors"
              triggerContent={
                <>
                  <TagIcon className="size-2.5" /> Add tag
                </>
              }
              align="start"
            >
              <TagPickerBody
                allTags={allTags}
                selectedIds={draftTagIds}
                onToggle={(id) =>
                  setDraftTagIds((ids) =>
                    ids.includes(id)
                      ? ids.filter((i) => i !== id)
                      : [...ids, id],
                  )
                }
              />
            </Dropdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={!!dragHandlers}
      onDragStart={dragHandlers?.onDragStart}
      onDragEnter={dragHandlers?.onDragEnter}
      onDragEnd={dragHandlers?.onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "group flex items-start gap-2.5 px-2 py-2 mx-1.5 rounded-lg transition-colors hover:bg-muted/50",
        item.done && "opacity-60",
        isDragOver && "border-t-2 border-primary",
        dragHandlers && "cursor-grab active:cursor-grabbing",
      )}
    >
      {selectMode && (
        <button
          type="button"
          onClick={onToggleSelect}
          className={cn(
            "mt-0.5 size-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors cursor-pointer",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input hover:border-primary",
          )}
        >
          {selected && <CheckIcon className="size-2.5 stroke-3" />}
        </button>
      )}

      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 size-4 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-colors cursor-pointer",
          item.done
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input hover:border-primary",
        )}
      >
        {item.done && <CheckIcon className="size-2.5 stroke-3" />}
      </button>

      <PriorityFlag
        priority={item.priority}
        onCycle={() => onUpdate({ priority: nextPriority(item.priority) })}
      />

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug select-none",
            item.done && "line-through text-muted-foreground",
          )}
        >
          {item.text}
        </p>

        {(itemTags.length > 0 || item.dueDate || item.link) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {itemTags.map((tag) => (
              <TagPill key={tag.id} tag={tag} />
            ))}
            {item.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-mono",
                  overdue
                    ? "text-destructive font-semibold"
                    : "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-2.5" />
                {formatDueDate(item.dueDate)}
                {overdue && " · overdue"}
              </span>
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline truncate max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <LinkIcon className="size-2.5 shrink-0" />
                {item.link.replace(/^https?:\/\//, "").slice(0, 32)}
                {item.link.replace(/^https?:\/\//, "").length > 32 ? "…" : ""}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
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
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────
const GROUP_RAIL: Record<TaskGroupKey, string> = {
  overdue: "bg-destructive",
  today: "bg-primary",
  upcoming: "bg-chart-4",
  nodate: "bg-muted-foreground",
  done: "bg-chart-1",
};
const GROUP_TEXT: Record<TaskGroupKey, string> = {
  overdue: "text-destructive",
  today: "text-primary",
  upcoming: "text-chart-4",
  nodate: "text-muted-foreground",
  done: "text-chart-1",
};

function GroupSection({
  groupKey,
  items,
  allTags,
  selectMode,
  selectedIds,
  onToggleSelect,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onReorderItems,
  collapsible,
}: {
  groupKey: TaskGroupKey;
  items: TodoItem[];
  allTags: TodoTag[];
  selectMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, patch: TodoPatch) => void;
  onReorderItems: (fromId: string, toId: string) => void;
  collapsible?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!!collapsible);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="py-1">
      <button
        type="button"
        onClick={() => collapsible && setCollapsed((c) => !c)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-1.5",
          collapsible && "cursor-pointer",
        )}
      >
        <span className={cn("w-[3px] h-3 rounded-full", GROUP_RAIL[groupKey])} />
        <span
          className={cn(
            "font-mono text-[10px] font-bold tracking-widest uppercase",
            GROUP_TEXT[groupKey],
          )}
        >
          {TASK_GROUP_LABEL[groupKey]}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          · {items.length}
        </span>
        {collapsible &&
          (collapsed ? (
            <ChevronRightIcon className="size-3 text-muted-foreground ml-0.5" />
          ) : (
            <ChevronDownIcon className="size-3 text-muted-foreground ml-0.5" />
          ))}
      </button>
      {!collapsed && (
        <div>
          {items.map((item) => (
            <TaskRow
              key={item.id}
              item={item}
              allTags={allTags}
              selectMode={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={() => onToggleSelect(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onDelete={() => onDeleteItem(item.id)}
              onUpdate={(patch) => onUpdateItem(item.id, patch)}
              isDragOver={overId === item.id && dragId !== item.id}
              dragHandlers={
                item.done
                  ? undefined
                  : {
                      onDragStart: () => setDragId(item.id),
                      onDragEnter: () => setOverId(item.id),
                      onDragEnd: () => {
                        if (dragId && overId && dragId !== overId) {
                          onReorderItems(dragId, overId);
                        }
                        setDragId(null);
                        setOverId(null);
                      },
                    }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main TaskList ───────────────────────────────────────────────────────────
interface Props {
  items: TodoItem[];
  tags: TodoTag[];
  mode: "compact" | "full";
  onAddItem: (
    text: string,
    tagIds: string[],
    link?: string,
    dueDate?: string,
    priority?: TodoPriority,
  ) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, patch: TodoPatch) => void;
  onReorderItems: (fromId: string, toId: string) => void;
  onAddTag: (name: string, color: string) => void;
  onUpdateTag: (
    id: string,
    patch: Partial<Pick<TodoTag, "name" | "color">>,
  ) => void;
  onDeleteTag: (id: string) => void;
  onBulkComplete?: (ids: string[]) => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkAddTag?: (ids: string[], tagId: string) => void;
}

export function TaskList({
  items,
  tags,
  mode,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onReorderItems,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onBulkComplete,
  onBulkDelete,
  onBulkAddTag,
}: Props) {
  const isFull = mode === "full";
  const today = getTodayISO();

  const [newText, setNewText] = useState("");
  const [newTagIds, setNewTagIds] = useState<string[]>([]);
  const [newLink, setNewLink] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState<TodoPriority | undefined>();
  const [showLinkInput, setShowLinkInput] = useState(false);

  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  const parsed = useMemo(() => parseQuickAdd(newText, tags), [newText, tags]);

  function toggleTagFilter(id: string) {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleAdd() {
    const text = parsed.cleanText;
    if (!text) return;
    const tagIds = Array.from(new Set([...newTagIds, ...parsed.tagIds]));
    const priority = parsed.priority ?? newPriority;
    const dueDate =
      parsed.dueDate ?? newDueDate ?? (mode === "compact" ? today : undefined);
    onAddItem(text, tagIds, newLink.trim() || undefined, dueDate, priority);
    setNewText("");
    setNewTagIds([]);
    setNewLink("");
    setNewDueDate("");
    setNewPriority(undefined);
    setShowLinkInput(false);
  }

  const tagFiltered =
    tagFilters.size === 0
      ? items
      : items.filter((it) => it.tagIds.some((id) => tagFilters.has(id)));

  // Compact mode (dashboard widget): one flat "today" bucket — due today,
  // overdue, or undated (undated tasks are treated as always-actionable).
  const visibleItems = isFull
    ? tagFiltered
    : tagFiltered.filter(
        (it) => !it.dueDate || it.dueDate <= today || isOverdue(it, today),
      );

  const grouped = useMemo(() => {
    const map = new Map<TaskGroupKey, TodoItem[]>();
    for (const key of TASK_GROUP_ORDER) map.set(key, []);
    for (const it of visibleItems) {
      map.get(getTaskGroup(it, today))!.push(it);
    }
    for (const key of TASK_GROUP_ORDER) {
      map.get(key)!.sort(compareTasks);
    }
    return map;
  }, [visibleItems, today]);

  // Compact mode has no groups of its own — just a sorted flat list.
  const compactSorted = useMemo(
    () => [...visibleItems].sort(compareTasks),
    [visibleItems],
  );

  const openCount = visibleItems.filter((it) => !it.done).length;
  const doneItems = items.filter((it) => it.done);

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
          <div className="flex items-center gap-1">
            {isFull && (
              <button
                type="button"
                onClick={() =>
                  selectMode ? exitSelectMode() : setSelectMode(true)
                }
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs transition-colors cursor-pointer",
                  selectMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <ListChecksIcon className="size-3" />
                {selectMode ? "Cancel" : "Select"}
              </button>
            )}
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
        </div>

        <Separator />

        {/* ── Tag filter bar (full mode only, multi-select) ── */}
        {isFull && tags.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-4 py-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setTagFilters(new Set())}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer",
                  tagFilters.size === 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                )}
              >
                All
              </button>
              {tags.map((tag) => {
                const active = tagFilters.has(tag.id);
                const hex = isHexColor(tag.color);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagFilter(tag.id)}
                    style={active && hex ? hexTagStyle(tag.color) : undefined}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer",
                      active
                        ? cn(!hex && tag.color, "ring-2 ring-offset-1 ring-primary/30")
                        : "border-border text-muted-foreground hover:border-primary",
                    )}
                  >
                    {tag.name}
                    <span className="text-[9px] opacity-70">
                      {items.filter((it) => it.tagIds.includes(tag.id)).length}
                    </span>
                  </button>
                );
              })}
            </div>
            <Separator />
          </>
        )}

        {/* ── Bulk toolbar ── */}
        {isFull && selectMode && (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-primary/8">
              <span className="text-[11.5px] font-semibold text-primary">
                {selectedIds.size} selected
              </span>
              <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => {
                    onBulkComplete?.(Array.from(selectedIds));
                    exitSelectMode();
                  }}
                  className="cursor-pointer text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
                >
                  Complete
                </button>
                {tags.length > 0 && (
                  <Dropdown
                    open={bulkTagOpen}
                    onOpenChange={setBulkTagOpen}
                    className="w-52 p-2"
                    triggerClassName="text-primary hover:underline disabled:opacity-40"
                    triggerContent="Add tag"
                  >
                    <TagPickerBody
                      allTags={tags}
                      selectedIds={[]}
                      onToggle={(id) => {
                        if (selectedIds.size > 0)
                          onBulkAddTag?.(Array.from(selectedIds), id);
                        setBulkTagOpen(false);
                      }}
                    />
                  </Dropdown>
                )}
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={() => {
                    onBulkDelete?.(Array.from(selectedIds));
                    exitSelectMode();
                  }}
                  className="cursor-pointer text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:no-underline"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* ── Quick add ── */}
        <div className="border-b border-border">
          <div className="flex items-center gap-2 px-4 py-3">
            <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a task... try #tag, !high, @tomorrow"
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

            <button
              type="button"
              onClick={() => setNewPriority(nextPriority(newPriority))}
              className={cn(
                "cursor-pointer inline-flex items-center justify-center size-7 rounded hover:bg-muted transition-colors shrink-0",
                newPriority === "high" && "text-destructive",
                newPriority === "med" && "text-orange-500",
                !newPriority && "text-muted-foreground hover:text-foreground",
              )}
              title={
                newPriority
                  ? `Priority: ${newPriority === "high" ? "High" : "Medium"}`
                  : "Set priority"
              }
            >
              <FlagIcon className="size-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLinkInput((v) => !v)}
              className={cn(
                "cursor-pointer inline-flex items-center justify-center size-7 rounded hover:bg-muted transition-colors shrink-0",
                showLinkInput || newLink
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Add link"
            >
              <LinkIcon className="size-3.5" />
            </button>

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
              disabled={!parsed.cleanText}
              className="h-7 px-3 text-xs shrink-0"
            >
              Add
            </Button>
          </div>

          {showLinkInput && (
            <div className="flex items-center gap-2 px-4 pb-3">
              <LinkIcon className="size-3 text-muted-foreground shrink-0" />
              <input
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="https://..."
                className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground/50 min-w-0"
              />
              {newLink && (
                <button
                  type="button"
                  onClick={() => setNewLink("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          )}

          {(parsed.matchedTags.length > 0 ||
            parsed.priority ||
            parsed.dueLabel) && (
            <div className="flex items-center gap-1.5 flex-wrap px-4 pb-3 pt-0.5">
              <span className="text-[10px] text-muted-foreground/70">
                Parsed:
              </span>
              {parsed.matchedTags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
              {parsed.priority && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                    parsed.priority === "high"
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-orange-500/10 text-orange-500 border-orange-500/30",
                  )}
                >
                  {parsed.priority === "high" ? "high" : "medium"}
                </span>
              )}
              {parsed.dueLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                  <CalendarIcon className="size-2.5" />
                  {parsed.dueLabel}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Task list ── */}
        {visibleItems.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground/60 py-8">
            {tagFilters.size > 0
              ? "No tasks with these tags."
              : mode === "compact"
                ? "No tasks for today. Add one above."
                : "No tasks yet. Add one above."}
          </p>
        ) : isFull ? (
          <div className="py-1">
            {TASK_GROUP_ORDER.map((key) => (
              <GroupSection
                key={key}
                groupKey={key}
                items={grouped.get(key) ?? []}
                allTags={tags}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleItem={onToggleItem}
                onDeleteItem={onDeleteItem}
                onUpdateItem={onUpdateItem}
                onReorderItems={onReorderItems}
                collapsible={key === "done"}
              />
            ))}
          </div>
        ) : (
          <FlatCompactList
            items={compactSorted}
            allTags={tags}
            onToggleItem={onToggleItem}
            onDeleteItem={onDeleteItem}
            onUpdateItem={onUpdateItem}
            onReorderItems={onReorderItems}
          />
        )}

        {/* ── Footer ── */}
        {!isFull && doneItems.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {doneItems.length} completed
              </span>
              <button
                type="button"
                onClick={() => doneItems.forEach((it) => onDeleteItem(it.id))}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
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

// ── Flat list used by compact (dashboard widget) mode ──────────────────────
function FlatCompactList({
  items,
  allTags,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
  onReorderItems,
}: {
  items: TodoItem[];
  allTags: TodoTag[];
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, patch: TodoPatch) => void;
  onReorderItems: (fromId: string, toId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="py-1">
      {items.map((item) => (
        <TaskRow
          key={item.id}
          item={item}
          allTags={allTags}
          onToggle={() => onToggleItem(item.id)}
          onDelete={() => onDeleteItem(item.id)}
          onUpdate={(patch) => onUpdateItem(item.id, patch)}
          isDragOver={overId === item.id && dragId !== item.id}
          dragHandlers={
            item.done
              ? undefined
              : {
                  onDragStart: () => setDragId(item.id),
                  onDragEnter: () => setOverId(item.id),
                  onDragEnd: () => {
                    if (dragId && overId && dragId !== overId) {
                      onReorderItems(dragId, overId);
                    }
                    setDragId(null);
                    setOverId(null);
                  },
                }
          }
        />
      ))}
    </div>
  );
}
