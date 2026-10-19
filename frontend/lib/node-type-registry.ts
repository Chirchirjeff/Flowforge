/**
 * Built-in node type descriptors.
 * These are defined here (not fetched from the backend) because the node type
 * palette is a frontend design concern — the backend cares about execution
 * semantics, not UI metadata.
 *
 * To add a new node type:
 *  1. Add a descriptor here
 *  2. Add the ReactFlow type key in nodes/nodeRegistry.tsx
 *  3. Add execution logic in backend/src/workflow-engine/workflow-engine.service.ts
 */

import type { NodeTypeDescriptor } from "./types";

export const BUILT_IN_NODE_TYPES: NodeTypeDescriptor[] = [
  // ── Triggers ──────────────────────────────────────────────────────────────

  {
    type: "start",
    category: "trigger",
    label: "Start",
    description: "Entry point — every workflow must have exactly one start node.",
    color: "#6366f1",
    inputs: [],
    outputs: [{ id: "out", label: "Begin", type: "control" }],
    configSchema: {},
  },

  // ── User interaction ───────────────────────────────────────────────────────

  {
    type: "user-task",
    category: "task",
    label: "User Task",
    description: "Assigns work to a specific user or role. Waits for submission.",
    color: "#0ea5e9",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [{ id: "out", label: "Submitted", type: "control" }],
    configSchema: {
      title: {
        type: "string",
        label: "Task title",
        description: "Shown to the assigned user",
        default: "",
        required: true,
      },
      description: {
        type: "textarea",
        label: "Instructions",
        description: "Detailed instructions for the assignee",
        default: "",
      },
      assignmentType: {
        type: "select",
        label: "Assignment type",
        enum: ["user", "role", "initiator"],
        default: "role",
      },
      assignmentValue: {
        type: "string",
        label: "User / Role",
        description: "Username or role name",
        default: "",
      },
      dueDays: {
        type: "number",
        label: "Due in (days)",
        description: "Optional SLA — days from task creation",
        default: null,
      },
      priority: {
        type: "select",
        label: "Priority",
        enum: ["0", "1", "2"],
        enumLabels: ["Normal", "High", "Urgent"],
        default: "0",
      },
      formFields: {
        type: "form-fields",
        label: "Form fields",
        description: "Fields the user must fill in",
        default: [],
      },
    },
  },

  {
    type: "approval",
    category: "task",
    label: "Approval",
    description: "Collects an Approve or Reject decision from an assigned user or role.",
    color: "#8b5cf6",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [
      { id: "approved", label: "Approved", type: "control" },
      { id: "rejected", label: "Rejected", type: "control" },
      { id: "returned", label: "Returned", type: "control" },
    ],
    configSchema: {
      title: {
        type: "string",
        label: "Approval title",
        description: "What is being approved",
        default: "",
        required: true,
      },
      description: {
        type: "textarea",
        label: "Instructions",
        description: "Context for the approver",
        default: "",
      },
      assignmentType: {
        type: "select",
        label: "Assignment type",
        enum: ["user", "role"],
        default: "role",
      },
      assignmentValue: {
        type: "string",
        label: "User / Role",
        default: "",
      },
      dueDays: {
        type: "number",
        label: "Due in (days)",
        default: null,
      },
      allowComment: {
        type: "boolean",
        label: "Require comment",
        description: "Require the approver to enter a comment",
        default: false,
      },
    },
  },

  {
    type: "return",
    category: "task",
    label: "Return",
    description: "Routes work back for correction through its outgoing connection.",
    color: "#f97316",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [{ id: "out", label: "Resubmitted", type: "control" }],
    configSchema: {
      requireComment: {
        type: "boolean",
        label: "Require return comment",
        default: true,
      },
    },
  },

  // ── Logic / routing ────────────────────────────────────────────────────────

  {
    type: "condition",
    category: "logic",
    label: "Condition",
    description: "Routes the workflow based on a field value or expression.",
    color: "#f59e0b",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [
      { id: "true", label: "Yes", type: "control" },
      { id: "false", label: "No", type: "control" },
    ],
    configSchema: {
      field: {
        type: "string",
        label: "Variable / field name",
        description: "The variable to evaluate (e.g. _lastAction)",
        default: "_lastAction",
      },
      operator: {
        type: "select",
        label: "Operator",
        enum: ["equals", "not_equals", "contains", "gt", "lt"],
        enumLabels: ["equals", "not equals", "contains", "greater than", "less than"],
        default: "equals",
      },
      value: {
        type: "string",
        label: "Expected value",
        default: "approved",
      },
    },
  },

  // ── Actions ────────────────────────────────────────────────────────────────

  {
    type: "notification",
    category: "action",
    label: "Notification",
    description: "Sends an email or in-app notification to a user or role.",
    color: "#10b981",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [{ id: "out", label: "Sent", type: "control" }],
    configSchema: {
      recipient: {
        type: "select",
        label: "Recipient",
        enum: ["initiator", "role", "user", "assignee"],
        default: "initiator",
      },
      recipientValue: {
        type: "string",
        label: "Role / User",
        description: "Required when recipient is role or user",
        default: "",
      },
      channel: {
        type: "select",
        label: "Channel",
        enum: ["email", "in-app", "both"],
        default: "in-app",
      },
      subject: {
        type: "string",
        label: "Subject / Title",
        default: "",
      },
      message: {
        type: "textarea",
        label: "Message body",
        description: "Supports {{variable}} placeholders",
        default: "",
      },
    },
  },

  {
    type: "automated-task",
    category: "action",
    label: "Automated Task",
    description: "Runs a backend integration or system operation without user input.",
    color: "#64748b",
    inputs: [{ id: "in", label: "Execute", type: "control" }],
    outputs: [
      { id: "out", label: "Success", type: "control" },
      { id: "error", label: "Error", type: "control" },
    ],
    configSchema: {
      operation: {
        type: "select",
        label: "Operation",
        enum: ["http-request", "set-variable", "log", "delay"],
        default: "http-request",
      },
      url: {
        type: "string",
        label: "URL",
        description: "For http-request",
        default: "",
      },
      method: {
        type: "select",
        label: "HTTP Method",
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        default: "GET",
      },
      body: {
        type: "textarea",
        label: "Request body (JSON)",
        default: "",
      },
      variableName: {
        type: "string",
        label: "Variable name",
        description: "For set-variable",
        default: "",
      },
      variableValue: {
        type: "string",
        label: "Variable value",
        description: "Supports {{expressions}}",
        default: "",
      },
      logMessage: {
        type: "string",
        label: "Log message",
        default: "",
      },
      delaySeconds: {
        type: "number",
        label: "Delay (seconds)",
        default: 5,
      },
    },
  },

  // ── Terminals ──────────────────────────────────────────────────────────────

  {
    type: "end",
    category: "terminal",
    label: "End",
    description: "Terminates this path of the workflow. A workflow can have multiple End nodes.",
    color: "#ef4444",
    inputs: [{ id: "in", label: "Finish", type: "control" }],
    outputs: [],
    configSchema: {
      outcome: {
        type: "select",
        label: "Final outcome",
        enum: ["completed", "approved", "rejected", "cancelled"],
        default: "completed",
      },
      message: {
        type: "string",
        label: "Completion message",
        description: "Optional message shown to the case creator",
        default: "",
      },
    },
  },

  // ── Annotations ───────────────────────────────────────────────────────────

  {
    type: "label",
    category: "annotation",
    label: "Label / Note",
    description: "A non-executing annotation or comment on the canvas.",
    color: "#94a3b8",
    inputs: [],
    outputs: [],
    configSchema: {
      text: {
        type: "textarea",
        label: "Note text",
        default: "Add your note here…",
      },
      style: {
        type: "select",
        label: "Style",
        enum: ["note", "warning", "info"],
        enumLabels: ["Note", "Warning", "Info"],
        default: "note",
      },
    },
  },
];

/** Lookup by type key */
export function getNodeTypeDescriptor(type: string): NodeTypeDescriptor | undefined {
  return BUILT_IN_NODE_TYPES.find((d) => d.type === type);
}

/** Group by category in display order */
export const NODE_TYPE_CATEGORIES = ["trigger", "task", "logic", "action", "terminal", "annotation"];
export const CATEGORY_LABELS: Record<string, string> = {
  trigger:    "Triggers",
  task:       "Tasks",
  logic:      "Logic",
  action:     "Actions",
  terminal:   "Terminals",
  annotation: "Annotations",
};
