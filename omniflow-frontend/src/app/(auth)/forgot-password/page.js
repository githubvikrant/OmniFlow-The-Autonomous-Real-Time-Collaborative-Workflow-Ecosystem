'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, success: false, error: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    try {
      await api.post('/auth/forgot-password', { email });
      setStatus({
        loading: false,
        success: true,
        error: null,
      });
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error: err.response?.data?.message || 'Failed to process request. Please try again.',
      });
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Reset Password</h1>
        <p className="auth-card__subtitle">
          Enter your registered email address and we will send you password reset instructions.
        </p>
      </div>

      {status.success ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✉️</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Check Your Email</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            If an account exists for <strong>{email}</strong>, we have sent instructions to reset your password.
          </p>
          <Link href="/login" className="btn btn--primary" style={{ width: '100%', textDecoration: 'none', display: 'inline-block' }}>
            Return to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {status.error && (
            <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              ⚠️ {status.error}
            </div>
          )}

          <div className="form-field">
            <label className="form-field__label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="form-field__input"
            />
          </div>

          <button
            type="submit"
            disabled={status.loading}
            className="btn btn--primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {status.loading ? 'Sending Instructions...' : 'Send Reset Link'}
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
