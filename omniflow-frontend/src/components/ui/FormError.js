/**
 * src/components/ui/FormError.js — API-Level Error Banner
 *
 * Displays errors that come back from the server (not field validation errors).
 * Examples:
 *   - "Email already registered" (register page, duplicate email)
 *   - "Invalid email or password" (login page, wrong credentials)
 *   - "Something went wrong. Please try again." (500 from server)
 *
 * WHERE IT SITS IN THE FORM:
 *   ┌─────────────────────────────────┐
 *   │  ⚠ Email already registered.   │  ← FormError (API-level)
 *   ├─────────────────────────────────┤
 *   │  Email address                  │
 *   │  [you@example.com          ]    │
 *   │  ↑ "Invalid email" ← FormField error (field-level, from Zod)
 *   └─────────────────────────────────┘
 *
 * Renders nothing if `message` is empty/null — no empty space is reserved.
 */

'use client';

/**
 * @param {object} props
 * @param {string|null} props.message - The error message to display. Renders nothing if falsy.
 */
export default function FormError({ message }) {
  if (!message) return null;

  return (
    <div role="alert" className="auth-api-error">
      {message}
    </div>
  );
}
