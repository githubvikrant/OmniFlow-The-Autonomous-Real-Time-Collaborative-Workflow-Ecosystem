'use client';

/**
 * src/app/auth/callback/page.js — Google OAuth Callback Handler
 *
 * This page is the FRONTEND destination after a successful Google OAuth flow.
 *
 * Flow recap:
 *   1. User clicks "Continue with Google" on /login
 *   2. Browser navigates to GET /api/v1/auth/google (backend)
 *   3. Backend redirects to Google's consent screen
 *   4. User approves → Google redirects to /api/v1/auth/google/callback (backend)
 *   5. Backend issues our JWTs, sets HttpOnly refresh cookie,
 *      then redirects browser to: /auth/callback?token=<accessToken>
 *   6. THIS PAGE reads ?token= from the URL, stores it in memory,
 *      clears the token from the URL (so it's not in browser history),
 *      then navigates to /dashboard.
 *
 * WHY THIS PAGE EXISTS (instead of putting token in the URL forever):
 *   The access token in the URL is a temporary transfer mechanism.
 *   As soon as this page mounts, the token moves to module memory and
 *   history.replaceState() removes it from the URL. After that, no
 *   visible surface (URL bar, browser history) shows the token.
 *
 * ERROR HANDLING:
 *   If Google auth fails, the backend redirects to /login?error=google_auth_failed
 *   so this page only runs on success. But we still guard against a missing token.
 */

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAccessToken } from '@/lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('Authentication failed. Redirecting...');
      setTimeout(() => router.replace('/login?error=no_token'), 1500);
      return;
    }

    // 1. Store the access token in memory
    setAccessToken(token);

    // 2. Remove the token from the URL — it should not live in browser history
    //    replaceState changes the URL without adding a new history entry
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/auth/callback');
    }

    // 3. Navigate to the dashboard
    router.replace('/dashboard');
  }, [router, searchParams]);

  return (
    <div className="dashboard-placeholder">
      <div className="btn__spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
      <p className="dashboard-placeholder__desc">{status}</p>
    </div>
  );
}
