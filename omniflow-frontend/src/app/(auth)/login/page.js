'use client';

/**
 * Login Page — Clean, focused sign-in form.
 *
 * Layout: sits inside the right panel of AuthLayout.
 * Design: email/password first, Google below the divider.
 * No decorative color — form derives all color from design tokens.
 */

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api from '@/lib/axios';
import { setAccessToken } from '@/lib/auth';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import FormError from '@/components/ui/FormError';

// ─── Validation schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Google SVG Icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Inner form (needs useSearchParams, must be inside Suspense) ──────────────
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiError, setApiError] = useState(null);

  const justRegistered = searchParams.get('registered') === 'true';
  const resetSuccess   = searchParams.get('reset') === 'success';
  const oauthError     = searchParams.get('error') === 'google_auth_failed';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      const res = await api.post('/auth/login', data);
      setAccessToken(res.data.accessToken);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      setApiError(
        msg.includes('Invalid email or password')
          ? 'Incorrect email or password. If you signed up with Google, use "Continue with Google" instead.'
          : msg || 'Unable to sign in. Please try again.'
      );
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google`;
  };

  return (
    <div className="auth-form-card">

      {/* ── Header ── */}
      <div className="auth-form-card__header">
        <div className="auth-form-card__logo-mark" aria-hidden="true" />
        <h1 className="auth-form-card__title">Welcome back</h1>
        <p className="auth-form-card__subtitle">Sign in to your OmniFlow workspace</p>
      </div>

      {/* ── Banners ── */}
      {justRegistered && (
        <div className="auth-banner auth-banner--success">
          <span className="auth-banner__icon">✓</span>
          Account created — sign in below.
        </div>
      )}
      {resetSuccess && (
        <div className="auth-banner auth-banner--success">
          <span className="auth-banner__icon">✓</span>
          Password reset. Sign in with your new password.
        </div>
      )}
      {oauthError && (
        <div className="auth-banner auth-banner--error">
          Google sign-in failed. Try again or use email and password.
        </div>
      )}
      <FormError message={apiError} />

      {/* ── Email / Password form ── */}
      <form
        id="form-login"
        className="auth-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          label="Email address"
          id="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          error={errors.email}
          {...register('email')}
        />

        <div className="auth-form__password-row">
          <FormField
            label="Password"
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            error={errors.password}
            {...register('password')}
          />
          <Link href="/forgot-password" className="auth-form__forgot-link">
            Forgot password?
          </Link>
        </div>

        <Button
          id="btn-submit-login"
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
        >
          Sign in
        </Button>
      </form>

      {/* ── Divider ── */}
      <div className="auth-divider">
        <span className="auth-divider__text">or</span>
      </div>

      {/* ── Google OAuth ── */}
      <button
        id="btn-google-login"
        type="button"
        className="auth-google-btn"
        onClick={handleGoogleLogin}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* ── Footer ── */}
      <p className="auth-form-card__footer-text">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="auth-form-card__footer-link">
          Create one for free →
        </Link>
      </p>

    </div>
  );
}

// Suspense boundary required when using useSearchParams in App Router
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-form-card" />}>
      <LoginForm />
    </Suspense>
  );
}
