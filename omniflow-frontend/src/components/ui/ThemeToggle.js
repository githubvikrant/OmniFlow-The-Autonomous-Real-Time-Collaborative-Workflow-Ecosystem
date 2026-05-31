/**
 * ThemeToggle.js — Sun/Moon button for switching between light and dark mode
 *
 * Uses the `useTheme` hook from ThemeProvider to:
 *   - Read the current theme ('light' or 'dark')
 *   - Call `toggleTheme()` when clicked
 *
 * The icon changes based on the active theme:
 *   🌙 (moon) when in light mode → "switch to dark"
 *   ☀️ (sun) when in dark mode → "switch to light"
 *
 * This component is placed in the dashboard sidebar footer.
 * It works purely through CSS variables — no inline styles, no JS theming logic.
 */
'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle-btn"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Icon: moon in light mode, sun in dark mode */}
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle-label">
        {isDark ? 'Light mode' : 'Dark mode'}
      </span>
    </button>
  );
}
