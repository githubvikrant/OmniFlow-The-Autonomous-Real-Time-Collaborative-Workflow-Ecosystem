'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import api from '@/lib/axios';
import FormField from '@/components/ui/FormField';
import Button from '@/components/ui/Button';
import FormError from '@/components/ui/FormError';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

export default function ForgotPasswordPage() {
  const [apiError, setApiError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setApiError(null);
    setSuccessInfo(null);

    try {
      const response = await api.post('/auth/forgot-password', data);
      const resetUrl = response.data?.data?.resetUrl;
      setSuccessInfo({
        message: 'Password reset link generated successfully!',
        resetUrl,
      });
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Unable to request password reset.';
      setApiError(serverMsg);
    }
  };

  return (
    <div className="auth-form-card">
      <div className="auth-form-card__header">
        <h1 className="auth-form-card__title">Reset password</h1>
        <p className="auth-form-card__subtitle">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <FormError message={apiError} />

      {successInfo && (
        <div style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: '#4ade80',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          marginBottom: '16px'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{successInfo.message}</p>
          {successInfo.resetUrl && (
            <p style={{ marginTop: '8px', marginBottom: 0, wordBreak: 'break-all', fontSize: '0.85rem' }}>
              Reset Link: <Link href={successInfo.resetUrl} style={{ color: '#818cf8', textDecoration: 'underline' }}>{successInfo.resetUrl}</Link>
            </p>
          )}
        </div>
      )}

      <form
        id="form-forgot-password"
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

        <Button
          id="btn-submit-forgot-password"
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="auth-form-card__footer">
        <p className="auth-form-card__subtitle">
          Remembered your password?{' '}
          <Link href="/login">Back to Sign in &rarr;</Link>
        </p>
      </div>
    </div>
  );
}
