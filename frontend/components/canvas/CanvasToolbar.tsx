"use client";

import { useState } from "react";
import {
  Save, Loader2, ChevronLeft, Pencil,
  Rocket, CheckCircle2, AlertCircle,
  ListChecks, Loader2 as Spinner,
} from "lucide-react";
import Link from "next/link";
import { useWorkflowStore } from "@/store/workflow-store";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ── Version status badge ───────────────────────────────────────────────────────

function VersionBadge({ status, version }: { status: string; version: number }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    DRAFT: {
      cls: "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning)]/30",
      icon: <Pencil size={10} />,
      label: "Draft",
    },
    PUBLISHED: {
      cls: "bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success)]/30",
      icon: <CheckCircle2 size={10} />,
      label: "Published",
    },
    ARCHIVED: {
      cls: "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]",
      icon: <AlertCircle size={10} />,
      label: "Archived",
    },
  };
  const { cls, icon, label } = map[status] ?? map["DRAFT"];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {icon}
      v{version} · {label}
    </span>
  );
}

// ── Publish confirm dialog ─────────────────────────────────────────────────────

function PublishDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-subtle)]">
            <Rocket size={20} className="text-[var(--success)]" />
          </span>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Publish workflow?</p>
            <p className="text-xs text-[var(--muted)]">This will save and lock this version.</p>
          </div>
        </div>
        <div className="mb-5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)] space-y-1">
          <p>• Published versions <strong className="text-[var(--foreground)]">cannot be edited</strong>.</p>
          <p>• New cases will use this version.</p>
          <p>• You can create a new draft version to make changes later.</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <Rocket size={14} /> Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function CanvasToolbar() {
  const {
    workflow,
    isDirty,
    isSaving,
    isPublishing,
    saveWorkflow,
    publishWorkflow,
    renameWorkflow,
    validateWorkflow,
  } = useWorkflowStore();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string[] | null>(null);
  const [validating, setValidating] = useState(false);

  // ── Name editing ────────────────────────────────────────────────────────────

  function startEdit() {
    setNameValue(workflow?.name ?? "");
    setEditingName(true);
  }

  function commitEdit() {
    const trimmed = nameValue.trim();
    if (trimmed) renameWorkflow(trimmed);
    setEditingName(false);
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveError(null);
    try {
      await saveWorkflow();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  }

  // ── Publish ─────────────────────────────────────────────────────────────────

  async function handlePublish() {
    setShowPublish(false);
    try {
      await publishWorkflow();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Publish failed");
    }
  }

  async function handleValidate() {
    setValidating(true);
    setValidation(null);
    try {
      const result = await validateWorkflow();
      setValidation(result.errors);
    } catch (e: unknown) {
      setValidation([e instanceof Error ? e.message : "Validation failed"]);
    } finally {
      setValidating(false);
    }
  }

  const isPublished = workflow?.versionStatus === "PUBLISHED";
  const isArchived  = workflow?.versionStatus === "ARCHIVED";
  const canEdit     = !isPublished && !isArchived;

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        {/* Back */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] transition-colors"
        >
          <ChevronLeft size={14} /> Workflows
        </Link>

        <span className="text-[var(--border-strong)]">/</span>

        {/* Workflow name */}
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditingName(false);
            }}
            className="rounded border border-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 text-sm font-semibold text-[var(--foreground)] focus:outline-none"
          />
        ) : (
          <button
            onClick={canEdit ? startEdit : undefined}
            className={[
              "group flex items-center gap-1.5 rounded px-1 py-0.5 text-sm font-semibold text-[var(--foreground)]",
              canEdit ? "hover:bg-[var(--surface-2)] transition-colors cursor-text" : "cursor-default",
            ].join(" ")}
            title={canEdit ? "Click to rename" : undefined}
          >
            {workflow?.name ?? "Untitled"}
            {canEdit && (
              <Pencil
                size={11}
                className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </button>
        )}

        {/* Version badge */}
        {workflow && (
          <VersionBadge
            status={workflow.versionStatus}
            version={workflow.versionNumber}
          />
        )}

        {/* Unsaved dot */}
        {isDirty && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-amber-400"
            title="Unsaved changes"
          />
        )}

        {/* Error flash */}
        {saveError && (
          <span className="flex items-center gap-1 text-xs text-[var(--danger)]">
            <AlertCircle size={12} /> {saveError}
          </span>
        )}

        <div className="flex-1" />

        <ThemeToggle />

        {canEdit && (
          <button onClick={handleValidate} disabled={validating}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50">
            {validating ? <Spinner size={13} className="animate-spin" /> : <ListChecks size={13} />}
            Validate
          </button>
        )}

        {/* Save */}
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSaving
              ? <Loader2 size={13} className="animate-spin" />
              : <Save size={13} />}
            {isSaving ? "Saving…" : "Save"}
          </button>
        )}

        {/* Publish */}
        {canEdit && (
          <button
            onClick={() => setShowPublish(true)}
            disabled={isPublishing || isDirty}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={isDirty ? "Save first before publishing" : "Publish this version"}
          >
            {isPublishing
              ? <Loader2 size={13} className="animate-spin" />
              : <Rocket size={13} />}
            {isPublishing ? "Publishing…" : "Publish"}
          </button>
        )}

        {/* Published notice */}
        {isPublished && (
          <span className="flex items-center gap-1.5 rounded-lg border border-[var(--success)]/40 bg-[var(--success-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--success)]">
            <CheckCircle2 size={13} /> Published — read only
          </span>
        )}
      </header>

      {validation && (
        <div className={`border-b px-4 py-2 text-xs ${validation.length ? "border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[var(--danger)]" : "border-[var(--success)]/30 bg-[var(--success-subtle)] text-[var(--success)]"}`}>
          {validation.length === 0 ? "Workflow is valid and ready to publish." : (
            <ul className="list-disc space-y-1 pl-4">{validation.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
          )}
        </div>
      )}

      {showPublish && (
        <PublishDialog
          onConfirm={handlePublish}
          onCancel={() => setShowPublish(false)}
        />
      )}
    </>
  );
}
