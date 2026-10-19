"use client";

import { useMemo, useState } from "react";
import { X, Settings2, Plus, Trash2, GripVertical } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";

// ─── Shared primitives ─────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {children}
      </label>
      {hint && <p className="text-[10px] text-[var(--muted)] leading-snug">{hint}</p>}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, mono = false,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={[
        "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--foreground)]",
        "placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none",
        mono ? "font-mono" : "",
      ].join(" ")}
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
    />
  );
}

function Select({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function NumberInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
    />
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={[
        "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors w-full",
        value
          ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:border-[var(--border-strong)]",
      ].join(" ")}
    >
      <span className={[
        "h-4 w-7 rounded-full transition-colors relative",
        value ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]",
      ].join(" ")}>
        <span className={[
          "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
          value ? "translate-x-3.5" : "translate-x-0.5",
        ].join(" ")} />
      </span>
      {label}
    </button>
  );
}

// ─── Form Fields Editor ────────────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "checkbox" | "file";
  required: boolean;
  placeholder?: string;
  options?: string;   // comma-separated for select type
}

const FIELD_TYPES = [
  { value: "text",     label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number",   label: "Number" },
  { value: "date",     label: "Date" },
  { value: "select",   label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file",     label: "File upload" },
];

function FormFieldRow({
  field, index, total,
  onChange, onDelete, onMove,
}: {
  field: FormField;
  index: number;
  total: number;
  onChange: (f: FormField) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="text-[var(--border-strong)] cursor-grab">
          <GripVertical size={13} />
        </span>
        <button
          onClick={() => setExpanded((p) => !p)}
          className="flex-1 text-left text-xs font-medium text-[var(--foreground)] truncate"
        >
          {field.label || <span className="italic text-[var(--muted)]">Unnamed field</span>}
        </button>
        <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] text-[var(--muted)]">
          {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
        </span>
        {field.required && (
          <span className="text-[9px] text-[var(--danger)] font-bold">REQ</span>
        )}
        <div className="flex gap-0.5">
          <button disabled={index === 0} onClick={() => onMove(-1)}
            className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
            ▲
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)}
            className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
            ▼
          </button>
          <button onClick={onDelete}
            className="rounded p-0.5 text-[var(--muted)] hover:text-[var(--danger)]">
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 space-y-2.5">
          <div>
            <FieldLabel>Label</FieldLabel>
            <TextInput value={field.label} onChange={(v) => onChange({ ...field, label: v })} placeholder="Field label" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={field.type}
                onChange={(v) => onChange({ ...field, type: v as FormField["type"] })}
                options={FIELD_TYPES}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Toggle
                value={field.required}
                onChange={(v) => onChange({ ...field, required: v })}
                label="Required"
              />
            </div>
          </div>
          {(field.type === "text" || field.type === "textarea" || field.type === "number") && (
            <div>
              <FieldLabel>Placeholder</FieldLabel>
              <TextInput
                value={field.placeholder ?? ""}
                onChange={(v) => onChange({ ...field, placeholder: v })}
                placeholder="Hint text…"
              />
            </div>
          )}
          {field.type === "select" && (
            <div>
              <FieldLabel hint="Comma-separated options">Options</FieldLabel>
              <TextInput
                value={field.options ?? ""}
                onChange={(v) => onChange({ ...field, options: v })}
                placeholder="Yes, No, Maybe"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FormFieldsEditor({
  value, onChange,
}: {
  value: FormField[];
  onChange: (fields: FormField[]) => void;
}) {
  function addField() {
    onChange([
      ...value,
      { id: crypto.randomUUID(), label: "", type: "text", required: false },
    ]);
  }

  function updateField(index: number, field: FormField) {
    const next = [...value];
    next[index] = field;
    onChange(next);
  }

  function deleteField(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...value];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-[var(--border)] py-4 text-center text-xs text-[var(--muted)]">
          No fields yet — add one below
        </p>
      )}
      {value.map((field, i) => (
        <FormFieldRow
          key={field.id}
          field={field}
          index={i}
          total={value.length}
          onChange={(f) => updateField(i, f)}
          onDelete={() => deleteField(i)}
          onMove={(dir) => moveField(i, dir)}
        />
      ))}
      <button
        onClick={addField}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        <Plus size={13} /> Add field
      </button>
    </div>
  );
}

// ─── Section divider ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Assignment section (shared by user-task and approval) ─────────────────────

function AssignmentSection({
  config, set,
}: {
  config: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
}) {
  const type  = (config["assignmentType"] as string) ?? "role";
  const value = (config["assignmentValue"] as string) ?? "";

  return (
    <Section title="Assignment">
      <div>
        <FieldLabel>Assign to</FieldLabel>
        <Select
          value={type}
          onChange={(v) => set("assignmentType", v)}
          options={[
            { value: "role",      label: "Role" },
            { value: "user",      label: "Specific user" },
            { value: "initiator", label: "Case initiator" },
          ]}
        />
      </div>
      {type !== "initiator" && (
        <div>
          <FieldLabel>{type === "role" ? "Role name" : "Username / email"}</FieldLabel>
          <TextInput
            value={value}
            onChange={(v) => set("assignmentValue", v)}
            placeholder={type === "role" ? "e.g. HOD" : "e.g. john@example.com"}
          />
        </div>
      )}
      <div>
        <FieldLabel hint="Leave empty for no SLA">Due in (days)</FieldLabel>
        <NumberInput
          value={config["dueDays"] as number | null ?? null}
          onChange={(v) => set("dueDays", v)}
        />
      </div>
      <div>
        <FieldLabel>Priority</FieldLabel>
        <Select
          value={String(config["priority"] ?? "0")}
          onChange={(v) => set("priority", v)}
          options={[
            { value: "0", label: "Normal" },
            { value: "1", label: "High" },
            { value: "2", label: "Urgent" },
          ]}
        />
      </div>
    </Section>
  );
}

// ─── Per-type panels ───────────────────────────────────────────────────────────

function StartPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <p className="text-xs text-[var(--muted)] leading-relaxed">
        The start node is the entry point of your workflow. Every workflow must have exactly one.
        No configuration is required — connect it to the first task.
      </p>
    </div>
  );
}

function EndPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Outcome">
        <div>
          <FieldLabel>Final outcome</FieldLabel>
          <Select
            value={(config["outcome"] as string) ?? "completed"}
            onChange={(v) => set("outcome", v)}
            options={[
              { value: "completed", label: "Completed" },
              { value: "approved",  label: "Approved" },
              { value: "rejected",  label: "Rejected" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        </div>
        <div>
          <FieldLabel hint="Shown to the case creator on completion">Completion message</FieldLabel>
          <TextInput
            value={(config["message"] as string) ?? ""}
            onChange={(v) => set("message", v)}
            placeholder="Your request has been processed."
          />
        </div>
      </Section>
    </div>
  );
}

function UserTaskPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Task details">
        <div>
          <FieldLabel>Title *</FieldLabel>
          <TextInput
            value={(config["title"] as string) ?? ""}
            onChange={(v) => set("title", v)}
            placeholder="e.g. Fill in procurement form"
          />
        </div>
        <div>
          <FieldLabel>Instructions</FieldLabel>
          <Textarea
            value={(config["description"] as string) ?? ""}
            onChange={(v) => set("description", v)}
            placeholder="Describe what the assignee needs to do…"
            rows={3}
          />
        </div>
      </Section>

      <div className="border-t border-[var(--border)]" />
      <AssignmentSection config={config} set={set} />

      <div className="border-t border-[var(--border)]" />
      <Section title="Form fields">
        <FormFieldsEditor
          value={(config["formFields"] as FormField[]) ?? []}
          onChange={(fields) => set("formFields", fields)}
        />
      </Section>
    </div>
  );
}

function ApprovalPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Approval details">
        <div>
          <FieldLabel>Title *</FieldLabel>
          <TextInput
            value={(config["title"] as string) ?? ""}
            onChange={(v) => set("title", v)}
            placeholder="e.g. HOD Review & Approval"
          />
        </div>
        <div>
          <FieldLabel>Context / Instructions</FieldLabel>
          <Textarea
            value={(config["description"] as string) ?? ""}
            onChange={(v) => set("description", v)}
            placeholder="Provide context for the approver…"
            rows={3}
          />
        </div>
        <Toggle
          value={(config["allowComment"] as boolean) ?? false}
          onChange={(v) => set("allowComment", v)}
          label="Require a comment"
        />
      </Section>

      <div className="border-t border-[var(--border)]" />
      <AssignmentSection config={config} set={set} />
    </div>
  );
}

function ReturnPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Return rules">
        <Toggle
          value={config["requireComment"] !== false}
          onChange={(value) => set("requireComment", value)}
          label="Require a comment"
        />
        <p className="text-[10px] leading-relaxed text-[var(--muted)]">
          Connect this component to the task or review step that should receive the work again.
        </p>
      </Section>
    </div>
  );
}

function ConditionPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Condition rule">
        <div>
          <FieldLabel hint="Use _lastAction for the previous task's action (approve/reject)">
            Variable / field name
          </FieldLabel>
          <TextInput
            value={(config["field"] as string) ?? "_lastAction"}
            onChange={(v) => set("field", v)}
            placeholder="_lastAction"
            mono
          />
        </div>
        <div>
          <FieldLabel>Operator</FieldLabel>
          <Select
            value={(config["operator"] as string) ?? "equals"}
            onChange={(v) => set("operator", v)}
            options={[
              { value: "equals",     label: "equals" },
              { value: "not_equals", label: "not equals" },
              { value: "contains",   label: "contains" },
              { value: "gt",         label: "greater than" },
              { value: "lt",         label: "less than" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Expected value</FieldLabel>
          <TextInput
            value={(config["value"] as string) ?? ""}
            onChange={(v) => set("value", v)}
            placeholder="e.g. approved"
            mono
          />
        </div>
      </Section>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[11px] text-[var(--muted)] space-y-1">
        <p className="font-semibold text-[var(--foreground)]">How it works</p>
        <p>The <strong className="text-[var(--foreground)]">Yes</strong> output fires when the condition is true.</p>
        <p>The <strong className="text-[var(--foreground)]">No</strong> output fires when false.</p>
        <p>Common values for <code className="text-[var(--accent)]">_lastAction</code>: <code>approved</code>, <code>rejected</code>, <code>submit</code>.</p>
      </div>
    </div>
  );
}

function NotificationPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const recipient = (config["recipient"] as string) ?? "initiator";
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Recipient">
        <div>
          <FieldLabel>Send to</FieldLabel>
          <Select
            value={recipient}
            onChange={(v) => set("recipient", v)}
            options={[
              { value: "initiator", label: "Case initiator" },
              { value: "assignee",  label: "Current assignee" },
              { value: "role",      label: "Role" },
              { value: "user",      label: "Specific user" },
            ]}
          />
        </div>
        {(recipient === "role" || recipient === "user") && (
          <div>
            <FieldLabel>{recipient === "role" ? "Role name" : "Username"}</FieldLabel>
            <TextInput
              value={(config["recipientValue"] as string) ?? ""}
              onChange={(v) => set("recipientValue", v)}
            />
          </div>
        )}
        <div>
          <FieldLabel>Channel</FieldLabel>
          <Select
            value={(config["channel"] as string) ?? "in-app"}
            onChange={(v) => set("channel", v)}
            options={[
              { value: "in-app", label: "In-app only" },
              { value: "email",  label: "Email only" },
              { value: "both",   label: "Both" },
            ]}
          />
        </div>
      </Section>

      <div className="border-t border-[var(--border)]" />
      <Section title="Message">
        <div>
          <FieldLabel>Subject / Title</FieldLabel>
          <TextInput
            value={(config["subject"] as string) ?? ""}
            onChange={(v) => set("subject", v)}
            placeholder="Your case has been updated"
          />
        </div>
        <div>
          <FieldLabel hint="Supports {{variable}} placeholders">Message body</FieldLabel>
          <Textarea
            value={(config["message"] as string) ?? ""}
            onChange={(v) => set("message", v)}
            placeholder="Hello, your case {{caseNumber}} has been updated…"
            rows={4}
          />
        </div>
      </Section>
    </div>
  );
}

function AutomatedTaskPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  const operation = (config["operation"] as string) ?? "http-request";
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Operation">
        <div>
          <FieldLabel>Operation type</FieldLabel>
          <Select
            value={operation}
            onChange={(v) => set("operation", v)}
            options={[
              { value: "http-request",  label: "HTTP Request" },
              { value: "set-variable",  label: "Set Variable" },
              { value: "log",           label: "Log Message" },
              { value: "delay",         label: "Delay" },
            ]}
          />
        </div>
      </Section>

      <div className="border-t border-[var(--border)]" />

      {operation === "http-request" && (
        <Section title="HTTP request">
          <div>
            <FieldLabel>Method</FieldLabel>
            <Select
              value={(config["method"] as string) ?? "GET"}
              onChange={(v) => set("method", v)}
              options={["GET","POST","PUT","PATCH","DELETE"].map((m) => ({ value: m, label: m }))}
            />
          </div>
          <div>
            <FieldLabel>URL</FieldLabel>
            <TextInput
              value={(config["url"] as string) ?? ""}
              onChange={(v) => set("url", v)}
              placeholder="https://api.example.com/endpoint"
              mono
            />
          </div>
          <div>
            <FieldLabel hint="JSON — leave empty for GET">Request body</FieldLabel>
            <Textarea
              value={(config["body"] as string) ?? ""}
              onChange={(v) => set("body", v)}
              placeholder='{"key": "value"}'
              rows={4}
            />
          </div>
        </Section>
      )}

      {operation === "set-variable" && (
        <Section title="Variable">
          <div>
            <FieldLabel>Variable name</FieldLabel>
            <TextInput
              value={(config["variableName"] as string) ?? ""}
              onChange={(v) => set("variableName", v)}
              placeholder="myVariable"
              mono
            />
          </div>
          <div>
            <FieldLabel hint="Supports {{expressions}}">Value</FieldLabel>
            <TextInput
              value={(config["variableValue"] as string) ?? ""}
              onChange={(v) => set("variableValue", v)}
              placeholder="{{caseNumber}}"
              mono
            />
          </div>
        </Section>
      )}

      {operation === "log" && (
        <Section title="Log">
          <div>
            <FieldLabel>Message</FieldLabel>
            <TextInput
              value={(config["logMessage"] as string) ?? ""}
              onChange={(v) => set("logMessage", v)}
              placeholder="Case {{caseNumber}} reached this point"
            />
          </div>
        </Section>
      )}

      {operation === "delay" && (
        <Section title="Delay">
          <div>
            <FieldLabel>Seconds</FieldLabel>
            <NumberInput
              value={(config["delaySeconds"] as number | null) ?? 5}
              onChange={(v) => set("delaySeconds", v)}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function LabelPanel({ config, set }: { config: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4 px-4 py-4">
      <Section title="Annotation">
        <div>
          <FieldLabel>Note text</FieldLabel>
          <Textarea
            value={(config["text"] as string) ?? ""}
            onChange={(v) => set("text", v)}
            placeholder="Add your note here…"
            rows={4}
          />
        </div>
        <div>
          <FieldLabel>Style</FieldLabel>
          <Select
            value={(config["style"] as string) ?? "note"}
            onChange={(v) => set("style", v)}
            options={[
              { value: "note",    label: "📝 Note" },
              { value: "warning", label: "⚠️ Warning" },
              { value: "info",    label: "ℹ️ Info" },
            ]}
          />
        </div>
      </Section>
    </div>
  );
}

// ─── Main panel ────────────────────────────────────────────────────────────────

const PANEL_MAP: Record<
  string,
  React.ComponentType<{ config: Record<string, unknown>; set: (k: string, v: unknown) => void }>
> = {
  start:          StartPanel,
  end:            EndPanel,
  "user-task":    UserTaskPanel,
  approval:       ApprovalPanel,
  return:         ReturnPanel,
  condition:      ConditionPanel,
  notification:   NotificationPanel,
  "automated-task": AutomatedTaskPanel,
  label:          LabelPanel,
};

export function NodeConfigPanel() {
  const { selectedNodeId, nodes, nodeTypeRegistry, selectNode, updateNodeConfig } =
    useWorkflowStore();

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const descriptor = useMemo(() => {
    if (!selectedNode) return null;
    const domainType = (selectedNode.data as { domainType?: string }).domainType ?? "";
    return nodeTypeRegistry.find((d) => d.type === domainType) ?? null;
  }, [selectedNode, nodeTypeRegistry]);

  if (!selectedNode || !descriptor) {
    return (
      <aside className="flex h-full w-72 shrink-0 flex-col items-center justify-center gap-3 border-l border-[var(--border)] bg-[var(--surface)]">
        <Settings2 size={32} className="text-[var(--border-strong)]" />
        <p className="px-8 text-center text-xs text-[var(--muted)]">
          Select a node to configure it
        </p>
      </aside>
    );
  }

  const config = ((selectedNode.data as { config?: Record<string, unknown> }).config ?? {}) as Record<string, unknown>;

  function setField(k: string, v: unknown) {
    updateNodeConfig(selectedNode!.id, { ...config, [k]: v });
  }

  const ConfigComponent = PANEL_MAP[descriptor.type];

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-3"
        style={{ borderTop: `3px solid ${descriptor.color}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {descriptor.label}
          </p>
          <p className="text-[10px] text-[var(--muted)]">{descriptor.description}</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable config body */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <FieldLabel hint="Optional name shown on this canvas node">Node name</FieldLabel>
          <TextInput
            value={typeof config._label === "string" ? config._label : ""}
            onChange={(value) => setField("_label", value)}
            placeholder={descriptor.label}
          />
        </div>
        {ConfigComponent ? (
          <ConfigComponent config={config} set={setField} />
        ) : (
          <div className="px-4 py-4 text-xs text-[var(--muted)]">
            No configuration for this node type.
          </div>
        )}
      </div>

      {/* Port reference footer */}
      {(descriptor.inputs.length > 0 || descriptor.outputs.length > 0) && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Ports</p>
          <div className="space-y-1">
            {descriptor.inputs.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-[var(--foreground)]">{p.label}</span>
                <span className="ml-auto">← in</span>
              </div>
            ))}
            {descriptor.outputs.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-[var(--foreground)]">{p.label}</span>
                <span className="ml-auto">out →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
