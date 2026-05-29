'use client';

/**
 * src/app/(auth)/login/page.js — Login Page
 *
 * Form fields:     Email, Password
 * Validation:      react-hook-form + Zod (client-side, before any API call)
 * API call:        POST /auth/login via the custom Axios instance
 * Success:         setAccessToken() → router.push('/dashboard')
 * Failure:         Display the server error message above the form
 * Google OAuth:    Link to GET /api/v1/auth/google (browser redirect, not AJAX)
 *
 * WHY REACT-HOOK-FORM + ZOD?
 *   - react-hook-form handles form state, dirty tracking, and submission.
 *   - Zod provides schema-based validation that we can share with the backend
 *     (same schema language). @hookform/resolvers bridges them together.
 *   - Validation runs entirely in the browser — no API call needed for
 *     "email format is wrong" or "password too short".
 *
 * WHY NOT useState FOR FORM STATE?
 *   With useState, every keystroke re-renders the entire component.
 *   react-hook-form uses uncontrolled inputs — only re-renders on submit
 *   or explicit trigger. Much faster in forms with many fields.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api from '@/lib/axios';
import { setAccessToken } from '@/lib/auth';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import FormError from '@/components/ui/FormError';

// ─── Zod validation schema ────────────────────────────────────────────────────
// Mirrors the loginSchema in the backend's utils/validators.js
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

// ─── Google SVG Icon ──────────────────────────────────────────────────────────
// Inline SVG to avoid an extra dependency just for one icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // ── Form submit handler ───────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setApiError(null); // Clear any previous error

    try {
      const response = await api.post('/auth/login', data);
      // Store the access token in module-level memory (XSS-safe)
      // The refresh token is set as an HttpOnly cookie by the server
      setAccessToken(response.data.accessToken);
      router.push('/dashboard');
    } catch (err) {
      // Extract the server's error message if available
      const message =
        err.response?.data?.message ||
        'Unable to sign in. Please check your connection and try again.';
      setApiError(message);
    }
  };

  // ── Google OAuth click ────────────────────────────────────────────────────
  // This is NOT an API call — it's a browser navigation to the backend.
  // The backend redirects to Google's consent screen. No CORS needed.
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auth-form-card">

      {/* Header */}
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Sign in to OmniFlow</h1>
        <p className="auth-form-card__subtitle">
          Don&apos;t have an account?{' '}
          <Link href="/register">Create one for free</Link>
        </p>
      </div>

      {/* API-level error (wrong credentials, server down, etc.) */}
      <FormError message={apiError} />

      {/* Google OAuth button — above the form, as it's the faster path */}
      <Button
        id="btn-google-login"
        variant="ghost"
        fullWidth
        onClick={handleGoogleLogin}
        type="button"
      >
        <span className="oauth-btn-inner">
          <span className="oauth-btn-inner__icon">
            <GoogleIcon />
          </span>
          Continue with Google
        </span>
      </Button>

      {/* "or" divider */}
      <div className="auth-divider">
        <span className="auth-divider__text">or sign in with email</span>
      </div>

      {/* Email + Password form */}
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
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email}
          {...register('email')}
        />

        <FormField
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password}
          {...register('password')}
        />

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

    </div>
  );
}
