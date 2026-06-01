/**
 * socketStore.js — Zustand Store for WebSocket State & Presence
 *
 * WHAT THIS STORE MANAGES:
 *   - `isConnected`: Whether the WebSocket connection is live
 *   - `presence`: Array of users currently viewing the same board
 *   - `connect(boardId)`: Opens connection, joins the board room, registers event listeners
 *   - `disconnect()`: Leaves the board room, removes listeners, closes connection
 *
 * HOW IT INTEGRATES WITH boardStore:
 *   When a real-time event arrives (e.g., 'task:moved' from another user),
 *   socketStore calls the appropriate boardStore action:
 *     - task:created  → boardStore.addTaskLocally(task)
 *     - task:updated  → boardStore.updateTaskLocally(taskId, task)
 *     - task:moved    → boardStore.moveTask(taskId, column, order) — reuses the same optimistic logic
 *     - task:deleted  → boardStore.deleteTaskLocally(taskId)
 *
 *   WHY NOT MERGE SOCKET LOGIC INTO boardStore?
 *   Separation of concerns:
 *     - boardStore handles the DATA (tasks, boards, loading states)
 *     - socketStore handles the TRANSPORT (connection, events, presence)
 *   If we later swap Socket.IO for Server-Sent Events, we only change socketStore.
 *   boardStore stays unchanged.
 *
 * EVENT LISTENER LIFECYCLE:
 *   connect() registers listeners: socket.on('task:moved', handler)
 *   disconnect() removes them: socket.off('task:moved', handler)
 *
 *   WHY STORE HANDLERS IN A REF (namedHandlers)?
 *   socket.off() requires the EXACT same function reference that was passed to on().
 *   If we use inline arrow functions: socket.off('task:moved', () => {}) → never removes!
 *   We store named references so disconnect() can call socket.off(event, ref).
 *
 * X-SOCKET-ID HEADER:
 *   When connected, we expose socket.id via the `socketId` state field.
 *   The Axios interceptor reads this and adds an `X-Socket-ID` header to every
 *   outgoing request. The backend task controller uses this header to call
 *   socket.except(actorSocketId).emit(...) — so the user who made the HTTP
 *   request doesn't receive their own socket event back.
 *
 *   Without this: User A drags a card → API updates it → socket broadcasts
 *   to ALL users including A → A applies the socket event to a state they
 *   already updated optimistically → visual flicker or duplicate state update.
 */

import { create } from 'zustand';
import socket from '@/lib/socket';
import { useBoardStore } from '@/store/boardStore';

