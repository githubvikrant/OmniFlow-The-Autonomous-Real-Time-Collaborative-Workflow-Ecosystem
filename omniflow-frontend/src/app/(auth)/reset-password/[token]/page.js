'use client';

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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function ResetPasswordPage({ params }) {
  const router = useRouter();
  const token = params?.token;
  const [apiError, setApiError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data) => {
    setApiError(null);

    try {
      await api.post(`/auth/reset-password/${token}`, {
        password: data.password,
      });

      router.push('/login?reset=success');
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.';
      setApiError(serverMsg);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Set new password</h1>
        <p className="auth-form-card__subtitle">
          Please enter your new password below.
        </p>
      </div>

      <FormError message={apiError} />

      <form
        id="form-reset-password"
        className="auth-form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          label="New Password"
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Min. 8 characters"
          error={errors.password}
          {...register('password')}
        />

        <FormField
          label="Confirm New Password"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          error={errors.confirmPassword}
          {...register('confirmPassword')}
        />

        <Button
          id="btn-submit-reset-password"
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
        >
          Reset Password & Sign In
        </Button>
      </form>

      <div className="auth-form-card__footer">
        <p className="auth-form-card__subtitle">
          Back to{' '}
          <Link href="/login">Sign in &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
