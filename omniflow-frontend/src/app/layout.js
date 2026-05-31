/**
 * layout.js — Root Layout (wraps every page in the application)
 *
 * WHAT THIS FILE DOES:
 *   This is Next.js App Router's root layout. Every page in the app
 *   is rendered inside this wrapper. It's the ideal place for:
 *   - Global CSS imports
 *   - Google Fonts (loaded once, cached globally)
 *   - Global providers (ThemeProvider, Toast)
 *   - HTML metadata (title, description, SEO)
 *
 * THEMPROVIDER:
 *   Wraps the entire app in a React Context that manages dark/light mode.
 *   Reads from localStorage on mount and applies `data-theme` to <html>.
 *   See: src/components/ui/ThemeProvider.js for implementation details.
 *
 * TOAST:
 *   The global Toast notification component lives here so it's always
 *   available no matter which page the user is on. It reads from the
 *   Zustand toastStore — any component can call addToast() and the
 *   notification appears here at the root level.
 *
 * INTER FONT:
 *   Loaded via next/font/google which:
 *   - Self-hosts the font (no Google Fonts network request at runtime)
 *   - Prevents FOIT (Flash of Invisible Text) with display: 'swap'
 *   - Generates a unique className that's applied to <body>
 */

import { Inter } from 'next/font/google';
import './globals.css';
import Toast from '@/components/ui/Toast';
import ThemeProvider from '@/components/ui/ThemeProvider';

// Load Inter from Google Fonts — Next.js self-hosts this at build time
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Show fallback font while Inter loads (prevents blank text flash)
});

// SEO metadata — Next.js App Router reads this for <head> tags
export const metadata = {
  title: {
    default: 'OmniFlow — Collaborative Workflow Ecosystem',
    template: '%s | OmniFlow', // e.g. "Login | OmniFlow" on auth pages
  },
  description:
    'OmniFlow is an autonomous real-time collaborative workflow ecosystem. ' +
    'AI-powered task generation, WebSocket live sync, and Kanban boards for modern engineering teams.',
  keywords: ['project management', 'kanban', 'AI', 'collaboration', 'real-time'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/*
       * inter.className applies the correct font-family CSS variable.
       * ThemeProvider reads localStorage and sets data-theme on <html>
       * to trigger the dark/light CSS variable swap.
       */}
      <body className={inter.className}>
        {/* ThemeProvider must wrap everything so dark mode applies everywhere */}
        <ThemeProvider>
          {children}
          {/* Toast notifications render above all content */}
          <Toast />
        </ThemeProvider>
      </body>
    </html>
  );
}
