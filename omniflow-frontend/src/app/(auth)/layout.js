/**
 * src/app/(auth)/layout.js — Auth Route Group Layout
 *
 * Full-screen centered layout shared by /login and /register.
 * No side panels — clean white background, logo top-left, form centered.
 */

export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      {/* Minimal top bar */}
      <header className="auth-page__header">
        <span className="auth-page__logo">
          Omni<span>Flow</span>
        </span>
      </header>

      {/* Centered form */}
      <main className="auth-page__main">
        {children}
      </main>
    </div>
  );
}
