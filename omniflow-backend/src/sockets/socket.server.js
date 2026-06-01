/**
 * socket.server.js — Socket.IO Server Initialization & Connection Handling
 *
 * WHAT THIS FILE DOES:
 *   1. Creates and configures the Socket.IO server (CORS, transports)
 *   2. Authenticates every incoming WebSocket connection using the JWT
 *      passed in the socket handshake — the same token the REST API uses
 *   3. Manages board "rooms" — each board is an isolated Socket.IO room
 *      named `board:<boardId>` so events only reach the right users
 *   4. Tracks "presence" — a per-board Map of connected users, so the
 *      UI can show avatars of who else is on the board
 *   5. Injects the io instance into socket.service.js so HTTP controllers
 *      can emit real-time events without importing Socket.IO themselves
 *
 * WHY SOCKET.IO (not raw WebSockets)?
 *   Raw ws: requires hand-rolling reconnection, heartbeats, and rooms.
 *   Socket.IO provides:
 *     - Automatic reconnection on disconnect
 *     - Named rooms (board:${id}) for scoped broadcasting
 *     - Middleware support (for our JWT auth hook)
 *     - Graceful fallback to HTTP long-polling for restricted networks
 *
 * AUTHENTICATION STRATEGY:
 *   Standard HTTP routes use the Authorization: Bearer <token> header.
 *   WebSocket handshakes use socket.handshake.auth.token instead.
 *   Both use the same verifyToken() helper and the same JWT_SECRET.
 *   If the token is invalid, the socket is immediately disconnected.
 *
 * PRESENCE MAP:
 *   We keep an in-memory Map for presence: boardId → Set of user objects.
 *   This is intentionally simple for Day 8 (not Redis-backed).
 *   Day 10 will revisit: if we run multiple Node.js instances, presence
 *   would need Redis Pub/Sub to share state across instances.
 *   For a single-server portfolio project, in-memory is correct and fast.
 *
 * @param {import('http').Server} httpServer - The raw Node.js http.Server
 * @returns {import('socket.io').Server} The configured Socket.IO server
 */

import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import { setIO, emitPresenceUpdate } from './socket.service.js';
import config from '../config/index.js';

// ─── Presence Store ───────────────────────────────────────────────────────────
// Map<boardId, Map<socketId, presenceObject>>
// We use socketId (not userId) as the key because one user can open multiple tabs.
// Each tab's socket is tracked independently.
//
// presenceObject shape: { userId, name, initials, color }
const boardPresence = new Map();

/**
 * Helper — generate a consistent color for a user based on their name.
 * This ensures User A always gets the same color across all sessions.
 * Uses a simple hash of the name string to pick from a curated palette.
 *
 * @param {string} name
 * @returns {string} A hex color string
 */
