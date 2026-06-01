/**
 * src/lib/socket.js — Socket.IO Client Singleton
 *
 * WHY A SINGLETON?
 *   Socket.IO connections are persistent (WebSocket, not HTTP).
 *   We must NOT create a new socket on every component render — that would
 *   flood the server with connections. One module-level socket instance
 *   is created once and reused across the entire app.
 *
 * HOW IT AUTHENTICATES:
 *   The backend's Socket.IO auth middleware reads socket.handshake.auth.token.
 *   We pass the JWT access token here — the same token the Axios instance
 *   attaches to HTTP requests as `Authorization: Bearer <token>`.
 *   This means ONE token handles both REST and WebSocket authentication.
 *
 * WHY autoConnect: false?
 *   We don't want the socket to connect the moment the module is imported.
 *   The connection should only happen when the user navigates to a board page.
 *   socketStore.connect(boardId) calls socket.connect() explicitly.
 *
 *   Without this: the socket would try to connect on app load, before the
 *   auth token is available (it's set after the refresh-token API call).
 *   Result: authentication fails, socket disconnects, user gets an error.
 *
 * HOW THE TOKEN IS READ AT CONNECT TIME:
 *   socket.auth is a function (not an object) — Socket.IO calls it right before
 *   each connection attempt. This means we always get the CURRENT token from
 *   memory, even after a token refresh. If we used `auth: { token: getAccessToken() }`
 *   (static), the token would be captured at import time (null on first load).
 *
 * RECONNECTION:
 *   Socket.IO automatically reconnects if the connection drops (default: up to
 *   Infinity retries with exponential backoff). Our auth function ensures each
 *   reconnect uses the latest (possibly refreshed) token.
 */

import { io } from 'socket.io-client';
import { getAccessToken } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

/**
 * The singleton Socket.IO client instance.
 *
 * Configuration:
 * - autoConnect: false  → connect only when we explicitly call socket.connect()
 * - auth: (cb) => {}    → function form ensures fresh token on every connect attempt
 * - reconnection: true  → auto-reconnect on network drops (default: true)
 */
const socket = io(SOCKET_URL, {
  // Don't connect immediately — socketStore.connect() will call socket.connect()
  autoConnect: false,

  // Function form of auth — called by Socket.IO right before connecting.
  // getAccessToken() returns the current in-memory JWT access token.
  // On the first page load after a refresh, this is set by the root layout's
  // token refresh call before any navigation occurs.
  auth: (cb) => {
    cb({ token: getAccessToken() });
  },

  // Use WebSocket transport first (fastest), fall back to HTTP long-polling
  // if WebSocket is blocked by a corporate firewall or proxy.
  transports: ['websocket', 'polling'],

  // Wait up to 10 seconds for the server to acknowledge the connection
  timeout: 10000,

  // Reconnection settings — allow automatic reconnect on network issues
  reconnection: true,
  reconnectionAttempts: 10,       // Max 10 attempts before giving up
  reconnectionDelay: 1000,        // Wait 1s before first retry
  reconnectionDelayMax: 5000,     // Cap at 5s between retries
});

export default socket;
