"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import type { WorkflowNode, WorkflowEdge, NodeTypeDescriptor } from "@/lib/types";
import { workflowDefsApi } from "@/lib/api";
import { BUILT_IN_NODE_TYPES } from "@/lib/node-type-registry";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function domainNodeToRF(n: WorkflowNode): Node {
  return {
    id: n.id,
    // "user-task" → "user-task", "condition" → "condition" (types already use hyphens now)
    type: n.type.replace("/", "-"),
    position: n.position,
    data: { config: n.config ?? {}, domainType: n.type },
  };
}

function rfNodeToDomain(n: Node): WorkflowNode {
  const domainType: string =
    (n.data as { domainType?: string }).domainType ?? n.type ?? "";
  return {
    id: n.id,
    type: domainType,
    position: n.position,
    config: (n.data as { config?: Record<string, unknown> }).config ?? {},
  };
}

function domainEdgeToRF(e: WorkflowEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle,
    target: e.target,
    targetHandle: e.targetHandle,
    label: e.label,
    data: e.condition ? { condition: e.condition } : undefined,
  };
}

function rfEdgeToDomain(e: Edge): WorkflowEdge {
  return {
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? "",
    target: e.target,
    targetHandle: e.targetHandle ?? "",
    label: typeof e.label === "string" ? e.label : undefined,
    condition: (e.data as { condition?: WorkflowEdge["condition"] } | undefined)?.condition,
  };
}

// ─── Store shape ───────────────────────────────────────────────────────────────

export interface WorkflowMeta {
  id: string;           // WorkflowVersion id (used for saveGraph)
  definitionId: string;
  name: string;
  description: string;
  versionNumber: number;
  versionStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

interface WorkflowState {
  workflow: WorkflowMeta | null;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  nodeTypeRegistry: NodeTypeDescriptor[];
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;

