/**
 * src/app/page.js — Root Route (/)
 *
 * The root URL just redirects to /login.
 * After login, users are sent to /dashboard.
 *
 * On Day 6, this will check the Zustand auth store:
 *   - if authenticated → /dashboard
 *   - if not           → /login
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
