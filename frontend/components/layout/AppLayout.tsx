"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutTemplate, FolderOpen, CheckSquare, Shield,
  LogOut, Zap, Users, BookKey, ScrollText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  exact?: boolean;
}

function NavItem({ href, icon, label, badge, exact = false }: NavItemProps) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--accent-subtle)] text-[var(--accent)] font-medium"
          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
      ].join(" ")}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

function NavGroup({ label }: { label: string }) {
  return (
    <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
      {label}
    </p>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  /** Optional title shown in the topbar beside the breadcrumb */
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { user, logout, hasPermission } = useAuth();
  const pathname = usePathname();

  // Derive breadcrumb label from path
  const crumb =
    title ??
    (pathname.startsWith("/admin") ? "Admin" :
     pathname.startsWith("/cases") ? "Cases" :
     pathname.startsWith("/tasks") ? "Tasks" :
     pathname.startsWith("/workflows") ? "Workflow Editor" :
     "Dashboard");

  return (
    <div className="flex h-full bg-[var(--background)]">
      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[var(--border)] px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <Zap size={14} />
          </span>
          <span className="text-base font-bold tracking-tight text-[var(--foreground)]">
            FlowForge
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavGroup label="Workspace" />
          <NavItem href="/dashboard" icon={<LayoutTemplate size={15} />} label="Workflows" exact />
          <NavItem href="/cases"     icon={<FolderOpen size={15} />}     label="Cases" />
          <NavItem href="/tasks"     icon={<CheckSquare size={15} />}    label="My Tasks" />

          {hasPermission("user.manage") && (
            <>
              <NavGroup label="Administration" />
              <NavItem href="/admin/users" icon={<Users size={15} />}      label="Users" />
              <NavItem href="/admin/roles" icon={<BookKey size={15} />}    label="Roles" />
              {hasPermission("audit.read") && (
                <NavItem href="/admin/audit" icon={<ScrollText size={15} />} label="Audit Log" />
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-[var(--border)] px-3 py-3">
            <div className="mb-0.5 truncate text-xs font-semibold text-[var(--foreground)]">
              {user.firstName} {user.lastName}
            </div>
            <div className="mb-2 truncate text-[10px] text-[var(--muted)]">{user.email}</div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--danger)] transition-colors"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        )}
      </aside>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <span className="text-sm font-semibold text-[var(--foreground)]">{crumb}</span>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
