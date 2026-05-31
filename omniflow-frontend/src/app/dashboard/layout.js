/**
 * layout.js — Dashboard Layout (sidebar + main content area)
 *
 * WHAT THIS FILE DOES:
 *   This layout wraps ALL dashboard pages (/dashboard, /dashboard/board/[id]).
 *   It renders the sidebar (navigation + user info) and the main content slot.
 *
 * AUTH GUARD:
 *   On mount, it calls GET /auth/me to verify the JWT is still valid.
 *   - If successful: stores user in Zustand authStore, renders the layout
 *   - If it fails (401): clears the token from memory and redirects to /login
 *
 *   This is a CLIENT-SIDE auth guard (useEffect). We don't use Next.js
 *   middleware or server-side redirect because the JWT lives in memory
 *   (not cookies accessible on the server). This is a deliberate XSS
 *   security choice — see src/lib/auth.js for details.
 *
 * THEME TOGGLE:
 *   The sidebar footer contains the ThemeToggle button.
 *   Dark mode state lives in ThemeProvider (root layout), not here.
 *
 * SIDEBAR STRUCTURE:
 *   ┌─────────────────────┐
 *   │ [logo] OmniFlow     │  ← Header with brand
 *   │─────────────────────│
 *   │ ❖ Boards            │  ← Nav items
 *   │                     │
 *   │   (flex: 1 gap)     │
 *   │─────────────────────│
 *   │ [avatar] Name       │  ← User info
 *   │ 🌙 Dark mode        │  ← Theme toggle
 *   │ Logout              │
 *   └─────────────────────┘
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { clearAccessToken } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, login, logout, isLoading, setLoading } = useAuthStore();

  /**
   * Auth Guard — runs once on mount.
   * Calls /auth/me to verify the access token is valid.
   * If the Axios interceptor has already refreshed the token from the
   * refresh cookie, this will succeed with the new token.
   */
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        // Store the full user profile in Zustand
        login(res.data.data.user);
      } catch {
        // Token invalid or expired — clear everything and go to login
        logout();
        clearAccessToken();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [login, logout, router, setLoading]);

  /**
   * Logout handler.
   * 1. Calls the backend to clear the refresh token cookie
   * 2. Clears the in-memory access token
   * 3. Resets Zustand auth state
   * 4. Redirects to /login
   */
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue logout even if the API call fails
    }
    clearAccessToken();
    logout();
    router.push('/login');
  };

  // Show loading state while we're checking auth
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" aria-label="Loading OmniFlow..." />
        <p>Loading OmniFlow...</p>
      </div>
    );
  }

  // If auth check failed, useEffect will redirect. Return null to avoid flash.
  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="dashboard-sidebar" aria-label="Main navigation">

        {/* Brand header */}
        <div className="dashboard-sidebar__header">
          {/* The blue square is OmniFlow's logo mark */}
          <div className="logo-placeholder" aria-hidden="true" />
          <span className="brand-text">OmniFlow</span>
        </div>

        {/* Navigation links */}
        <nav className="dashboard-sidebar__nav" aria-label="Primary">
          <Link href="/dashboard" className="nav-item">
            <span className="nav-item__icon" aria-hidden="true">❖</span>
            Boards
          </Link>
          {/* Day 8+: Team, Notifications, Settings nav items will go here */}
        </nav>

        {/* Sidebar footer: user info + theme toggle + logout */}
        <div className="dashboard-sidebar__footer">

          {/* User profile section */}
          <div className="user-profile">
            {/*
             * Avatar — shows first letter of user's name.
             * Background color is set in CSS (.avatar--default uses
             * the accent color in light mode, a muted blue in dark mode).
             */}
            <div className="avatar avatar--default" aria-hidden="true">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <p className="user-name">{user.name}</p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          {/* Theme toggle — switches between light and dark mode */}
          <ThemeToggle />

          {/* Logout button */}
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            aria-label="Log out of OmniFlow"
          >
            ↩ Log out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      {/* The {children} here will be either dashboard/page.js or board/[id]/page.js */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
