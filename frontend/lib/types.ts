// ─── Mirror of backend/src/shared/types.ts ────────────────────────────────────
// Kept separate so the frontend has no Node.js imports.

export interface Port {
  id: string;
  label: string;
  type: "data" | "control";
}

export interface NodeTypeDescriptor {
  type: string;
  category: string;
  label: string;
  description: string;
  color: string;
  inputs: Port[];
  outputs: Port[];
  configSchema: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  label?: string;
  condition?: {
    field: string;
    operator: "equals" | "not_equals" | "gt" | "lt" | "contains";
    value: unknown;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  nodeResults: NodeExecutionResult[];
  startedAt: string;
  finishedAt?: string;
  error?: string;
}
