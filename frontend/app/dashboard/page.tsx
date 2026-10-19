"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, GitFork, Trash2,
  Calendar, AlertTriangle, RefreshCw,
} from "lucide-react";
import { workflowDefsApi, type WorkflowDefinition } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

function CreateDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, desc: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setPending(true);
    try { await onCreate(name.trim(), desc.trim()); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setPending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">New Workflow</h2>
        <div className="space-y-3">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Internal Memo Approval"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
            placeholder="Optional description…"
            className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
          {err && <p className="flex items-center gap-1.5 text-xs text-[var(--danger)]"><AlertTriangle size={12} />{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            Cancel
          </button>
          <button onClick={submit} disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors">
            {pending && <Loader2 size={14} className="animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [defs, setDefs] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function loadDefs() {
    setLoading(true); setError(null);
    try { setDefs(await workflowDefsApi.list()); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (user) loadDefs(); }, [user]);

  async function handleCreate(name: string, description: string) {
    const created = await workflowDefsApi.create(name, description);
    // Navigate to the definition id — the editor resolves the latest version
    router.push(`/workflows/${created.id}`);
  }

  if (authLoading) return (
    <div className="flex h-full items-center justify-center gap-2 text-[var(--muted)]">
      <Loader2 size={20} className="animate-spin" /> Loading…
    </div>
  );
  if (!user) return null;

  return (
    <AppLayout title="Workflows">
      <div className="px-7 py-7">
        {/* Toolbar */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Workflow Definitions</h1>
          <button onClick={loadDefs}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex-1" />
          {hasPermission("workflow.create") && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              <Plus size={15} /> New Workflow
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)]">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : defs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-4xl">✦</p>
            <p className="font-semibold text-[var(--foreground)]">No workflows yet</p>
            <p className="text-sm text-[var(--muted)]">Create one to get started</p>
            {hasPermission("workflow.create") && (
              <button onClick={() => setShowCreate(true)}
                className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
                <Plus size={15} /> New Workflow
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {defs.map((def) => {
              const latest = def.versions?.[0];
              return (
                <div key={def.id}
                  className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-strong)] hover:shadow-md transition-all">
                  <div className="mb-3 flex items-center gap-2">
                    {latest && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        latest.status === "PUBLISHED" ? "bg-[var(--success-subtle)] text-[var(--success)]" :
                        latest.status === "DRAFT"     ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                        "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}>{latest.status}</span>
                    )}
                    <span className="text-xs text-[var(--muted)]">
                      <GitFork size={10} className="inline mr-0.5" />v{latest?.version ?? 1}
                    </span>
                  </div>
                  <Link href={`/workflows/${def.id}`}
                    className="block truncate text-base font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
                    {def.name}
                  </Link>
                  {def.description && (
                    <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">{def.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                    <Calendar size={10} /> {new Date(def.updatedAt).toLocaleDateString()}
                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="rounded-md p-1.5 hover:bg-[var(--surface-2)] hover:text-[var(--danger)] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasPermission("workflow.create") && (
              <button onClick={() => setShowCreate(true)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border)] py-10 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all">
                <Plus size={22} />
                <span className="text-sm font-medium">New workflow</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </AppLayout>
  );
}
