'use client';

/**
 * src/app/dashboard/page.js — Dashboard Placeholder
 *
 * Day 5 placeholder. The real Kanban board UI is built on Day 6.
 *
 * What this page does right now:
 *   - Renders a minimal "you're logged in" confirmation screen
 *   - Provides a logout button to test the logout flow
 *   - Will be replaced entirely on Day 6 with the full board UI
 *
 * The protected route guard (redirect to /login if not authenticated)
 * will be added on Day 6 when we set up Zustand auth store. For now,
 * users can navigate here directly — that's fine for Day 5.
 */

import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { clearAccessToken } from '@/lib/auth';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Tell the server to clear the HttpOnly refresh token cookie
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails, clear the client-side token
    }
    clearAccessToken();
    router.push('/login');
  };

  return (
    <div className="dashboard-placeholder">
      <span className="dashboard-placeholder__badge">Day 6 — Coming Soon</span>

      <h1 className="dashboard-placeholder__title">
        You&apos;re logged in 🎉
      </h1>

      <p className="dashboard-placeholder__desc">
        The Kanban board will be built here on Day 6 using Zustand and dnd-kit.
        Authentication is working correctly.
      </p>

      <Button
        id="btn-dashboard-logout"
        variant="secondary"
        onClick={handleLogout}
      >
        Sign out
      </Button>
    </div>
  );
}
