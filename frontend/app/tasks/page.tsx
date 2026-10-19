"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, ChevronRight, Flag,
} from "lucide-react";
import { tasksApi, type Task } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";

const PRIORITY_LABELS = ["Normal", "High", "Urgent"];
const PRIORITY_COLORS = ["text-[var(--muted)]", "text-[var(--warning)]", "text-[var(--danger)]"];

function TaskCard({ task }: { task: Task }) {
  const priority = Math.min(task.priority, 2);
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();

  return (
    <Link href={`/tasks/${task.id}`}
      className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 hover:border-[var(--border-strong)] hover:shadow-sm transition-all">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)]">
        {task.status === "IN_PROGRESS"
          ? <Clock size={16} className="text-[var(--accent)]" />
          : <CheckCircle2 size={16} className="text-[var(--muted)]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-[var(--foreground)]">{task.title}</p>
          {task.priority > 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[priority]}`}>
              <Flag size={10} /> {PRIORITY_LABELS[priority]}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)] truncate">
          {task.case.caseNumber} · {task.case.title}
        </p>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--muted)]">
          <span>{task.instance.version.definition.name} v{task.instance.version.version}</span>
          {task.assignedRole && <span>Role: {task.assignedRole}</span>}
          {task.dueAt && (
            <span className={isOverdue ? "text-[var(--danger)] font-medium" : ""}>
              Due {new Date(task.dueAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <ChevronRight size={15} className="mt-1 shrink-0 text-[var(--muted)]" />
    </Link>
  );
}

export default function TasksInboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await tasksApi.myInbox({ status: statusFilter || undefined });
      setTasks(res.tasks ?? []); setTotal(res.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <AppLayout title="My Tasks">
      <div className="px-7 py-7">
        <div className="mb-5 flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none">
            <option value="">Pending &amp; In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button onClick={load}
            className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <span className="ml-auto text-sm text-[var(--muted)]">
            {total} task{total !== 1 ? "s" : ""}
          </span>
          {total > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
              {total}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <CheckCircle2 size={40} className="text-[var(--border-strong)]" />
            <p className="font-medium text-[var(--foreground)]">All clear</p>
            <p className="text-sm text-[var(--muted)]">No tasks waiting for you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