  // actions
  loadWorkflow: (definitionId: string) => Promise<void>;
  saveWorkflow: () => Promise<void>;
  publishWorkflow: () => Promise<void>;
  validateWorkflow: () => Promise<{ valid: boolean; errors: string[] }>;

  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (descriptor: NodeTypeDescriptor, position: { x: number; y: number }) => void;
  selectNode: (id: string | null) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;
  renameWorkflow: (name: string) => void;
  renameNodeType: (type: string, label: string) => void;
  loadNodeTypeLabels: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowState>()(
  immer((set, get) => ({
    workflow: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    // Registry is seeded from the local constant — no API call needed
    nodeTypeRegistry: BUILT_IN_NODE_TYPES,
    isDirty: false,
    isSaving: false,
    isPublishing: false,

    // ── Load ──────────────────────────────────────────────────────────────────

    loadWorkflow: async (definitionId: string) => {
      // GET /workflow-definitions/:id returns the definition with all versions[]
      // versions are ordered by version desc, so [0] is always the latest
      const def = await workflowDefsApi.get(definitionId);
      const version = def.versions?.[0];
      const graph = (version?.graph as { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null) ?? {
        nodes: [],
        edges: [],
      };

      const meta: WorkflowMeta = {
        id: version?.id ?? def.id,
        definitionId: def.id,
        name: def.name,
        description: def.description ?? "",
        versionNumber: version?.version ?? 1,
        versionStatus: (version?.status as WorkflowMeta["versionStatus"]) ?? "DRAFT",
      };

      set((s) => {
        s.workflow = meta;
        s.nodes = (graph.nodes ?? []).map(domainNodeToRF);
        s.edges = (graph.edges ?? []).map(domainEdgeToRF);
        s.isDirty = false;
        s.selectedNodeId = null;
      });
    },

    // ── Save ──────────────────────────────────────────────────────────────────

    saveWorkflow: async () => {
      const { workflow, nodes, edges } = get();
      if (!workflow) return;
      set((s) => { s.isSaving = true; });
      try {
        await workflowDefsApi.saveGraph(workflow.id, {
          nodes: nodes.map(rfNodeToDomain),
          edges: edges.map(rfEdgeToDomain),
        });
        // Also persist name if it changed
        await workflowDefsApi.update(workflow.definitionId, { name: workflow.name });
        set((s) => { s.isDirty = false; });
      } finally {
        set((s) => { s.isSaving = false; });
      }
    },

    // ── Publish ───────────────────────────────────────────────────────────────

    publishWorkflow: async () => {
      const { workflow } = get();
      if (!workflow) return;
      set((s) => { s.isPublishing = true; });
      try {
        // Save first to make sure the graph is up-to-date
        await get().saveWorkflow();
        await workflowDefsApi.publish(workflow.id);
        set((s) => {
          if (s.workflow) s.workflow.versionStatus = "PUBLISHED";
          s.isDirty = false;
        });
      } finally {
        set((s) => { s.isPublishing = false; });
      }
    },

    validateWorkflow: async () => {
      const { workflow, nodes, edges } = get();
      if (!workflow) return { valid: false, errors: ["Workflow is not loaded."] };
      return workflowDefsApi.validate(workflow.id, {
        nodes: nodes.map(rfNodeToDomain),
        edges: edges.map(rfEdgeToDomain),
      });
    },

    // ── ReactFlow callbacks ───────────────────────────────────────────────────

    onNodesChange: (changes) => {
      set((s) => {
        s.nodes = applyNodeChanges(changes, s.nodes);
        s.isDirty = true;
      });
    },

    onEdgesChange: (changes) => {
      set((s) => {
        s.edges = applyEdgeChanges(changes, s.edges);
        s.isDirty = true;
      });
    },

    onConnect: (connection) => {
      set((s) => {
        s.edges = addEdge({ ...connection, id: crypto.randomUUID() }, s.edges);
        s.isDirty = true;
      });
    },

    // ── Node operations ───────────────────────────────────────────────────────

    addNode: (descriptor, position) => {
      const id = crypto.randomUUID();
      // Build default config from schema
      const defaultConfig: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(
        descriptor.configSchema as Record<string, { default?: unknown }>
      )) {
        if (field.default !== undefined) defaultConfig[key] = field.default;
      }
      const newNode: Node = {
        id,
        type: descriptor.type.replace("/", "-"),
        position,
        data: { config: defaultConfig, domainType: descriptor.type },
      };
      set((s) => {
        s.nodes.push(newNode);
        s.selectedNodeId = id;
        s.isDirty = true;
      });
    },

    selectNode: (id) => {
      set((s) => { s.selectedNodeId = id; });
    },

    updateNodeConfig: (nodeId, config) => {
      set((s) => {
        const node = s.nodes.find((n) => n.id === nodeId);
        if (node) {
          (node.data as Record<string, unknown>).config = config;
          s.isDirty = true;
        }
      });
    },

    deleteNode: (nodeId) => {
      set((s) => {
        s.nodes = s.nodes.filter((n) => n.id !== nodeId);
        s.edges = s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
        if (s.selectedNodeId === nodeId) s.selectedNodeId = null;
        s.isDirty = true;
      });
    },

    renameWorkflow: (name) => {
      set((s) => {
        if (s.workflow) { s.workflow.name = name; s.isDirty = true; }
      });
    },

    renameNodeType: (type, label) => {
      const cleanLabel = label.trim();
      if (!cleanLabel) return;
      set((s) => {
        s.nodeTypeRegistry = s.nodeTypeRegistry.map((descriptor) =>
          descriptor.type === type ? { ...descriptor, label: cleanLabel } : descriptor
        );
      });
      try {
        const labels = JSON.parse(localStorage.getItem("flowforge-node-labels") ?? "{}") as Record<string, string>;
        labels[type] = cleanLabel;
        localStorage.setItem("flowforge-node-labels", JSON.stringify(labels));
      } catch {
        // The current session still keeps the renamed label if storage is unavailable.
      }
    },

    loadNodeTypeLabels: () => {
      try {
        const labels = JSON.parse(localStorage.getItem("flowforge-node-labels") ?? "{}") as Record<string, string>;
        set((s) => {
          s.nodeTypeRegistry = BUILT_IN_NODE_TYPES.map((descriptor) => ({
            ...descriptor,
            label: labels[descriptor.type]?.trim() || descriptor.label,
          }));
        });
      } catch {
        // Keep the built-in labels when browser storage is unavailable or invalid.
      }
    },
  }))
);
