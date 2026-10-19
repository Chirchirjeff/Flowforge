"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";

const STYLE_MAP = {
  note:    "bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-700 dark:text-yellow-200",
  warning: "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-200",
  info:    "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-200",
};
const ICON_MAP = { note: "📝", warning: "⚠️", info: "ℹ️" };

export const LabelNode = memo(function LabelNode({ id, selected }: NodeProps) {
  const { selectNode, deleteNode } = useWorkflowStore();
  const nodes = useWorkflowStore((s) => s.nodes);
  const node = nodes.find((n) => n.id === id);
  const config = (node?.data as { config?: Record<string, unknown> })?.config ?? {};
  const text  = (config["text"] as string) || "Add your note here…";
  const style = (config["style"] as keyof typeof STYLE_MAP) || "note";

  return (
    <div
      onClick={() => selectNode(id)}
      className={[
        "group relative min-w-[140px] max-w-[260px] rounded-lg border-2 p-3 cursor-pointer select-none transition-all",
        STYLE_MAP[style] ?? STYLE_MAP.note,
        selected ? "ring-2 ring-offset-1 ring-offset-[var(--background)] ring-blue-400" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm">{ICON_MAP[style] ?? "📝"}</span>
        <p className="flex-1 text-xs leading-relaxed whitespace-pre-wrap">{text}</p>
        <button
          onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-current/50 hover:text-current"
          title="Delete note"
        >
          ×
        </button>
      </div>
    </div>
  );
});
