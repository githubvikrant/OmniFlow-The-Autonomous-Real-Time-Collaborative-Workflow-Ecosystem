/**
 * src/lib/axios.js — Axios Instance with JWT Interceptors
 *
 * WHY A CUSTOM AXIOS INSTANCE (not plain fetch)?
 *
 * We could use the browser's built-in fetch() everywhere. But then:
 *   - We'd repeat the base URL in every component.
 *   - We'd repeat `Authorization: Bearer ${token}` in every request.
 *   - Handling 401 → refresh → retry would need to be copy-pasted everywhere.
 *   - Error normalization (extracting error.response.data.message) would repeat.
 *
 * One custom Axios instance solves all four problems in one place.
 *
 * ─── THE TWO INTERCEPTORS ─────────────────────────────────────────────────────
 *
 * REQUEST INTERCEPTOR (runs before every outgoing request):
 *   Gets the access token from memory → attaches it as the Authorization header.
 *   Controllers never need to know about tokens — the interceptor handles it.
 *
 * RESPONSE INTERCEPTOR (runs after every incoming response):
 *   Watches for 401 Unauthorized responses.
 *   When it sees one:
 *     1. Calls POST /auth/refresh-token (browser auto-sends the HttpOnly cookie)
 *     2. If the server issues a new access token → stores it → retries the
 *        original request (the one that got 401) with the new token.
 *     3. If the refresh fails (e.g., refresh token expired) → clears memory
 *        token → redirects to /login.
 *   This entire process is invisible to the user and to the components.
 *
 * ─── THE isRefreshing FLAG ────────────────────────────────────────────────────
 *
 * Problem: what if 5 API calls fail with 401 simultaneously?
 * Without a flag, we'd fire 5 refresh requests at once.
 * Only the first should call the refresh endpoint.
 * The other 4 should wait for the first one to complete, then retry.
 *
 * Solution:
 *   - isRefreshing = true → "a refresh is already in progress"
 *   - failedQueue = array of {resolve, reject} pairs for waiting requests
 *   - When the refresh succeeds → processQueue(null, newToken) resolves all 4
 *   - When the refresh fails → processQueue(error) rejects all 4
 *
 * This pattern prevents "thundering herd" refresh requests.
 */

import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth';

// ─── Create the instance ──────────────────────────────────────────────────────

const api = axios.create({
  // Reads NEXT_PUBLIC_API_URL from .env.local
  baseURL: process.env.NEXT_PUBLIC_API_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  // IMPORTANT: send cookies (the refresh token HttpOnly cookie) with every request.
  // Without this, POST /auth/refresh-token won't receive the cookie.
  withCredentials: true,

  // 30-second timeout — allows enough time for OpenAI/Gemini to respond
  timeout: 30000,
});

// ─── State for refresh throttling ────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];

/**
 * Process all queued requests after a refresh attempt.
 * @param {Error|null} error - If refresh failed, the error. If succeeded, null.
 * @param {string|null} token - The new access token if refresh succeeded.
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    // Get the current access token from memory (set on login/register/refresh)
    const token = getAccessToken();

    if (token) {
      // Attach to every outgoing request as a Bearer token
      // The backend's protect middleware reads this header
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Request setup itself failed (e.g., invalid URL) — pass through
    return Promise.reject(error);
  }
);

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────

api.interceptors.response.use(
  // Happy path: the response is 2xx — just return it
  (response) => response,

  // Error path: catch any non-2xx response
  async (error) => {
    // originalRequest: the config of the request that failed
    const originalRequest = error.config;

    // We only care about 401 errors that we haven't already tried to refresh for.
    // _retry flag prevents infinite loops: if the retry itself gets a 401, stop.
    const is401 = error.response?.status === 401;
    const isNotRetry = !originalRequest._retry;
    // Skip refresh attempts if this IS the refresh-token request (avoid infinite loop)
    const isNotRefreshRoute = !originalRequest.url.includes('/auth/refresh-token');

    if (is401 && isNotRetry && isNotRefreshRoute) {
      // Mark this request as "already tried to refresh"
      originalRequest._retry = true;

      if (isRefreshing) {
        // A refresh is already in progress — queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          // Refresh succeeded — attach new token and retry
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      // Start the refresh process
      isRefreshing = true;

      try {
        // Call the refresh endpoint — browser auto-sends the HttpOnly cookie
        // withCredentials: true (set on the instance above) makes this work
        const response = await api.post('/auth/refresh-token');
        const newToken = response.data.accessToken;

        // Store the new token in memory
        setAccessToken(newToken);

        // Update the Authorization header for the original failed request
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Unblock all queued requests with the new token
        processQueue(null, newToken);

        // Retry the original request
        return api(originalRequest);

      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired after 7 days)
        // Clear the stale access token from memory
        clearAccessToken();

        // Reject all queued requests
        processQueue(refreshError, null);

        // Redirect to login — the user needs to authenticate again
        // Check if we're in the browser (not during Next.js SSR)
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired';
        }

        return Promise.reject(refreshError);

      } finally {
        // Always reset the refreshing flag when done (success or failure)
        isRefreshing = false;
      }
    }

    // For all other errors (403, 404, 422, 500, etc.) — pass through as-is.
    // Components can then do:
    //   catch (err) { setError(err.response?.data?.message || 'Something went wrong') }
    return Promise.reject(error);
  }
);

export default api;
