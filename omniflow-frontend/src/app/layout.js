import { Inter } from "next/font/google";
import "./globals.css";

/**
 * Root Layout — wraps every page in the application.
 *
 * Inter font: loaded from Google Fonts via next/font (zero layout shift,
 * self-hosted by Next.js — not a third-party request at runtime).
 *
 * Token refresh on mount:
 *   The silent refresh (POST /auth/refresh-token on page load) will be
 *   added on Day 6 inside the Zustand auth store's initialization logic.
 *   That's the right place — it needs the store's setState to be available.
 */

const inter = Inter({
  subsets: ["latin"],
  display: "swap",          // Show fallback font while Inter loads (no FOIT)
});

export const metadata = {
  title: {
    default: "OmniFlow — Collaborative Workflow Ecosystem",
    template: "%s | OmniFlow",  // e.g. "Login | OmniFlow"
  },
  description:
    "OmniFlow is an autonomous real-time collaborative workflow ecosystem. " +
    "AI-powered task generation, WebSocket live sync, and Kanban boards for modern engineering teams.",
  keywords: ["project management", "kanban", "AI", "collaboration", "real-time"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
