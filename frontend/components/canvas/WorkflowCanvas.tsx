"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflowStore } from "@/store/workflow-store";
import { nodeTypes } from "./nodes/nodeRegistry";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { CanvasToolbar } from "./CanvasToolbar";
import type { NodeTypeDescriptor } from "@/lib/types";

export function WorkflowCanvas() {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    selectNode, addNode, selectedNodeId,
    workflow,
  } = useWorkflowStore();

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const isReadOnly = workflow?.versionStatus === "PUBLISHED" || workflow?.versionStatus === "ARCHIVED";

  // ── Drag-from-palette drop handler ─────────────────────────────────────────

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const nodeType = e.dataTransfer.getData("application/flowforge-node");
    if (!nodeType || !rfInstanceRef.current) return;
    const position = rfInstanceRef.current.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });
    const registry = useWorkflowStore.getState().nodeTypeRegistry;
    const descriptor = registry.find((d) => d.type === nodeType);
    if (descriptor) addNode(descriptor, position);
  }, [addNode, isReadOnly]);

  // ── Click-to-add from palette ──────────────────────────────────────────────

  const handleAddFromPalette = useCallback((descriptor: NodeTypeDescriptor) => {
    const jitter = () => Math.random() * 80 - 40;
    addNode(descriptor, { x: 300 + jitter(), y: 200 + jitter() });
  }, [addNode]);

  return (
    // Full viewport height — no AppLayout wrapper on this page
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--background)]">
      {/* Top toolbar */}
      <CanvasToolbar />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left palette — hidden when read-only */}
        {!isReadOnly && (
          <NodePalette
            onAddNode={handleAddFromPalette}
            collapsed={paletteCollapsed}
            onToggleCollapsed={() => setPaletteCollapsed((collapsed) => !collapsed)}
          />
        )}

        {/* Canvas */}
        <div
          className="relative flex-1"
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={isReadOnly ? undefined : onNodesChange}
            onEdgesChange={isReadOnly ? undefined : onEdgesChange}
            onConnect={isReadOnly ? undefined : onConnect}
            onInit={(instance: ReactFlowInstance) => { rfInstanceRef.current = instance; }}
            onPaneClick={() => selectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            deleteKeyCode={isReadOnly ? null : ["Backspace", "Delete"]}
            snapToGrid={!isReadOnly}
            snapGrid={[16, 16]}
            minZoom={0.15}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border)"
            />
            <Controls showInteractive={false} />
            <MiniMap
              nodeColor={(n) => {
                const registry = useWorkflowStore.getState().nodeTypeRegistry;
                const domainType = (n.data as { domainType?: string }).domainType;
                return registry.find((d) => d.type === domainType)?.color ?? "#94a3b8";
              }}
              zoomable
              pannable
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && !isReadOnly && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-3xl">✦</p>
              <p className="text-sm font-semibold text-[var(--muted)]">
                Start by adding a <span className="text-[var(--accent)]">Start</span> node
              </p>
              <p className="text-xs text-[var(--border-strong)]">
                Click a node type on the left, or drag it onto the canvas
              </p>
            </div>
          )}

          {/* Read-only overlay */}
          {isReadOnly && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full border border-[var(--success)]/40 bg-[var(--success-subtle)] px-4 py-1.5 text-xs font-semibold text-[var(--success)]">
                Published — view only
              </span>
            </div>
          )}
        </div>

        {/* Right config panel — shown when a node is selected and not read-only */}
        {selectedNodeId && !isReadOnly && <NodeConfigPanel />}
      </div>
    </div>
  );
}
