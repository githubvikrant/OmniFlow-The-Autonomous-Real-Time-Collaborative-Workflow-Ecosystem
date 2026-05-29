/**
 * src/lib/auth.js — Token Storage & Auth Helpers
 *
 * WHY MODULE-LEVEL VARIABLE (not localStorage, not sessionStorage)?
 *
 * Three common ways to store JWT access tokens in the browser:
 *
 * 1. localStorage
 *    ❌ XSS-vulnerable: any injected script can run localStorage.getItem('token')
 *
 * 2. sessionStorage
 *    ❌ Same XSS attack surface as localStorage
 *
 * 3. Memory (module-level variable) ← WE USE THIS
 *    ✅ XSS-safe: injected scripts can't enumerate other modules' variables
 *    ⚠ Cleared on page refresh — handled transparently by the refresh token flow
 *
 * WHAT HAPPENS ON PAGE REFRESH:
 *   - The access token in memory is gone.
 *   - But the refresh token is still in the HttpOnly cookie (set by the server,
 *     readable only by the server, invisible to all JavaScript including malicious).
 *   - The root layout (layout.js) calls POST /auth/refresh-token on mount.
 *   - Server reads the cookie, verifies it, issues a new access token.
 *   - setAccessToken() is called with the new token.
 *   - User sees nothing — they're still logged in.
 *   - If the refresh token is expired (7 days), the user is redirected to /login.
 *
 * This is Auth0's recommended pattern for SPAs:
 * https://auth0.com/docs/secure/security-guidance/data-security/token-storage
 */

// Module-level variable — not on window, not in storage
let _accessToken = null;

/**
 * Store the access token.
 * Called after: successful login, register, or OAuth callback.
 * @param {string} token
 */
export const setAccessToken = (token) => {
  _accessToken = token;
};

/**
 * Get the current access token.
 * Called by: Axios request interceptor on every outgoing API request.
 * @returns {string|null}
 */
export const getAccessToken = () => _accessToken;

/**
 * Clear the access token (on logout).
 * The HttpOnly refresh token cookie is cleared server-side via POST /auth/logout.
 */
export const clearAccessToken = () => {
  _accessToken = null;
};

/**
 * Quick check: do we have a token in memory?
 * Does NOT verify the token is still valid — the server does that.
 * @returns {boolean}
 */
export const isAuthenticated = () => _accessToken !== null;
