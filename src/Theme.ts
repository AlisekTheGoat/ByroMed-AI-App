// src/theme.ts
/**
 * Jednoduchý theme manager:
 * - setDarkMode(true/false) zapíná/vypíná .dark na <html> a ukládá do localStorage
 * - initTheme() při startu načte uloženou volbu, případně použije systémové nastavení
 */

const THEME_KEY = "theme"; // "dark" | "light"

export function setDarkMode(enabled: boolean) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add("dark");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    html.classList.remove("dark");
    localStorage.setItem(THEME_KEY, "light");
  }
}

export function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      return;
    }
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      return;
    }
    // Pokud není nic uložené, respektuj systémový mód:
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (prefersDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {
    // Fallback – žádné localStorage (např. sandbox) → světlo
    document.documentElement.classList.remove("dark");
  }
}
