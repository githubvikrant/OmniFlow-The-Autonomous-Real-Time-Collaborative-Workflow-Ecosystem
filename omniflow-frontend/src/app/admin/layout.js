'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import api from '@/lib/axios';
import { clearAccessToken } from '@/lib/auth';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await api.get('/auth/me');
        if (isMounted) {
          const currentUser = response.data.data.user;
          if (currentUser.role !== 'admin') {
            router.replace('/dashboard');
            return;
          }
          setUser(currentUser);
        }
      } catch (err) {
        if (isMounted) {
          clearAccessToken();
          router.replace('/login?reason=unauthenticated');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAccessToken();
      router.push('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Verifying admin credentials...
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="dashboard-layout">
      {/* Admin Sidebar */}
      <aside className="dashboard-sidebar" aria-label="Admin Navigation">
        <div className="dashboard-sidebar__header">
          <div className="logo-placeholder" aria-hidden="true" style={{ backgroundColor: '#818cf8' }} />
          <span className="brand-text">Admin Portal</span>
        </div>

        <nav className="dashboard-sidebar__nav" aria-label="Admin Links">
          <Link href="/dashboard" className="nav-item">
            <span className="nav-item__icon" aria-hidden="true">⇇</span>
            Back to User Dashboard
          </Link>
        </nav>

        <div className="dashboard-sidebar__footer">
          <div className="user-profile">
            <div className="avatar avatar--default" style={{ backgroundColor: '#4f46e5' }} aria-hidden="true">
              {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <p className="user-name" style={{ fontWeight: 700 }}>
                {user.name} <span style={{ fontSize: '0.7rem', background: '#4f46e5', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>ADMIN</span>
              </p>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          <ThemeToggle />

          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            aria-label="Log out"
          >
            ↩ Log out
          </button>
        </div>
      </aside>

      {/* Main Admin View */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
