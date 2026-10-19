// ─── Typed API client for FlowForge backend ───────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// ── Token helpers (localStorage — browser only) ──────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ff_token");
}

export function setToken(token: string) {
  localStorage.setItem("ff_token", token);
}

export function clearToken() {
  localStorage.removeItem("ff_token");
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    const msg = data?.message ?? data?.error ?? `${res.status} ${res.statusText}`;
    throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
  }

  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  userRoles: Array<{
    role: {
      name: string;
      permissions: Array<{ permission: { key: string } }>;
    };
  }>;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: (): Promise<AuthUser> => request<AuthUser>("/auth/me"),
};

// ── Workflow Definitions ──────────────────────────────────────────────────────

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  versions: WorkflowVersion[];
  createdBy: { id: string; firstName: string; lastName: string; email: string };
}

export interface WorkflowVersion {
  id: string;
  definitionId: string;
  version: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  graph: { nodes: unknown[]; edges: unknown[] };
  publishedAt?: string;
  createdAt: string;
}

export const workflowDefsApi = {
  list: () => request<WorkflowDefinition[]>("/workflow-definitions"),
  get: (id: string) => request<WorkflowDefinition>(`/workflow-definitions/${id}`),
  create: (name: string, description?: string) =>
    request<WorkflowDefinition>("/workflow-definitions", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }),
  update: (id: string, patch: { name?: string; description?: string }) =>
    request<WorkflowDefinition>(`/workflow-definitions/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  saveGraph: (versionId: string, graph: { nodes: unknown[]; edges: unknown[] }) =>
    request(`/workflow-definitions/versions/${versionId}/graph`, {
      method: "PUT",
      body: JSON.stringify(graph),
    }),
  publish: (versionId: string) =>
    request(`/workflow-definitions/versions/${versionId}/publish`, { method: "POST" }),
  validate: (versionId: string, graph: { nodes: unknown[]; edges: unknown[] }) =>
    request<{ valid: boolean; errors: string[] }>(`/workflow-definitions/versions/${versionId}/validate`, {
      method: "POST",
      body: JSON.stringify(graph),
    }),
  newVersion: (definitionId: string) =>
    request<WorkflowVersion>(`/workflow-definitions/${definitionId}/versions`, { method: "POST" }),
};

// ── Cases ─────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | "OPEN" | "IN_PROGRESS" | "PENDING_APPROVAL"
  | "APPROVED" | "REJECTED" | "CLOSED" | "CANCELLED";

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  createdBy: { id: string; firstName: string; lastName: string };
  workflowInstance?: {
    id: string;
    status: string;
    currentNodeId?: string;
    version: { version: number; definition: { name: string } };
    tasks?: Task[];
    events?: WorkflowEvent[];
  };
}

export interface WorkflowEvent {
  id: string;
  nodeId?: string;
  eventType: string;
  actorId?: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

export interface Paginated<T> {
  total: number;
  page: number;
  pageSize: number;
  cases?: T[];
  tasks?: T[];
  events?: T[];
}

export const casesApi = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    return request<Paginated<Case>>(`/cases?${q}`);
  },
  get: (id: string) => request<Case>(`/cases/${id}`),
  create: (body: { title: string; description?: string; workflowVersionId: string }) =>
    request<Case>("/cases", { method: "POST", body: JSON.stringify(body) }),
  cancel: (id: string, reason?: string) =>
    request<Case>(`/cases/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  timeline: (id: string) =>
    request<{ workflowEvents: WorkflowEvent[]; auditEvents: unknown[] }>(`/cases/${id}/timeline`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REJECTED";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedToId?: string;
  assignedRole?: string;
  priority: number;
  dueAt?: string;
  createdAt: string;
  completedAt?: string;
  case: { id: string; caseNumber: string; title: string; status: string };
  assignedTo?: { id: string; firstName: string; lastName: string };
  instance: { version: { version: number; definition: { name: string } } };
}

export const tasksApi = {
  myInbox: (params?: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    return request<Paginated<Task>>(`/tasks/my?${q}`);
  },
  get: (id: string) => request<Task>(`/tasks/${id}`),
  claim: (id: string) => request<Task>(`/tasks/${id}/claim`, { method: "POST" }),
  complete: (id: string, action: string, formData?: Record<string, unknown>, comment?: string) =>
    request<Task>(`/tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ action, formData, comment }),
    }),
  reassign: (id: string, assignToId: string, reason?: string) =>
    request<Task>(`/tasks/${id}/reassign`, {
      method: "POST",
      body: JSON.stringify({ assignToId, reason }),
    }),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  query: (params?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined) q.set(k, String(v));
    }
    return request<{ total: number; page: number; events: unknown[] }>(`/audit-events?${q}`);
  },
};

// ── Legacy aliases used by the workflow canvas store ─────────────────────────
// The canvas store (workflow-store.ts) was written before the API was renamed.

export const nodeTypesApi = {
  list: () => request<import("./types").NodeTypeDescriptor[]>("/node-types"),
};

export const workflowsApi = workflowDefsApi;

export const executionsApi = {
  list: (workflowId: string) =>
    request<import("./types").Execution[]>(`/workflows/${workflowId}/executions`),
  trigger: (workflowId: string) =>
    request<import("./types").Execution>(`/workflows/${workflowId}/executions`, { method: "POST" }),
  get: (id: string) => request<import("./types").Execution>(`/executions/${id}`),
};

// ── Admin: Users ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles: Array<{ role: { id: string; name: string } }>;
}

export const adminUsersApi = {
  list: () => request<AdminUser[]>("/users"),
  create: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    request<AdminUser>("/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, patch: { isActive?: boolean; firstName?: string; lastName?: string }) =>
    request<AdminUser>(`/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  assignRole: (userId: string, roleId: string) =>
    request<AdminUser>(`/users/${userId}/roles/${roleId}`, { method: "POST" }),
};

// ── Admin: Roles ──────────────────────────────────────────────────────────────

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  permissions: Array<{ permission: { id: string; key: string; description?: string } }>;
}

export interface AdminPermission {
  id: string;
  key: string;
  description?: string;
}

export const adminRolesApi = {
  list: () => request<AdminRole[]>("/roles"),
  listPermissions: () => request<AdminPermission[]>("/roles/permissions"),
  create: (body: { name: string; description?: string; permissionKeys?: string[] }) =>
    request<AdminRole>("/roles", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: { name?: string; description?: string; permissionKeys?: string[] }) =>
    request<AdminRole>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
};

// ── Admin: Audit events ───────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  caseId?: string;
  correlationId?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  actor?: { id: string; firstName: string; lastName: string; email: string } | null;
}

export const adminAuditApi = {
  query: (params?: {
    actorId?: string;
    entityType?: string;
    action?: string;
    caseId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
    return request<{ total: number; page: number; pageSize: number; events: AuditEvent[] }>(
      `/audit-events?${q}`
    );
  },
};
