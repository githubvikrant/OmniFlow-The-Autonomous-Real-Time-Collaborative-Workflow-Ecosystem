/**
 * src/components/ui/Button.js — Reusable Button Component
 *
 * Three variants:
 *   - primary   → filled blue, for main CTA actions (Login, Register, Submit)
 *   - secondary → outlined, for secondary actions (Cancel)
 *   - ghost     → no background, for OAuth/social buttons (custom inner content)
 *
 * Loading state:
 *   When isLoading={true}, the button shows a spinner and is disabled.
 *   This prevents double-submits on async actions.
 *
 * Usage:
 *   <Button variant="primary" isLoading={isSubmitting}>Sign In</Button>
 *   <Button variant="ghost" fullWidth onClick={handleOAuth}>...</Button>
 */

'use client';

/**
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'} [props.variant='primary']
 * @param {boolean} [props.isLoading=false]
 * @param {boolean} [props.fullWidth=false]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 * @param {React.ButtonHTMLAttributes} rest - Any native button prop (type, disabled, onClick, etc.)
 */
export default function Button({
  variant = 'primary',
  isLoading = false,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const base = 'btn';
  const variantClass = `btn--${variant}`;
  const widthClass = fullWidth ? 'btn--full' : '';

  return (
    <button
      className={`${base} ${variantClass} ${widthClass} ${className}`.trim()}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading ? (
        <span className="btn__spinner" aria-hidden="true" />
      ) : null}
      <span className={isLoading ? 'btn__label--loading' : ''}>{children}</span>
    </button>
  );
}
