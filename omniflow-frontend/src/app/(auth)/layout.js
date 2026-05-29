/**
 * src/app/(auth)/layout.js — Auth Route Group Layout
 *
 * The (auth) folder is a Next.js "route group" — the parentheses mean it
 * doesn't add a URL segment. Both /login and /register exist at the root,
 * but they share this layout for the split-panel design.
 *
 * WHY A SEPARATE LAYOUT?
 * The auth pages (login, register) have a completely different structure
 * than dashboard pages. They need the left brand panel + right form panel.
 * Keeping this in a separate layout prevents it from affecting dashboard pages.
 */

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      {/* ── Left brand panel ── */}
      <aside className="auth-layout__brand" aria-hidden="true">
        <div className="auth-layout__brand-logo">
          Omni<span>Flow</span>
        </div>

        <p className="auth-layout__brand-tagline">
          The autonomous real-time collaborative workflow ecosystem for modern engineering teams.
        </p>

        <ul className="auth-layout__brand-features">
          <li className="auth-layout__brand-feature">
            <span className="auth-layout__brand-feature-icon">⚡</span>
            <span>Real-time sync — see teammate changes the moment they happen</span>
          </li>
          <li className="auth-layout__brand-feature">
            <span className="auth-layout__brand-feature-icon">🤖</span>
            <span>AI task generation — turn a goal into a full sprint backlog</span>
          </li>
          <li className="auth-layout__brand-feature">
            <span className="auth-layout__brand-feature-icon">🔒</span>
            <span>Role-based access — Admin, Member, and Viewer permissions</span>
          </li>
          <li className="auth-layout__brand-feature">
            <span className="auth-layout__brand-feature-icon">📎</span>
            <span>File attachments — PDFs and images served from a global CDN</span>
          </li>
        </ul>
      </aside>

      {/* ── Right form panel ── */}
      <main className="auth-layout__form-panel">
        {children}
      </main>
    </div>
  );
}
