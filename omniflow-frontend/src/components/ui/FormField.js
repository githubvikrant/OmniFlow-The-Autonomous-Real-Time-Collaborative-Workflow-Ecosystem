/**
 * src/components/ui/FormField.js — Labeled Input with Error Display
 *
 * Integrates with react-hook-form's register() and formState.errors.
 *
 * WHY A WRAPPER COMPONENT?
 *   Every form field needs: a <label>, an <input>, and an error <p>.
 *   Without this wrapper, every form would repeat that triple pattern
 *   and style each one individually. This keeps the form pages clean.
 *
 * Usage:
 *   const { register, formState: { errors } } = useForm();
 *
 *   <FormField
 *     label="Email address"
 *     id="email"
 *     type="email"
 *     autoComplete="email"
 *     placeholder="you@example.com"
 *     error={errors.email}
 *     {...register('email')}
 *   />
 */

'use client';

import { forwardRef } from 'react';

/**
 * @param {object} props
 * @param {string} props.label       - The visible label text
 * @param {string} props.id          - Input id (also used for htmlFor)
 * @param {object} [props.error]     - react-hook-form FieldError object
 * @param {string} [props.hint]      - Optional hint text below the label
 */
const FormField = forwardRef(function FormField(
  { label, id, error, hint, ...inputProps },
  ref
) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>

      {hint && (
        <span className="form-field__hint">{hint}</span>
      )}

      <input
        id={id}
        ref={ref}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? 'true' : 'false'}
        className={`form-field__input ${error ? 'form-field__input--error' : ''}`}
        {...inputProps}
      />

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="form-field__error"
        >
          {error.message}
        </p>
      )}
    </div>
  );
});

export default FormField;
