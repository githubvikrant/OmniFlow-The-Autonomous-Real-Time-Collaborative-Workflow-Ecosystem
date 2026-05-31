/**
 * Drawer.js — A slide-in panel from the right edge of the screen
 *
 * ARCHITECTURE DECISION — Why NOT `if (!isOpen) return null`?
 *
 * The original implementation used `if (!isOpen) return null` which
 * removes the drawer from the DOM when closed. This has a fatal flaw:
 * CSS transitions cannot animate FROM nothing. If the element doesn't
 * exist, there's no "starting state" for the animation.
 *
 * The correct pattern is:
 *   - Keep the drawer in the DOM at ALL TIMES (rendered but hidden)
 *   - Use `data-open` attribute to toggle CSS classes/transforms
 *   - `aria-hidden="true"` hides it from screen readers when closed
 *   - `visibility: hidden` + `pointer-events: none` prevents interaction
 *
 * HOW THE ANIMATION WORKS:
 *   Closed state (default):
 *     `.drawer-content { transform: translateX(100%); }`
 *     Panel is fully off-screen to the right.
 *
 *   Open state (data-open="true"):
 *     `.drawer-overlay[data-open="true"] .drawer-content { transform: translateX(0); }`
 *     Panel slides into view from the right.
 *
 *   The overlay background also fades in: `opacity: 0` → `opacity: 1`
 *
 * FOCUS TRAP:
 *   When the drawer is open, Tab key should cycle through elements INSIDE
 *   the drawer, not the hidden board behind it. We implement a simple
 *   focus trap: on Tab, we query all focusable elements inside the drawer
 *   and wrap around at the boundaries (first ↔ last).
 *
 * ESCAPE KEY:
 *   Standard UX convention: pressing Escape closes any open panel/modal.
 *   We attach a `keydown` listener to `window` when `isOpen` is true.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';

export default function Drawer({ isOpen, onClose, title, children }) {
  const drawerRef = useRef(null);
  const previousFocusRef = useRef(null); // Track focus before drawer opened

  /**
   * Focus Trap — keeps keyboard focus inside the drawer when open.
   * Queries all focusable elements and wraps Tab/Shift+Tab around them.
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key !== 'Tab' || !drawerRef.current) return;

    // All interactive elements that can receive keyboard focus
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = Array.from(
      drawerRef.current.querySelectorAll(focusableSelectors)
    );

    if (focusableElements.length === 0) return;

    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift+Tab going backwards — wrap from first to last
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      // Tab going forward — wrap from last to first
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      // Store the element that had focus before opening (to restore later)
      previousFocusRef.current = document.activeElement;

      // Prevent the page behind from scrolling
      document.body.style.overflow = 'hidden';

      // Attach keyboard handlers
      window.addEventListener('keydown', handleKeyDown);

      // Auto-focus the first interactive element inside the drawer
      // Use a tiny timeout to wait for the CSS transition to begin
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const firstFocusable = drawerRef.current.querySelector(
            'input, textarea, select, button:not(.drawer-close-btn)'
          );
          firstFocusable?.focus();
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore scroll and focus when drawer closes
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);

      // Return focus to the element that triggered the drawer open
      // (e.g., the task card that was clicked)
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }
  }, [isOpen, handleKeyDown]);

  return (
    /*
     * The overlay always renders (never return null).
     * `data-open` drives all visual states via CSS attribute selectors.
     * `aria-hidden` hides the entire drawer from screen readers when closed.
     *
     * Clicking the dark overlay (but NOT the drawer panel itself)
     * closes the drawer — handled by the onClick on the overlay div.
     */
    <div
      className="drawer-overlay"
      data-open={isOpen}
      onClick={onClose}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="drawer-content"
        onClick={(e) => e.stopPropagation()} // ← Prevents clicks inside from closing
        ref={drawerRef}
      >
        {/* Drawer Header: title + close button */}
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <button
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="drawer-body">
          {children}
        </div>
      </div>
    </div>
  );
}
