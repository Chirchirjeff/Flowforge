"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { NodeTypeDescriptor } from "@/lib/types";

// ── Category → visual style map ───────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { ring: string; badge: string }> = {
  trigger:    { ring: "ring-indigo-400/40",  badge: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" },
  task:       { ring: "ring-sky-400/40",     badge: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300" },
  logic:      { ring: "ring-amber-400/40",   badge: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300" },
  action:     { ring: "ring-emerald-400/40", badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300" },
  terminal:   { ring: "ring-red-400/40",     badge: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300" },
  annotation: { ring: "ring-slate-400/40",   badge: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

// ── Handle dot colours ────────────────────────────────────────────────────────

const HANDLE_COLORS: Record<string, string> = {
  "approved":  "#10b981",
  "rejected":  "#ef4444",
  "returned":  "#f97316",
  "true":      "#10b981",
  "false":     "#ef4444",
  "error":     "#ef4444",
  "out":       "#94a3b8",
  "in":        "#94a3b8",
  "begin":     "#6366f1",
  "finish":    "#ef4444",
};

interface BaseNodeProps extends NodeProps {
  descriptor: NodeTypeDescriptor;
  icon: React.ReactNode;
}

export const BaseNode = memo(function BaseNode({
  id,
  selected,
  descriptor,
  icon,
}: BaseNodeProps) {
  const { selectNode, deleteNode } = useWorkflowStore();
  const node = useWorkflowStore((s) => s.nodes.find((item) => item.id === id));
  const config = (node?.data as { config?: Record<string, unknown> } | undefined)?.config ?? {};
  const nodeLabel = typeof config._label === "string" && config._label.trim()
    ? config._label.trim()
    : descriptor.label;
  const style = CATEGORY_STYLES[descriptor.category] ?? CATEGORY_STYLES["action"];

  const isStart = descriptor.type === "start";
  const isEnd   = descriptor.type === "end";

  return (
    <div
      onClick={() => selectNode(id)}
      className={[
        "group relative min-w-[160px] max-w-[220px] rounded-xl bg-[var(--surface)] shadow-sm cursor-pointer select-none transition-all",
        "border border-[var(--border)]",
        selected
          ? `ring-2 ring-offset-1 ring-offset-[var(--background)] shadow-md border-transparent ${style.ring}`
          : "hover:border-[var(--border-strong)] hover:shadow-md",
        // Start/End get special shapes
        isStart ? "rounded-full px-5 py-3 min-w-[120px] text-center" : "",
        isEnd   ? "rounded-full px-5 py-3 min-w-[120px] text-center" : "",
      ].join(" ")}
    >
      {/* Input handles */}
      {descriptor.inputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="target"
          position={Position.Left}
          style={{
            top: `${((i + 1) / (descriptor.inputs.length + 1)) * 100}%`,
            width: 11,
            height: 11,
            background: HANDLE_COLORS[port.id] ?? "#94a3b8",
            border: "2px solid var(--surface)",
            borderRadius: "50%",
          }}
          title={port.label}
        />
      ))}

      {/* ── Node body ──────────────────────────────────────────────────────── */}

      {isStart || isEnd ? (
        // Pill layout for Start/End
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: descriptor.color }}
          >
            {icon}
          </span>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            {nodeLabel}
          </span>
        </div>
      ) : (
        <>
          {/* Header */}
          <div
            className="flex items-center gap-2 rounded-t-xl px-3 py-2.5"
            style={{ background: descriptor.color + "18", borderBottom: `1px solid ${descriptor.color}30` }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: descriptor.color }}
            >
              {icon}
            </span>
            <span className="flex-1 truncate text-xs font-semibold text-[var(--foreground)]">
              {nodeLabel}
            </span>
            {/* Category badge */}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>
              {descriptor.category}
            </span>
            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] hover:text-[var(--danger)]"
              title="Delete node"
            >
              <Trash2 size={11} />
            </button>
          </div>

          {/* Config preview */}
          <NodeConfigPreview id={id} descriptor={descriptor} />
        </>
      )}

      {/* Output handles */}
      {descriptor.outputs.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{
            top: `${((i + 1) / (descriptor.outputs.length + 1)) * 100}%`,
            width: 11,
            height: 11,
            background: HANDLE_COLORS[port.id] ?? "#94a3b8",
            border: "2px solid var(--surface)",
            borderRadius: "50%",
          }}
          title={port.label}
        />
      ))}

      {/* Output port labels (for multi-output nodes like condition/approval) */}
      {descriptor.outputs.length > 1 && (
        <div className="absolute -right-16 top-0 h-full flex flex-col justify-around pointer-events-none">
          {descriptor.outputs.map((port) => (
            <span key={port.id} className="text-[9px] text-[var(--muted)] leading-none">
              {port.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// ── Inline config preview shown on the node body ──────────────────────────────

function NodeConfigPreview({ id, descriptor }: { id: string; descriptor: NodeTypeDescriptor }) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const node = nodes.find((n) => n.id === id);
  const config = (node?.data as { config?: Record<string, unknown> })?.config ?? {};

  // Show the first meaningful filled-in string field as a subtitle
  const schema = descriptor.configSchema as Record<string, { type: string; label: string }>;
  const preview = Object.entries(schema)
    .filter(([, f]) => f.type === "string" || f.type === "textarea" || f.type === "select")
    .map(([k]) => config[k])
    .find((v) => typeof v === "string" && v.trim() !== "");

  // Show assignment if present
  const assignType  = config["assignmentType"] as string | undefined;
  const assignValue = config["assignmentValue"] as string | undefined;

  const formFields = config["formFields"] as unknown[] | undefined;
  const fieldCount = Array.isArray(formFields) ? formFields.length : 0;

  return (
    <div className="px-3 py-2 space-y-0.5">
      {preview !== undefined && preview !== null && (
        <p className="truncate text-[11px] font-medium text-[var(--foreground)]">
          {String(preview)}
        </p>
      )}
      {assignType && assignValue && (
        <p className="text-[10px] text-[var(--muted)]">
          → {assignType}: <span className="text-[var(--foreground)]">{assignValue}</span>
        </p>
      )}
      {fieldCount > 0 && (
        <p className="text-[10px] text-[var(--muted)]">
          {fieldCount} form field{fieldCount !== 1 ? "s" : ""}
        </p>
      )}
      {!preview && !assignValue && fieldCount === 0 && (
        <p className="text-[10px] italic text-[var(--border-strong)]">Not configured</p>
      )}
    </div>
  );
}
