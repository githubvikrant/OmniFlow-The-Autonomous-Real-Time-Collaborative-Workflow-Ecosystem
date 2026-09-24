'use client';

/**
 * Register Page — Clean account creation form.
 *
 * Fields: Full name, Email, Password, Confirm Password.
 * Google OAuth is placed below the divider (consistent with login).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api from '@/lib/axios';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import FormError from '@/components/ui/FormError';

// ─── Validation schema ────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(50).trim(),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
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

export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    setApiError(null);
    try {
      await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
      });
      router.push('/login?registered=true');
    } catch (err) {
      setApiError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    }
  };

  const handleGoogleSignUp = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/google`;
  };

  return (
    <div className="auth-form-card">

      {/* ── Header ── */}
      <div className="auth-form-card__header">
        <div className="auth-form-card__logo-mark" aria-hidden="true" />
        <h1 className="auth-form-card__title">Create your account</h1>
        <p className="auth-form-card__subtitle">Start using OmniFlow for free — no credit card required</p>
      </div>

      <FormError message={apiError} />

      {/* ── Registration form ── */}
      <form
        id="form-register"
        className="auth-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          label="Full name"
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password}
          {...register('password')}
        />

        <FormField
          label="Confirm password"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat your password"
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <Button
          id="btn-submit-register"
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
        >
          Create account
        </Button>
      </form>

      {/* ── Divider ── */}
      <div className="auth-divider">
        <span className="auth-divider__text">or</span>
      </div>

      {/* ── Google OAuth ── */}
      <button
        id="btn-google-register"
        type="button"
        className="auth-google-btn"
        onClick={handleGoogleSignUp}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* ── Footer ── */}
      <p className="auth-form-card__footer-text">
        Already have an account?{' '}
        <Link href="/login" className="auth-form-card__footer-link">
          Sign in →
        </Link>
      </p>

    </div>
  );
}
