"use client";

import { useEffect, useState } from "react";
import {
  Loader2, AlertTriangle, UserPlus, RefreshCw,
  ShieldCheck, ShieldOff, Eye, EyeOff, Check,
} from "lucide-react";
import { adminUsersApi, adminRolesApi, type AdminUser, type AdminRole } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";

// ── Create user dialog ────────────────────────────────────────────────────────

function CreateUserDialog({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (v: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [showPw, setShowPw] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function submit() {
    const { email, password, firstName, lastName } = form;
    if (!email || !password || !firstName || !lastName) {
      setErr("All fields are required"); return;
    }
    setPending(true);
    try { await onCreate(form); onClose(); }
    catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setPending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-[var(--foreground)]">New User</h2>
        <div className="space-y-3">
          {(["firstName","lastName","email"] as const).map((k) => (
            <div key={k}>
              <label className="mb-1 block text-xs font-medium text-[var(--muted)] capitalize">
                {k.replace(/([A-Z])/g," $1")} *
              </label>
              <input autoFocus={k === "firstName"} value={form[k]} onChange={set(k)}
                type={k === "email" ? "email" : "text"}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--muted)]">Password *</label>
            <div className="relative">
              <input value={form.password} onChange={set("password")}
                type={showPw ? "text" : "password"}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 pr-10 text-sm text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none" />
              <button type="button" onClick={() => setShowPw((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          {err && <p className="flex items-center gap-1.5 text-xs text-[var(--danger)]"><AlertTriangle size={12} />{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors">
            {pending && <Loader2 size={14} className="animate-spin" />} Create User
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assign role popover ───────────────────────────────────────────────────────

function AssignRolePopover({ user, roles, onAssign, onClose }: {
  user: AdminUser;
  roles: AdminRole[];
  onAssign: (roleId: string) => Promise<void>;
  onClose: () => void;
}) {
  const assignedIds = new Set(user.userRoles.map((ur) => ur.role.id));
  const [pending, setPending] = useState<string | null>(null);

  async function assign(roleId: string) {
    setPending(roleId);
    try { await onAssign(roleId); }
    finally { setPending(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Assign role to {user.firstName}
        </p>
        <div className="space-y-1">
          {roles.map((role) => {
            const has = assignedIds.has(role.id);
            return (
              <button key={role.id} onClick={() => !has && assign(role.id)} disabled={has || !!pending}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  has
                    ? "bg-[var(--accent-subtle)] text-[var(--accent)] cursor-default"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-2)] disabled:opacity-50",
                ].join(" ")}>
                {pending === role.id
                  ? <Loader2 size={14} className="animate-spin text-[var(--accent)]" />
                  : has ? <Check size={14} /> : <div className="h-3.5 w-3.5 rounded border border-[var(--border)]" />}
                {role.name}
              </button>
            );
          })}
        </div>
        <button onClick={onClose}
          className="mt-3 w-full rounded-lg border border-[var(--border)] py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
          Done
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true); setError(null);
    try {
      const [u, r] = await Promise.all([adminUsersApi.list(), adminRolesApi.list()]);
      setUsers(u); setRoles(r);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(body: { email: string; password: string; firstName: string; lastName: string }) {
    await adminUsersApi.create(body);
    await load();
  }

  async function toggleActive(user: AdminUser) {
    await adminUsersApi.update(user.id, { isActive: !user.isActive });
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
  }

  async function handleAssignRole(userId: string, roleId: string) {
    const updated = await adminUsersApi.assignRole(userId, roleId);
    setUsers((prev) => prev.map((u) => u.id === userId ? updated : u));
    if (assignTarget?.id === userId) setAssignTarget(updated);
  }

  const filtered = search
    ? users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <AppLayout title="Users">
      <div className="px-7 py-7">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--foreground)]">Users</h1>
          <span className="text-sm text-[var(--muted)]">{users.length} total</span>
          <button onClick={load}
            className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none w-52" />
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
            <UserPlus size={15} /> New User
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
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              <span>User</span>
              <span>Roles</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {filtered.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-[var(--muted)]">No users found</p>
            )}

            {filtered.map((user, i) => (
              <div key={user.id}
                className={`grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-[var(--border)]" : ""}`}>
                {/* Name / Email */}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {user.userRoles.length === 0
                    ? <span className="text-xs text-[var(--muted)]">No roles</span>
                    : user.userRoles.map((ur) => (
                        <span key={ur.role.id}
                          className="rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                          {ur.role.name}
                        </span>
                      ))
                  }
                </div>

                {/* Status */}
                <span className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  user.isActive
                    ? "bg-[var(--success-subtle)] text-[var(--success)]"
                    : "bg-[var(--surface-2)] text-[var(--muted)]",
                ].join(" ")}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setAssignTarget(user)} title="Assign role"
                    className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--accent)] transition-colors">
                    <ShieldCheck size={14} />
                  </button>
                  <button onClick={() => toggleActive(user)}
                    title={user.isActive ? "Deactivate" : "Activate"}
                    className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--warning)] transition-colors">
                    {user.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserDialog onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
      {assignTarget && (
        <AssignRolePopover
          user={assignTarget}
          roles={roles}
          onAssign={(roleId) => handleAssignRole(assignTarget.id, roleId)}
          onClose={() => setAssignTarget(null)}
        />
      )}
    </AppLayout>
  );
}
