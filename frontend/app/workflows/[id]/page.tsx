"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { useWorkflowStore } from "@/store/workflow-store";

/**
 * [id] is a WorkflowDefinition id.
 * The store loads the definition, picks the latest version's graph, and
 * populates the canvas. The store uses the version id internally for saves.
 */
export default function WorkflowEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { loadWorkflow } = useWorkflowStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);

    loadWorkflow(params.id)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load workflow")
      )
      .finally(() => setLoading(false));
  }, [params?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 bg-[var(--background)] text-[var(--muted)]">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading workflow…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] text-center">
        <AlertTriangle size={36} className="text-[var(--danger)]" />
        <p className="text-base font-semibold text-[var(--foreground)]">Could not load workflow</p>
        <p className="text-sm text-[var(--muted)]">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return <WorkflowCanvas />;
}
