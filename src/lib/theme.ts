"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "fmf-theme";

/**
 * Read the current theme as set on the <html> element by the anti-flash
 * inline script, and return a setter that updates the DOM + localStorage.
 *
 * On first render the value is "dark" (matches the script's default for
 * users who haven't picked one yet); useEffect immediately syncs to the
 * actual attribute. This avoids a hydration mismatch.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) ?? "dark";
    setThemeState(current);
  }, []);

  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private window etc. — non-fatal
    }
    setThemeState(next);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}

/**
 * Inline-script source. Runs synchronously in <head> before React mounts
 * so the page paints with the right theme on first render (no flash).
 * Reads localStorage first, then falls back to OS preference.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{
  var saved=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  var prefersDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme=saved||(prefersDark?'dark':'light');
  document.documentElement.dataset.theme=theme;
}catch(e){document.documentElement.dataset.theme='dark';}})();
`.trim();
