'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ loading: false, success: false, error: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8) {
      setStatus({ loading: false, success: false, error: 'Password must be at least 8 characters long.' });
      return;
    }

    setStatus({ loading: true, success: false, error: null });

    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setStatus({ loading: false, success: true, error: null });
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error: err.response?.data?.message || 'Failed to reset password. Token may be expired or invalid.',
      });
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Create New Password</h1>
        <p className="auth-card__subtitle">
          Please enter and confirm your new account password below.
        </p>
      </div>

      {status.success ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Password Reset Successful!</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Redirecting you to login page...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {status.error && (
            <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              ⚠️ {status.error}
            </div>
          )}

          <div className="form-field">
            <label className="form-field__label" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="form-field__input"
            />
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="form-field__input"
            />
          </div>

          <button
            type="submit"
            disabled={status.loading}
            className="btn btn--primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {status.loading ? 'Updating Password...' : 'Reset Password'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link href="/login" style={{ color: 'var(--color-accent)', fontSize: '0.85rem', textDecoration: 'none' }}>
              ← Back to Login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