export const useSocketStore = create((set, get) => ({
  // ─── State ──────────────────────────────────────────────────────────────────
  isConnected: false,        // True when WebSocket handshake is complete
  socketId: null,            // socket.id — sent to server via X-Socket-ID header
  currentBoardId: null,      // The boardId this socket is currently joined to
  presence: [],              // [{userId, name, initials, color}] — users on this board

  // Named handler refs — stored so disconnect() can call socket.off(event, ref)
  // without creating new anonymous functions that won't match.
  _handlers: null,

  // ─── CONNECT ────────────────────────────────────────────────────────────────
  /**
   * connect(boardId)
   *
   * Call when the user enters a board page (BoardView.js useEffect on mount).
   *
   * Steps:
   * 1. Connect the socket (if not already connected)
   * 2. Register all event handlers
   * 3. Emit 'board:join' to tell the server which board's room we want
   *
   * @param {string} boardId - The MongoDB ObjectId of the board being viewed
   */
  connect: (boardId) => {
    if (!boardId) return;

    // ── 1. Connect (or reconnect) the socket ──────────────────────────────────
    if (!socket.connected) {
      socket.connect();
    }

    // ── 2. Build named handlers ───────────────────────────────────────────────
    // These are stored on the store so disconnect() can call socket.off() with
    // the exact same function references.
    const handlers = {
      // Connection lifecycle events
      onConnect: () => {
        console.log('[Socket] ✅ Connected:', socket.id);
        set({ isConnected: true, socketId: socket.id });

        // Join the board room AFTER connection is confirmed
        // (emitting before connect is a no-op)
        socket.emit('board:join', { boardId });
      },

      onDisconnect: (reason) => {
        console.log('[Socket] ❌ Disconnected:', reason);
        set({ isConnected: false, socketId: null, presence: [] });
      },

      onConnectError: (error) => {
        console.error('[Socket] Connection error:', error.message);
        set({ isConnected: false });
      },

      // ── Presence ─────────────────────────────────────────────────────────
      // Server emits this whenever someone joins or leaves the board room.
      onPresenceUpdate: ({ users }) => {
        set({ presence: users });
      },

      // ── Task Events ───────────────────────────────────────────────────────
      // These handlers update the local Zustand boardStore when another user
      // makes a change. The acting user is excluded by the backend's
      // socket.except(actorSocketId).emit() call — so they never receive
      // their own events.

      onTaskCreated: ({ task }) => {
        // Another user created a task on this board — add it locally
        useBoardStore.getState().addTaskLocally(task);
        console.log('[Socket] task:created received for task:', task._id);
      },

      onTaskUpdated: ({ task }) => {
        // Another user edited a task — update it in the local store
        const taskId = task._id || task.id;
        useBoardStore.getState().updateTaskLocally(taskId, task);
        console.log('[Socket] task:updated received for task:', taskId);
      },

      onTaskMoved: ({ taskId, targetColumn, newOrder }) => {
        // Another user dragged a card — apply the same move locally.
        // We call moveTask() which runs the optimistic update logic.
        // But wait — moveTask() also calls the API, which we DON'T want here
        // (the API was already called by the user who did the drag).
        //
        // Solution: We use a direct local state update instead of moveTask().
        // boardStore exposes updateTaskLocally() which we use with the new
        // column and order fields.
        const store = useBoardStore.getState();
        store.updateTaskLocally(taskId, { column: targetColumn, order: newOrder });
        console.log('[Socket] task:moved received:', taskId, '→', targetColumn, `(order: ${newOrder})`);
      },

      onTaskDeleted: ({ taskId }) => {
        // Another user deleted a task — remove it from the local store
        useBoardStore.getState().deleteTaskLocally(taskId);
        console.log('[Socket] task:deleted received for task:', taskId);
      },

      onTasksBulkAdded: ({ tasks }) => {
        // Another user (or an AI action) bulk added tasks
        useBoardStore.getState().addTasksLocally(tasks);
        console.log(`[Socket] tasks:bulk-added received for ${tasks.length} tasks`);
      },
    };

    // ── 3. Register event listeners ───────────────────────────────────────────
    socket.on('connect', handlers.onConnect);
    socket.on('disconnect', handlers.onDisconnect);
    socket.on('connect_error', handlers.onConnectError);
    socket.on('presence:update', handlers.onPresenceUpdate);
    socket.on('task:created', handlers.onTaskCreated);
    socket.on('task:updated', handlers.onTaskUpdated);
    socket.on('task:moved', handlers.onTaskMoved);
    socket.on('task:deleted', handlers.onTaskDeleted);
    socket.on('tasks:bulk-added', handlers.onTasksBulkAdded);

    // If already connected (e.g., navigating between boards), join room immediately
    if (socket.connected) {
      set({ isConnected: true, socketId: socket.id });
      socket.emit('board:join', { boardId });
    }

    // Store handler refs and current board for cleanup
    set({ currentBoardId: boardId, _handlers: handlers });
  },

  // ─── DISCONNECT ─────────────────────────────────────────────────────────────
  /**
   * disconnect()
   *
   * Call when the user leaves a board page (BoardView.js useEffect cleanup / unmount).
   *
   * Steps:
   * 1. Emit 'board:leave' so the server removes us from the room & presence
   * 2. Remove all event listeners using stored handler refs
   * 3. Disconnect the socket
   * 4. Reset local state
   */
  disconnect: () => {
    const { currentBoardId, _handlers } = get();

    // Tell the server we're leaving the room
    if (currentBoardId && socket.connected) {
      socket.emit('board:leave', { boardId: currentBoardId });
    }

    // Remove all registered event listeners using stored refs
    if (_handlers) {
      socket.off('connect', _handlers.onConnect);
      socket.off('disconnect', _handlers.onDisconnect);
      socket.off('connect_error', _handlers.onConnectError);
      socket.off('presence:update', _handlers.onPresenceUpdate);
      socket.off('task:created', _handlers.onTaskCreated);
      socket.off('task:updated', _handlers.onTaskUpdated);
      socket.off('task:moved', _handlers.onTaskMoved);
      socket.off('task:deleted', _handlers.onTaskDeleted);
      socket.off('tasks:bulk-added', _handlers.onTasksBulkAdded);
    }

    // Disconnect the socket
    socket.disconnect();

    // Reset state
    set({
      isConnected: false,
      socketId: null,
      currentBoardId: null,
      presence: [],
      _handlers: null,
    });
  },
}));
