"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
        "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]",
        "hover:border-[var(--border-strong)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        "active:scale-95",
        className,
      ].join(" ")}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