function getPresenceColor(name) {
  const palette = [
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Helper — get initials from a full name.
 * "Vikrant Chauhan" → "VC", "Alice" → "AL"
 * @param {string} name
 * @returns {string} 1-2 uppercase letters
 */
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return name.substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Helper — get the current presence list for a board as a plain array.
 * Used when broadcasting `presence:update` events.
 *
 * @param {string} boardId
 * @returns {Array} Array of presence objects (one per connected socket/tab)
 *                  deduplicated by userId so the same user's multiple tabs
 *                  only appear once in the avatar bar.
 */
function getPresenceList(boardId) {
  const socketMap = boardPresence.get(boardId);
  if (!socketMap) return [];

  // Deduplicate by userId — if same user has 2 tabs open, show them once
  const seen = new Set();
  const users = [];
  for (const presence of socketMap.values()) {
    if (!seen.has(presence.userId)) {
      seen.add(presence.userId);
      users.push(presence);
    }
  }
  return users;
}

// ─── Main Initializer ─────────────────────────────────────────────────────────

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    // CORS — allow our Next.js frontend to connect
    cors: {
      origin: config.frontend.url,
      methods: ['GET', 'POST'],
      credentials: true,
    },

    // Connection state recovery — if the client briefly disconnects (e.g.,
    // mobile network switch), Socket.IO will replay any missed events for up
    // to 2 minutes. This prevents users from seeing a stale board after
    // a brief network hiccup.
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    },
  });

  // ─── Inject io into socket.service.js ──────────────────────────────────────
  // socket.service.js exports emit helpers that controllers call.
  // It needs the io instance but can't import it (circular dependency risk).
  // We pass it in via setIO() — a simple dependency injection pattern.
  setIO(io);

  // ─── Authentication Middleware ──────────────────────────────────────────────
  // Runs for EVERY incoming WebSocket connection BEFORE the 'connection' event.
  // If authentication fails, the socket is disconnected immediately.
  //
  // The client passes the JWT in socket.handshake.auth.token:
  //   const socket = io('http://localhost:5000', { auth: { token: accessToken } })
  //
  // This is the WebSocket equivalent of the HTTP Authorization: Bearer header.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify the JWT — same verifyToken() the HTTP protect middleware uses
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch {
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      // Fetch user from DB — confirm they still exist and are active
      const user = await User.findById(decoded.id).select('name email avatar isActive');
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: User not found or deactivated'));
      }

      // Attach user to the socket for use in event handlers
      socket.user = {
        userId: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        initials: getInitials(user.name),
        color: getPresenceColor(user.name),
      };

      next(); // Authentication passed — allow connection
    } catch (error) {
      console.error('[Socket Auth Error]', error.message);
      next(new Error('Internal authentication error'));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, name } = socket.user;
    console.log(`[Socket] ✅ Connected: ${name} (${socket.id})`);

    // ── board:join ────────────────────────────────────────────────────────────
    // Client emits this when they navigate to a board page.
    // We add them to the Socket.IO room AND the presence map.
    //
    // Payload: { boardId: string }
    socket.on('board:join', ({ boardId }) => {
      if (!boardId) return;

      // Join the Socket.IO room — all future emits to `board:${boardId}` reach this socket
      socket.join(`board:${boardId}`);

      // Track current board on socket object — needed when the client disconnects
      // without explicitly calling board:leave (e.g., browser tab closed)
      socket.currentBoardId = boardId;

      // Add to presence map
      if (!boardPresence.has(boardId)) {
        boardPresence.set(boardId, new Map());
      }
      boardPresence.get(boardId).set(socket.id, socket.user);

      // Broadcast updated presence to everyone in the room (including the new joiner)
      emitPresenceUpdate(boardId, getPresenceList(boardId));

      console.log(`[Socket] 👋 ${name} joined board:${boardId}`);
    });

    // ── board:leave ───────────────────────────────────────────────────────────
    // Client emits this when they navigate away from a board (cleanup).
    //
    // Payload: { boardId: string }
    socket.on('board:leave', ({ boardId }) => {
      if (!boardId) return;

      socket.leave(`board:${boardId}`);
      socket.currentBoardId = null;

      // Remove from presence map
      if (boardPresence.has(boardId)) {
        boardPresence.get(boardId).delete(socket.id);

        // Clean up the board entry if no one is left
        if (boardPresence.get(boardId).size === 0) {
          boardPresence.delete(boardId);
        }
      }

      // Broadcast updated presence list to remaining users
      emitPresenceUpdate(boardId, getPresenceList(boardId));

      console.log(`[Socket] 🚪 ${name} left board:${boardId}`);
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    // Fires automatically when the WebSocket connection closes —
    // browser tab closed, network dropout, page refresh, etc.
    // We clean up presence the same way as board:leave.
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] ❌ Disconnected: ${name} (${socket.id}) — reason: ${reason}`);

      // currentBoardId was set on board:join. If the user closed the tab
      // without navigating away, board:leave never fired — so we clean up here.
      const boardId = socket.currentBoardId;
      if (boardId && boardPresence.has(boardId)) {
        boardPresence.get(boardId).delete(socket.id);

        if (boardPresence.get(boardId).size === 0) {
          boardPresence.delete(boardId);
        }

        // Broadcast that this user left
        emitPresenceUpdate(boardId, getPresenceList(boardId));
      }
    });
  });

  console.log('[Socket] ✅ Socket.IO server initialized');
  return io;
}
