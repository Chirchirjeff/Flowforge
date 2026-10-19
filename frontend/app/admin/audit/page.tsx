"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertTriangle, RefreshCw, Search,
  ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { adminAuditApi, type AuditEvent } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";

// ── Action colour mapping ─────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  "user.login":                   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "workflow.created":             "bg-[var(--accent-subtle)] text-[var(--accent)]",
  "workflow.published":           "bg-[var(--success-subtle)] text-[var(--success)]",
  "case.created":                 "bg-[var(--accent-subtle)] text-[var(--accent)]",
  "case.cancelled":               "bg-[var(--danger-subtle)] text-[var(--danger)]",
  "task.approve":                 "bg-[var(--success-subtle)] text-[var(--success)]",
  "task.reject":                  "bg-[var(--danger-subtle)] text-[var(--danger)]",
  "task.claimed":                 "bg-[var(--warning-subtle)] text-[var(--warning)]",
  "task.reassigned":              "bg-[var(--warning-subtle)] text-[var(--warning)]",
  "workflow.instance.completed":  "bg-[var(--success-subtle)] text-[var(--success)]",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-[var(--surface-2)] text-[var(--muted)]";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${cls}`}>
      {action}
    </span>
  );
}

// ── Expandable metadata cell ──────────────────────────────────────────────────

function MetaCell({ data }: { data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(data);
  if (keys.length === 0) return <span className="text-[var(--muted)]">—</span>;

  return (
    <div>
      <button onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        {keys.length} field{keys.length !== 1 ? "s" : ""}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <pre className="mt-1.5 max-w-xs overflow-x-auto rounded-lg bg-[var(--surface-2)] p-2 text-[11px] text-[var(--foreground)]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Filters bar ───────────────────────────────────────────────────────────────

interface Filters {
  action: string;
  entityType: string;
  from: string;
  to: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ action: "", entityType: "", from: "", to: "" });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async (p = page) => {
    setLoading(true); setError(null);
    try {
      const res = await adminAuditApi.query({
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setEvents(res.events);
      setTotal(res.total);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(1); setPage(1); }, [filters]);
  useEffect(() => { load(page); }, [page]);

  function setFilter(k: keyof Filters) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [k]: e.target.value }));
  }

  return (
    <AppLayout title="Audit Log">
      <div className="px-7 py-7">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Audit Log</h1>
          <span className="text-sm text-[var(--muted)]">{total.toLocaleString()} events</span>
          <button onClick={() => load(page)}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input value={filters.action} onChange={setFilter("action")}
              placeholder="Filter by action…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-2 pl-8 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <select value={filters.entityType} onChange={setFilter("entityType")}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none">
            <option value="">All entity types</option>
            {["WorkflowDefinition","WorkflowVersion","WorkflowInstance","Case","Task","User"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)]">From</label>
            <input type="date" value={filters.from} onChange={setFilter("from")}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--muted)]">To</label>
            <input type="date" value={filters.to} onChange={setFilter("to")}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
          {(filters.action || filters.entityType || filters.from || filters.to) && (
            <button onClick={() => setFilters({ action: "", entityType: "", from: "", to: "" })}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
              Clear
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
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] py-16 text-center">
            <p className="text-sm text-[var(--muted)]">No audit events found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              {/* Header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <span>Time</span>
                <span>Action</span>
                <span>Actor</span>
                <span>Entity</span>
                <span>Data</span>
              </div>

              {events.map((ev, i) => (
                <div key={ev.id}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-start gap-4 px-5 py-3 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                  {/* Time */}
                  <span className="whitespace-nowrap font-mono text-[11px] text-[var(--muted)]">
                    {new Date(ev.occurredAt).toLocaleString()}
                  </span>

                  {/* Action */}
                  <ActionBadge action={ev.action} />

                  {/* Actor */}
                  <span className="text-xs text-[var(--foreground)] whitespace-nowrap">
                    {ev.actor
                      ? `${ev.actor.firstName} ${ev.actor.lastName}`
                      : <span className="text-[var(--muted)]">System</span>
                    }
                  </span>

                  {/* Entity */}
                  <div className="text-xs">
                    {ev.entityType && (
                      <span className="text-[var(--foreground)]">{ev.entityType}</span>
                    )}
                    {ev.entityId && (
                      <span className="ml-1 font-mono text-[10px] text-[var(--muted)]">
                        {ev.entityId.slice(0, 8)}…
                      </span>
                    )}
                    {!ev.entityType && <span className="text-[var(--muted)]">—</span>}
                  </div>

                  {/* Metadata */}
                  <MetaCell data={ev.metadata} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">
                Page {page} of {totalPages} · {total.toLocaleString()} events
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} /> Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
