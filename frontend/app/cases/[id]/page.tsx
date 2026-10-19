"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, AlertTriangle, ChevronLeft, Clock,
  CheckCircle2, XCircle, Ban,
} from "lucide-react";
import { casesApi, type Case, type WorkflowEvent } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  CLOSED: "bg-slate-100 text-slate-400",
  CANCELLED: "bg-zinc-100 text-zinc-500",
};

function EventIcon({ type }: { type: string }) {
  if (type.includes("completed") || type.includes("approved")) return <CheckCircle2 size={14} className="text-emerald-500" />;
  if (type.includes("failed") || type.includes("rejected")) return <XCircle size={14} className="text-red-500" />;
  if (type.includes("cancelled")) return <Ban size={14} className="text-zinc-400" />;
  return <Clock size={14} className="text-[var(--muted)]" />;
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [timeline, setTimeline] = useState<WorkflowEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function load() {
    if (!params?.id) return;
    setLoading(true);
    try {
      const [c, t] = await Promise.all([
        casesApi.get(params.id),
        casesApi.timeline(params.id),
      ]);
      setCaseData(c);
      setTimeline(t.workflowEvents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load case");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [params?.id]);

  async function handleCancel() {
    if (!confirm("Cancel this case?")) return;
    setCancelling(true);
    try {
      await casesApi.cancel(params.id, "Cancelled by user");
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return (
    <div className="flex h-full items-center justify-center gap-2 text-[var(--muted)]">
      <Loader2 size={18} className="animate-spin" /> Loading…
    </div>
  );

  if (error || !caseData) return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <AlertTriangle size={32} className="text-[var(--danger)]" />
      <p className="text-[var(--muted)]">{error ?? "Case not found"}</p>
      <button onClick={() => router.push("/cases")}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white">
        Back to cases
      </button>
    </div>
  );

  const tasks = caseData.workflowInstance?.tasks ?? [];
  const activeTasks = tasks.filter((t) => ["PENDING","IN_PROGRESS"].includes(t.status));

  return (
    <div className="min-h-full bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <Link href="/cases" className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
            <ChevronLeft size={15} /> Cases
          </Link>
          <span className="text-[var(--border-strong)]">·</span>
          <span className="font-mono text-sm text-[var(--muted)]">{caseData.caseNumber}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS[caseData.status] ?? ""}`}>
            {caseData.status.replace("_"," ")}
          </span>
          <div className="flex-1" />
          {hasPermission("case.cancel") && !["CLOSED","CANCELLED"].includes(caseData.status) && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted)] hover:border-red-300 hover:text-[var(--danger)] transition-colors">
              {cancelling ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
              Cancel case
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details + tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h1 className="text-xl font-bold text-[var(--foreground)]">{caseData.title}</h1>
            {caseData.description && (
              <p className="mt-2 text-sm text-[var(--muted)]">{caseData.description}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
              <div>
                <span className="font-medium text-[var(--foreground)]">Workflow</span>
                <p>{caseData.workflowInstance?.version.definition.name ?? "—"}</p>
              </div>
              <div>
                <span className="font-medium text-[var(--foreground)]">Created by</span>
                <p>{caseData.createdBy.firstName} {caseData.createdBy.lastName}</p>
              </div>
              <div>
                <span className="font-medium text-[var(--foreground)]">Created</span>
                <p>{new Date(caseData.createdAt).toLocaleString()}</p>
              </div>
              {caseData.closedAt && (
                <div>
                  <span className="font-medium text-[var(--foreground)]">Closed</span>
                  <p>{new Date(caseData.closedAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Active Tasks</h2>
              <div className="space-y-2">
                {activeTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {task.assignedTo
                          ? `Assigned to ${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                          : task.assignedRole
                            ? `Open to ${task.assignedRole}`
                            : "Unassigned"}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                      {task.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--foreground)]">Timeline</h2>
          {timeline.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No events yet</p>
          ) : (
            <ol className="relative border-l border-[var(--border)] pl-4 space-y-4">
              {timeline.map((ev) => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[1.15rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--surface)] ring-2 ring-[var(--border)]">
                    <EventIcon type={ev.eventType} />
                  </span>
                  <p className="text-xs font-medium text-[var(--foreground)]">
                    {ev.eventType.replace(/\./g, " → ")}
                  </p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
