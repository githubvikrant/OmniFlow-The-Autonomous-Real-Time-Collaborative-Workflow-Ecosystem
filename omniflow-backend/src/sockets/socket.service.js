/**
 * socket.service.js — Socket.IO Event Emitter Helpers
 *
 * WHY THIS FILE EXISTS:
 *   Task controllers need to broadcast real-time events to every user
 *   currently viewing the same board — but controllers shouldn't know
 *   anything about Socket.IO internals (rooms, namespaces, io instance).
 *
 *   This service is the thin bridge:
 *     Controller calls → socketService.emitTaskMoved(boardId, task)
 *     socketService calls → io.to(`board:${boardId}`).emit(...)
 *
 * DECOUPLING BENEFIT:
 *   If we later swap Socket.IO for a different transport (e.g., SSE, Pusher),
 *   we only change this one file — not every controller.
 *
 * HOW io IS SHARED:
 *   The Socket.IO server instance (io) is created once in server.js and
 *   injected here via setIO(). This avoids circular imports — socket.server.js
 *   imports from socket.service.js, but socket.service.js never imports
 *   from socket.server.js.
 *
 * ROOM NAMING CONVENTION:
 *   Every board gets a private room named `board:<boardId>`.
 *   When a client joins a board page, it emits 'board:join' with the boardId.
 *   The socket.server.js handler calls socket.join(`board:${boardId}`).
 *   All emit calls in this file target that room — only board members receive them.
 *
 * EVENTS EMITTED (Day 8 — full list):
 *   task:created    → A new task was added by someone
 *   task:updated    → A task's fields were edited
 *   task:moved      → A task was dragged to a new column/position
 *   task:deleted    → A task was soft-deleted
 *   presence:update → The list of users currently on the board changed
 */

let _io = null; // The Socket.IO server instance — set once on startup

/**
 * Called by server.js to inject the io instance after Socket.IO is created.
 * This avoids circular import issues between socket.server.js and socket.service.js.
 *
 * @param {import('socket.io').Server} io
 */
export function setIO(io) {
  _io = io;
}

/**
 * Internal helper — returns the io instance.
 * Guards against usage before setIO() is called.
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!_io) {
    // This happens if a controller emits before the server is initialized.
    // In practice, this never occurs because server.js sets io before HTTP requests.
    console.warn('[socketService] io not initialized yet — skipping emit');
    return null;
  }
  return _io;
}

// ─── TASK EVENTS ──────────────────────────────────────────────────────────────

/**
 * Broadcast to all users in the board room that a new task was created.
 * The receiving clients call boardStore.addTaskLocally(task) to update their UI.
 *
 * @param {string} boardId - The board's MongoDB ObjectId (used as room identifier)
 * @param {Object} task    - The full task document returned from the service
 * @param {string} actorSocketId - The socket ID of the user who performed the action.
 *                                 We broadcast (not emit) so the actor doesn't receive
 *                                 their own event — they already updated their UI optimistically.
 */
export function emitTaskCreated(boardId, task, actorSocketId = null) {
  const io = getIO();
  if (!io) return;

  const room = `board:${boardId}`;

  if (actorSocketId) {
    // broadcast.to() sends to everyone in the room EXCEPT the socket with actorSocketId
    io.to(room).except(actorSocketId).emit('task:created', { task });
  } else {
    io.to(room).emit('task:created', { task });
  }
}

/**
 * Broadcast that a task's fields were updated (title, description, priority, etc.).
 * Clients call boardStore.updateTaskLocally(task._id, task) on receipt.
 *
 * @param {string} boardId
 * @param {Object} task - The full updated task document
 * @param {string} actorSocketId
 */
export function emitTaskUpdated(boardId, task, actorSocketId = null) {
  const io = getIO();
  if (!io) return;

  const room = `board:${boardId}`;

  if (actorSocketId) {
    io.to(room).except(actorSocketId).emit('task:updated', { task });
  } else {
    io.to(room).emit('task:updated', { task });
  }
}

/**
 * Broadcast that a task was dragged to a new column/position.
 * This is the most time-sensitive event — it fires on every drag-and-drop.
 * Clients call boardStore.moveTask() on receipt, which updates the Zustand store.
 *
 * Payload shape is intentionally minimal (just IDs + new position) rather than
 * the full task document, because:
 *   1. Smaller payload = less bandwidth
 *   2. The client already has the full task data; it only needs to know where it moved
 *
 * @param {string} boardId
 * @param {string} taskId        - The moved task's ID
 * @param {string} targetColumn  - The column it was moved into
 * @param {number} newOrder      - Its new order position in that column
 * @param {string} actorSocketId
 */
export function emitTaskMoved(boardId, taskId, targetColumn, newOrder, actorSocketId = null) {
  const io = getIO();
  if (!io) return;

  const room = `board:${boardId}`;
  const payload = { taskId, targetColumn, newOrder };

  if (actorSocketId) {
    io.to(room).except(actorSocketId).emit('task:moved', payload);
  } else {
    io.to(room).emit('task:moved', payload);
  }
}

/**
 * Broadcast that a task was soft-deleted.
 * Clients call boardStore.deleteTaskLocally(taskId) on receipt.
 *
 * @param {string} boardId
 * @param {string} taskId
 * @param {string} actorSocketId
 */
export function emitTaskDeleted(boardId, taskId, actorSocketId = null) {
  const io = getIO();
  if (!io) return;

  const room = `board:${boardId}`;

  if (actorSocketId) {
    io.to(room).except(actorSocketId).emit('task:deleted', { taskId });
  } else {
    io.to(room).emit('task:deleted', { taskId });
  }
}

// ─── PRESENCE EVENTS ──────────────────────────────────────────────────────────

/**
 * Broadcast the current list of users on the board to everyone in the room.
 * Called whenever someone joins or leaves.
 *
 * @param {string} boardId
 * @param {Array}  users - Array of { userId, name, initials, color } presence objects
 */
export function emitPresenceUpdate(boardId, users) {
  const io = getIO();
  if (!io) return;

  io.to(`board:${boardId}`).emit('presence:update', { users });
}
