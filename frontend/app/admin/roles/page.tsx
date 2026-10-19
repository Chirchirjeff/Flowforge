"use client";

import { useEffect, useState } from "react";
import {
  Loader2, AlertTriangle, ChevronDown, ChevronRight,
  BookKey, RefreshCw, Plus, Check,
} from "lucide-react";
import { adminRolesApi, type AdminRole, type AdminPermission } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";

// Group permissions by prefix (e.g. "workflow", "case", "task")
function groupPermissions(keys: string[]) {
  const groups: Record<string, string[]> = {};
  for (const key of keys) {
    const prefix = key.split(".")[0];
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(key);
  }
  return groups;
}

// ── Create role dialog ────────────────────────────────────────────────────────

function CreateRoleDialog({ allPermissions, onClose, onCreate }: {
  allPermissions: AdminPermission[];
  onClose: () => void;
  onCreate: (name: string, description: string, permissionKeys: string[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  const grouped = groupPermissions(allPermissions.map((p) => p.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function submit() {
    if (!name.trim()) { setErr("Name is required"); return; }
    setPending(true);
    try { await onCreate(name.trim(), description.trim(), Array.from(selected)); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setPending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">New Role</h2>
        <div className="space-y-3 mb-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Name *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Permissions</p>
        <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-3">
          {Object.entries(grouped).map(([group, keys]) => (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{group}</p>
              <div className="grid grid-cols-2 gap-1">
                {keys.map((key) => (
                  <button key={key} onClick={() => toggle(key)}
                    className={[
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors text-left",
                      selected.has(key)
                        ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-3)]",
                    ].join(" ")}>
                    <span className={[
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      selected.has(key)
                        ? "border-[var(--accent)] bg-[var(--accent)]"
                        : "border-[var(--border-strong)]",
                    ].join(" ")}>
                      {selected.has(key) && <Check size={10} className="text-white" />}
                    </span>
                    {key.split(".")[1]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--muted)]">{selected.size} permissions selected</p>

        {err && <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger)]"><AlertTriangle size={12} />{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors">
            {pending && <Loader2 size={14} className="animate-spin" />} Create Role
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Role row with expandable permissions ──────────────────────────────────────

function RoleRow({ role }: { role: AdminRole }) {
  const [expanded, setExpanded] = useState(false);
  const grouped = groupPermissions(role.permissions.map((rp) => rp.permission.key));

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--surface-2)] transition-colors">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)]">
          <BookKey size={15} className="text-[var(--accent)]" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--foreground)]">{role.name}</p>
          {role.description && (
            <p className="text-xs text-[var(--muted)] truncate">{role.description}</p>
          )}
        </div>
        <span className="text-xs text-[var(--muted)]">
          {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
        </span>
        {expanded ? <ChevronDown size={15} className="text-[var(--muted)]" /> : <ChevronRight size={15} className="text-[var(--muted)]" />}
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-4">
          {role.permissions.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No permissions assigned.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([group, keys]) => (
                <div key={group}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {keys.map((key) => (
                      <span key={key}
                        className="rounded-full bg-[var(--accent-subtle)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--accent)]">
                        {key}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [allPerms, setAllPerms] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [r, p] = await Promise.all([adminRolesApi.list(), adminRolesApi.listPermissions()]);
      setRoles(r); setAllPerms(p);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(name: string, description: string, permissionKeys: string[]) {
    await adminRolesApi.create({ name, description, permissionKeys });
    await load();
  }

  return (
    <AppLayout title="Roles">
      <div className="px-7 py-7">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Roles & Permissions</h1>
          <span className="text-sm text-[var(--muted)]">{roles.length} roles · {allPerms.length} permissions</span>
          <button onClick={load}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex-1" />
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
            <Plus size={15} /> New Role
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {roles.length === 0
              ? <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No roles yet</p>
              : roles.map((role) => <RoleRow key={role.id} role={role} />)
            }
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRoleDialog
          allPermissions={allPerms}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </AppLayout>
  );
}
