/**
 * Toast.js — Global notification system
 *
 * HOW IT WORKS:
 *   This component reads from the Zustand `toastStore` and renders
 *   floating notification banners in the bottom-right corner.
 *
 *   Any component in the app can call:
 *     const { addToast } = useToastStore();
 *     addToast('Task created!', 'success');
 *     addToast('Network error', 'error');
 *     addToast('Board shared', 'info');
 *
 *   The toastStore auto-dismisses each toast after 3 seconds.
 *   Users can also manually close by clicking ✕.
 *
 * STYLING:
 *   Three variants: success (green), error (red), info (neutral).
 *   Each gets a different border/background from globals.css.
 *   The `toast-slide-in` CSS animation makes them appear smoothly.
 *
 * WHY ZUSTAND (not React Context or localStorage)?
 *   - Zustand doesn't require Provider wrappers
 *   - Any component anywhere in the tree calls addToast() — no prop drilling
 *   - The toast container lives at the root layout, so it's always visible
 *   - State is ephemeral (toasts shouldn't persist on refresh — they're in memory only)
 */
'use client';

import { useToastStore } from '@/store/toastStore';

/**
 * Toast icons per type
 * Using simple text/emoji characters — no icon library dependency needed
 */
const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function Toast() {
  const { toasts, removeToast } = useToastStore();

  // If there are no toasts, render nothing
  if (toasts.length === 0) return null;

  return (
    /*
     * Fixed container in bottom-right corner.
     * z-index: 1000 places it above the drawer (z-index: 900).
     * Flex column with gap creates stacked toasts.
     */
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-message toast--${toast.type}`}
          role="alert"
        >
          {/* Icon indicator on the left */}
          <span className="toast-icon" aria-hidden="true">
            {TOAST_ICONS[toast.type] || TOAST_ICONS.info}
          </span>

          {/* Message text */}
          <p className="toast-text">{toast.message}</p>

          {/* Manual dismiss button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="toast-close"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
