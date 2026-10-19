"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import {
  Play, CheckSquare, ThumbsUp, GitBranch,
  Bell, Cpu, Square, StickyNote, CornerUpLeft,
} from "lucide-react";
import { BaseNode } from "./BaseNode";
import { LabelNode } from "./LabelNode";
import { useWorkflowStore } from "@/store/workflow-store";

// ── Factory ───────────────────────────────────────────────────────────────────

function makeNode(domainType: string, icon: React.ReactNode) {
  const Comp = memo(function FlowNode(props: NodeProps) {
    const registry = useWorkflowStore((s) => s.nodeTypeRegistry);
    const descriptor = registry.find((d) => d.type === domainType);
    if (!descriptor) {
      return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">
          {domainType}
        </div>
      );
    }
    return <BaseNode {...props} descriptor={descriptor} icon={icon} />;
  });
  Comp.displayName = `FlowNode_${domainType}`;
  return Comp;
}

// ── Node type map ─────────────────────────────────────────────────────────────
// Keys must match: descriptor.type with "/" replaced by "-"

export const nodeTypes = {
  // Spec-aligned types
  "start":          makeNode("start",          <Play size={13} />),
  "user-task":      makeNode("user-task",      <CheckSquare size={13} />),
  "approval":       makeNode("approval",       <ThumbsUp size={13} />),
  "return":         makeNode("return",          <CornerUpLeft size={13} />),
  "condition":      makeNode("condition",      <GitBranch size={13} />),
  "notification":   makeNode("notification",   <Bell size={13} />),
  "automated-task": makeNode("automated-task", <Cpu size={13} />),
  "end":            makeNode("end",            <Square size={13} />),
  "label":          LabelNode,

  // Legacy types kept for backwards-compatibility with saved graphs
  "trigger-manual":      makeNode("trigger/manual",       <Play size={13} />),
  "trigger-webhook":     makeNode("trigger/webhook",      <Play size={13} />),
  "action-http":         makeNode("action/http",          <Cpu size={13} />),
  "action-log":          makeNode("action/log",           <StickyNote size={13} />),
  "action-set-variable": makeNode("action/set-variable",  <StickyNote size={13} />),
  "logic-condition":     makeNode("logic/condition",      <GitBranch size={13} />),
  "logic-delay":         makeNode("logic/delay",          <Cpu size={13} />),
  "logic-merge":         makeNode("logic/merge",          <GitBranch size={13} />),
};
