import { create } from 'zustand';

/**
 * Global Authentication Store
 * 
 * Manages the current user profile state. 
 * Note: The access token is deliberately NOT stored here. It lives in 
 * `src/lib/auth.js` to ensure it is XSS-safe and doesn't persist in React DevTools.
 */
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // initial state before we check /api/v1/auth/me

  // Actions
  login: (userData) => set({ 
    user: userData, 
    isAuthenticated: true, 
    isLoading: false 
  }),

  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    isLoading: false 
  }),

  setLoading: (status) => set({ isLoading: status }),
}));
