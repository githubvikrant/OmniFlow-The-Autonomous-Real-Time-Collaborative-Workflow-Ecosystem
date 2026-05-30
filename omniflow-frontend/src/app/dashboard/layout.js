'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { clearAccessToken, getAccessToken } from '@/lib/auth';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, login, logout, isLoading, setLoading } = useAuthStore();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Only fetch if we have an access token in memory
        // Or we rely on the interceptor to refresh if it's missing
        const res = await api.get('/auth/me');
        login(res.data.data.user);
      } catch (error) {
        logout();
        clearAccessToken();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [login, logout, router, setLoading]);

  if (isLoading) {
    return <div className="dashboard-loading">Loading OmniFlow...</div>;
  }

  // If not authenticated, the useEffect will redirect. 
  // Return null briefly to prevent flash of content.
  if (!user) return null;

  return (
    <div className="dashboard-layout">
      {/* Minimal Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar__header">
          <div className="logo-placeholder"></div>
          <span className="brand-text">OmniFlow</span>
        </div>

        <nav className="dashboard-sidebar__nav">
          <Link href="/dashboard" className="nav-item">
            <span className="nav-item__icon">❖</span>
            Boards
          </Link>
          {/* Settings option removed per user request */}
        </nav>

        <div className="dashboard-sidebar__footer">
          <div className="user-profile">
            {/* Default avatar for all users as requested */}
            <div className="avatar avatar--default">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <p className="user-name">{user.name}</p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
