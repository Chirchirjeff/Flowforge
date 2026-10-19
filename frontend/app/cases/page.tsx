"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, RefreshCw, Search, Loader2, AlertTriangle,
  FolderOpen, ChevronRight, Calendar,
} from "lucide-react";
import { casesApi, workflowDefsApi, type Case, type WorkflowDefinition } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_COLORS: Record<string, string> = {
  OPEN:             "bg-[var(--surface-2)] text-[var(--muted)]",
  IN_PROGRESS:      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  PENDING_APPROVAL: "bg-[var(--warning-subtle)] text-[var(--warning)]",
  APPROVED:         "bg-[var(--success-subtle)] text-[var(--success)]",
  REJECTED:         "bg-[var(--danger-subtle)] text-[var(--danger)]",
  CLOSED:           "bg-[var(--surface-2)] text-[var(--muted)]",
  CANCELLED:        "bg-[var(--surface-2)] text-[var(--muted)]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[status] ?? ""}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function NewCaseDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (title: string, description: string, versionId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [versionId, setVersionId] = useState("");
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => { workflowDefsApi.list().then(setDefs).catch(() => {}); }, []);

  const publishedVersions = defs.flatMap((d) =>
    d.versions.filter((v) => v.status === "PUBLISHED")
      .map((v) => ({ versionId: v.id, label: `${d.name} — v${v.version}` }))
  );

  function submit() {
    if (!title.trim() || !versionId) { setError("Title and workflow version are required"); return; }
    start(async () => {
      try { await onCreate(title.trim(), description.trim(), versionId); onClose(); }
      catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">New Case</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Title *</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="e.g. Internal Memo — ICT Equipment" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Description</label>
            <textarea value={description} rows={2} onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Workflow *</label>
            {publishedVersions.length === 0
              ? <p className="text-xs text-[var(--muted)]">No published workflows yet.</p>
              : <select value={versionId} onChange={(e) => setVersionId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none">
                  <option value="">Select a workflow…</option>
                  {publishedVersions.map((v) => <option key={v.versionId} value={v.versionId}>{v.label}</option>)}
                </select>
            }
          </div>
          {error && <p className="flex items-center gap-1.5 text-xs text-[var(--danger)]"><AlertTriangle size={12} /> {error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors">
            {pending && <Loader2 size={14} className="animate-spin" />} Create Case
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CasesPage() {
  const { hasPermission } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await casesApi.list({ status: statusFilter || undefined });
      setCases(res.cases ?? []); setTotal(res.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleCreate(title: string, description: string, workflowVersionId: string) {
    const created = await casesApi.create({ title, description, workflowVersionId });
    router.push(`/cases/${created.id}`);
  }

  const filtered = search
    ? cases.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.caseNumber.toLowerCase().includes(search.toLowerCase()))
    : cases;

  return (
    <AppLayout title="Cases">
      <div className="px-7 py-7">
        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases…"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none">
              <option value="">All statuses</option>
              {["OPEN","IN_PROGRESS","PENDING_APPROVAL","APPROVED","REJECTED","CLOSED","CANCELLED"].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g," ")}</option>
              ))}
            </select>
          </div>
          <button onClick={load}
            className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <span className="text-sm text-[var(--muted)]">{total} total</span>
          {hasPermission("case.create") && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              <Plus size={15} /> New Case
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FolderOpen size={40} className="text-[var(--border-strong)]" />
            <p className="font-medium text-[var(--foreground)]">No cases found</p>
            <p className="text-sm text-[var(--muted)]">{hasPermission("case.create") ? "Create one to get started" : "Nothing here yet"}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {filtered.map((c, i) => (
              <Link key={c.id} href={`/cases/${c.id}`}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface-2)] transition-colors ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--muted)]">{c.caseNumber}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="mt-0.5 truncate font-medium text-[var(--foreground)]">{c.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]">
                    <span>{c.workflowInstance?.version.definition.name ?? "No workflow"}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-[var(--muted)]" />
              </Link>
            ))}
          </div>
        )}
      </div>
      {showNew && <NewCaseDialog onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </AppLayout>
  );
}
