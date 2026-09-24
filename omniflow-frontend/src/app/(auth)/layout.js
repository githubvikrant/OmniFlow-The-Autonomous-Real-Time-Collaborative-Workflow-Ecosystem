'use client';

import Link from 'next/link';

// Features with a short keyword tag + one-line description
const FEATURES = [
  {
    tag: 'WebSockets',
    title: 'Real-time collaboration',
    desc: 'Every card move, edit, and comment syncs across all users instantly — no refresh, no delay.',
  },
  {
    tag: 'Socket.IO',
    title: 'Live presence indicators',
    desc: 'See who is viewing the same board right now, rendered as live user avatars.',
  },
  {
    tag: 'Gemini AI',
    title: 'AI-powered task generation',
    desc: 'Describe a goal in plain text. Gemini breaks it into structured, actionable tasks.',
  },
  {
    tag: 'JWT + OAuth',
    title: 'Dual-token authentication',
    desc: 'Short-lived access tokens in memory, long-lived refresh tokens in HttpOnly cookies. Google OAuth supported.',
  },
  {
    tag: 'Cloudinary',
    title: 'File attachments',
    desc: 'Upload images, PDFs, and documents directly to tasks via Multer and Cloudinary streaming.',
  },
];

// Tech stack chips shown at the bottom
const STACK = [
  'Next.js', 'Node.js', 'MongoDB', 'Socket.IO', 'Gemini AI', 'Docker',
];

export default function AuthLayout({ children }) {
  return (
    <div className="auth-split-layout">

      {/* ── LEFT: Pitch panel ──────────────────────────────────────────── */}
      <aside className="auth-pitch-panel" aria-label="About OmniFlow">

        {/* Wordmark */}
        <Link href="/" className="auth-pitch-logo__wordmark">
          Omni<span>Flow</span>
        </Link>

        {/* Headline block */}
        <div className="auth-pitch-headline">
          <p className="auth-pitch-headline__eyebrow">Full-stack project · 2026</p>
          <h1 className="auth-pitch-headline__title">
            A real-time collaborative<br />
            project management system.
          </h1>
          <p className="auth-pitch-headline__sub">
            Built from scratch — backend, frontend, WebSockets, AI, and Docker.
            Every engineering decision is intentional.
          </p>
        </div>

        {/* Feature list */}
        <ul className="auth-pitch-features" aria-label="Key features">
          {FEATURES.map((f) => (
            <li key={f.tag} className="auth-pitch-feature">
              <span className="auth-pitch-feature__tag">{f.tag}</span>
              <div className="auth-pitch-feature__body">
                <span className="auth-pitch-feature__title">{f.title}</span>
                <span className="auth-pitch-feature__desc">{f.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Stack chips */}
        <div className="auth-pitch-stack">
          {STACK.map((s) => (
            <span key={s} className="auth-pitch-stack__chip">{s}</span>
          ))}
        </div>

      </aside>

      {/* ── RIGHT: Form panel ──────────────────────────────────────────── */}
      <main className="auth-form-panel">
        <div className="auth-form-panel__inner">
          {children}
        </div>
      </main>

    </div>
  );
}
