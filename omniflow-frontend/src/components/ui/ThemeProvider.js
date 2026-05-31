/**
 * ThemeProvider.js — Global dark/light mode manager
 *
 * HOW DARK MODE WORKS IN THIS APP:
 *
 * We avoid adding/removing CSS classes. Instead, we set a `data-theme`
 * attribute on the root `<html>` element. In globals.css, we have:
 *
 *   :root { --color-bg: #ffffff; ... }          ← Light mode defaults
 *   [data-theme="dark"] { --color-bg: #0d1117; } ← Dark mode overrides
 *
 * Any component that uses `var(--color-bg)` automatically gets the right
 * color for the current theme. No conditional rendering, no theme props
 * passed to every component — just CSS doing its job.
 *
 * WHY localStorage?
 *   We persist the theme preference in localStorage so it survives:
 *   - Page refreshes
 *   - Browser restarts
 *   - Navigation between pages
 *
 * WHY NOT Context API?
 *   We could use React Context, but since the theme is stored in a DOM
 *   attribute (not React state), we can use a simpler pattern:
 *   - ThemeProvider reads localStorage on mount and applies `data-theme`
 *   - Any component that wants to toggle uses the `useTheme` hook
 *   - The hook reads the current `data-theme` value from the DOM
 *
 * FLASH PREVENTION:
 *   To prevent a flash of wrong theme on page load, we apply the theme
 *   attribute SYNCHRONOUSLY before the first render, using a script tag
 *   injected via Next.js's `<head>` or by reading localStorage immediately
 *   in the `useEffect`. The 'undefined' window check handles SSR gracefully.
 *
 * USAGE:
 *   Wrap your root layout with <ThemeProvider>.
 *   Then use the <ThemeToggle> component anywhere.
 */
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

// The theme preference key in localStorage
const STORAGE_KEY = 'omniflow-theme';

// Default theme
const DEFAULT_THEME = 'light';

// React context for sharing theme state + toggle function
const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

/**
 * useTheme — Custom hook to access theme state and toggle function.
 * Use this inside any component that needs to read or change the theme.
 *
 * @returns {{ theme: 'light' | 'dark', toggleTheme: () => void }}
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * ThemeProvider — Wrap this around your root layout.
 * It reads the saved theme from localStorage and applies it to <html>.
 */
export default function ThemeProvider({ children }) {
  // Initialize with default — will be overridden immediately in useEffect
  const [theme, setTheme] = useState(DEFAULT_THEME);

  /**
   * On first mount: read the saved theme preference from localStorage
   * and apply it to the <html> element. This also runs synchronously
   * within the first effect, so the page renders with the correct theme.
   */
  useEffect(() => {
    // localStorage is only available in the browser (not during SSR)
    const savedTheme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    setTheme(savedTheme);
    // Apply the `data-theme` attribute to <html>
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []); // Empty deps — run once on mount

  /**
   * toggleTheme — Switches between 'light' and 'dark'.
   * Updates:
   *   1. React state (causes ThemeToggle button to re-render with new icon)
   *   2. The <html> data-theme attribute (triggers CSS variable swap globally)
   *   3. localStorage (persists across page loads)
   */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      // Apply to DOM
      document.documentElement.setAttribute('data-theme', next);
      // Persist preference
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
