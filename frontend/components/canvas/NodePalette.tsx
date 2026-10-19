"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Play, CheckSquare, ThumbsUp, GitBranch,
  Bell, Cpu, Square, StickyNote,
  Search, ChevronDown, ChevronRight, ChevronLeft, Pencil, Check, X, CornerUpLeft,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  NODE_TYPE_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/node-type-registry";
import type { NodeTypeDescriptor } from "@/lib/types";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ReactNode> = {
  "start":          <Play size={14} />,
  "user-task":      <CheckSquare size={14} />,
  "approval":       <ThumbsUp size={14} />,
  "return":         <CornerUpLeft size={14} />,
  "condition":      <GitBranch size={14} />,
  "notification":   <Bell size={14} />,
  "automated-task": <Cpu size={14} />,
  "end":            <Square size={14} />,
  "label":          <StickyNote size={14} />,
};

// ── Category accent colours (match BaseNode ring colours) ─────────────────────

const CATEGORY_ACCENT: Record<string, string> = {
  trigger:    "#6366f1",
  task:       "#0ea5e9",
  logic:      "#f59e0b",
  action:     "#10b981",
  terminal:   "#ef4444",
  annotation: "#94a3b8",
};

// ── Single palette item ────────────────────────────────────────────────────────

function PaletteItem({
  descriptor,
  onAdd,
  onRename,
}: {
  descriptor: NodeTypeDescriptor;
  onAdd: (d: NodeTypeDescriptor) => void;
  onRename: (type: string, label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(descriptor.label);

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("application/flowforge-node", descriptor.type);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => !editing && onAdd(descriptor)}
      className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all hover:border-[var(--border)] hover:bg-[var(--surface-2)] active:scale-[0.97] cursor-pointer"
      title={descriptor.description}
    >
      {/* Colour icon */}
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
        style={{ background: descriptor.color }}
      >
        {ICONS[descriptor.type] ?? <Play size={14} />}
      </span>

      {/* Text */}
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-[var(--foreground)]">
          {editing ? (
            <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
              onClick={(e) => e.stopPropagation()} onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); onRename(descriptor.type, label); setEditing(false); }
                if (e.key === "Escape") { setLabel(descriptor.label); setEditing(false); }
              }}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-1 py-0.5 text-xs outline-none focus:border-[var(--accent)]" />
          ) : descriptor.label}
        </span>
        <span className="block truncate text-[10px] leading-snug text-[var(--muted)]">
          {descriptor.description}
        </span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {editing ? <>
          <button type="button" title="Save palette name" onClick={(e) => { e.stopPropagation(); onRename(descriptor.type, label); setEditing(false); }} className="rounded p-1 text-[var(--success)] hover:bg-[var(--surface)]"><Check size={12} /></button>
          <button type="button" title="Cancel" onClick={(e) => { e.stopPropagation(); setLabel(descriptor.label); setEditing(false); }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)]"><X size={12} /></button>
        </> : <button type="button" title="Rename palette node" onClick={(e) => { e.stopPropagation(); setLabel(descriptor.label); setEditing(true); }} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"><Pencil size={11} /></button>}
      </span>
    </div>
  );
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({
  category,
  items,
  onAdd,
  onRename,
}: {
  category: string;
  items: NodeTypeDescriptor[];
  onAdd: (d: NodeTypeDescriptor) => void;
  onRename: (type: string, label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const accent = CATEGORY_ACCENT[category] ?? "#94a3b8";

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left transition-colors hover:bg-[var(--surface-2)] rounded-md"
      >
        {/* Coloured dot */}
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: accent }} />
        <span className="flex-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          {CATEGORY_LABELS[category] ?? category}
        </span>
        <span className="text-[10px] text-[var(--border-strong)]">{items.length}</span>
        {open
          ? <ChevronDown size={11} className="text-[var(--muted)]" />
          : <ChevronRight size={11} className="text-[var(--muted)]" />}
      </button>

      {open && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((d) => (
            <PaletteItem key={d.type} descriptor={d} onAdd={onAdd} onRename={onRename} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main palette ──────────────────────────────────────────────────────────────

interface NodePaletteProps {
  onAddNode: (descriptor: NodeTypeDescriptor) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function NodePalette({ onAddNode, collapsed, onToggleCollapsed }: NodePaletteProps) {
  const registry = useWorkflowStore((s) => s.nodeTypeRegistry);
  const renameNodeType = useWorkflowStore((s) => s.renameNodeType);
  const loadNodeTypeLabels = useWorkflowStore((s) => s.loadNodeTypeLabels);
  const [query, setQuery] = useState("");

  useEffect(() => loadNodeTypeLabels(), [loadNodeTypeLabels]);

  // Filter by search query
  const filtered = useMemo(() => {
    if (!query.trim()) return registry;
    const q = query.toLowerCase();
    return registry.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [registry, query]);

  // Group filtered items by category, preserving display order
  const grouped = useMemo(() => {
    const map: Record<string, NodeTypeDescriptor[]> = {};
    for (const d of filtered) {
      if (!map[d.category]) map[d.category] = [];
      map[d.category].push(d);
    }
    return map;
  }, [filtered]);

  // Ordered category keys that have at least one item
  const categories = query.trim()
    ? Object.keys(grouped)
    : NODE_TYPE_CATEGORIES.filter((c) => grouped[c]?.length);

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-[width] duration-200 ${collapsed ? "w-11" : "w-60"}`}>
      {collapsed ? (
        <div className="flex justify-center px-1 pt-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expand node palette"
            title="Expand node palette"
            className="rounded-md p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      ) : <>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-3 pt-3 pb-2.5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Node palette
          </p>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Collapse node palette"
            title="Collapse node palette"
            className="rounded-md p-1 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nodes…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-7 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Search size={20} className="text-[var(--border-strong)]" />
            <p className="text-xs text-[var(--muted)]">No nodes match &quot;{query}&quot;</p>
            <button
              onClick={() => setQuery("")}
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          categories.map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              items={grouped[cat]}
              onAdd={onAddNode}
              onRename={renameNodeType}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="border-t border-[var(--border)] px-3 py-2.5">
        <p className="text-[10px] text-[var(--muted)]">
          Click to add · Drag onto canvas to place
        </p>
      </div>
      </>}
    </aside>
  );
}
