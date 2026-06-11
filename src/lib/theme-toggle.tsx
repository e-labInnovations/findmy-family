"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme";

/**
 * Sun/moon glass button. Sun-icon means "currently dark — tap to go
 * light"; moon-icon means the inverse. Matches the design convention.
 */
export function ThemeToggle({ className = "icon-btn glass" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
