/**
 * src/components/ui/Input.js — Styled HTML Input
 *
 * A low-level input component with consistent styling from globals.css.
 * Used inside FormField.js, but can also be used standalone.
 *
 * Design philosophy (matches globals.css):
 *   - Single border, no shadow theatrics
 *   - Blue border on focus only (not on every hover)
 *   - Error state: red border to draw attention
 *   - Placeholder in muted gray — not competing with typed text
 */

'use client';

import { forwardRef } from 'react';

/**
 * @param {object} props
 * @param {boolean} [props.hasError=false] - If true, applies the error border style
 * @param {string} [props.className]
 * @param {React.InputHTMLAttributes} rest - Any native input prop
 */
const Input = forwardRef(function Input({ hasError = false, className = '', ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={`form-field__input ${hasError ? 'form-field__input--error' : ''} ${className}`.trim()}
      {...rest}
    />
  );
});

export default Input;
