/**
 * boardStore.js — Central data store for the Kanban board
 *
 * WHAT THIS STORE MANAGES:
 *   - `activeBoard`: The board object currently being viewed (name, columns, etc.)
 *   - `tasks`: All tasks for the active board in a FLAT array
 *   - `isLoading`: True while the initial board data is being fetched
 *   - `error`: Error message if the board fails to load
 *   - `taskDrawer`: State for the Create/Edit task slide-in panel
 *
 * WHY FLAT TASKS ARRAY (not nested by column)?
 *   We store all tasks in one flat array instead of { "To Do": [...], "In Progress": [...] }.
 *   Reason: Drag-and-drop moves tasks between columns. With a flat array, we just update
 *   one task's `column` field — no complex object mutation. The UI groups tasks by column
 *   at render time using `.filter(t => t.column === col)`.
 *
 * OPTIMISTIC UI PATTERN (in moveTask):
 *   When a card is dragged:
 *   1. We INSTANTLY update the local state (zero latency, feels snappy)
 *   2. We fire the API call in the background
 *   3. If the API succeeds → great, we're done
 *   4. If the API fails → we roll back to `previousTasks` and show a toast
 *
 *   This is the same pattern Linear, Jira, and Notion use for drag-and-drop.
 *
 * DRAWER STATE (openTaskDrawer / closeTaskDrawer):
 *   Stored in Zustand (not local component state) so that ANY component
 *   can open the task drawer. Example: the "+ Add Task" button in a column
 *   opens the drawer in CREATE mode. The task card opens it in EDIT mode.
 *   Both update the same Zustand state — the drawer component just reads it.
 */

import { create } from 'zustand';
import api from '@/lib/axios';
import { useToastStore } from '@/store/toastStore';

export const useBoardStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  activeBoard: null, // The full board object from the API
  tasks: [],         // Flat array of all tasks for this board
  isLoading: true,   // True on first load (shows loading spinner)
  error: null,       // Error message if something goes wrong

  /**
   * Drawer state — controls the Create/Edit task panel visibility.
   * `task: null` means CREATE mode (empty form).
   * `task: {...}` means EDIT mode (pre-filled form).
   * `targetColumn: "To Do"` pre-selects a column in create mode.
   */
  taskDrawer: {
    isOpen: false,
    task: null,
    targetColumn: null,
  },

  // ─── Drawer Actions ────────────────────────────────────────────────────────
  /**
   * openTaskDrawer(task, targetColumn)
   * Opens the drawer. Called by:
   * - Task card click → passes the task object (EDIT mode)
   * - "+ Add Task" column button → passes null, "To Do" (CREATE mode)
   * - "+ Add Task" header button → passes null, null (CREATE mode, first column)
   */
  openTaskDrawer: (task = null, targetColumn = null) =>
    set({ taskDrawer: { isOpen: true, task, targetColumn } }),

  /** Closes the drawer and resets all drawer state */
  closeTaskDrawer: () =>
    set({ taskDrawer: { isOpen: false, task: null, targetColumn: null } }),

  // ─── Data Actions ─────────────────────────────────────────────────────────
  /**
   * fetchBoardData(boardId)
   * Loads the board and its tasks from the API in parallel.
   * Called on initial page load AND after creating/updating a task
   * to ensure the UI reflects the latest server state.
   *
   * Parallel fetch with Promise.all:
   *   Both requests start at the same time → total time = max(boardTime, tasksTime)
   *   vs sequential → total time = boardTime + tasksTime
   */
  fetchBoardData: async (boardId) => {
    // Only show the loading spinner if this is the first load
    // Prevents the entire board from flashing when refreshing after a task update
    const isFirstLoad = !get().activeBoard || get().activeBoard._id !== boardId;
    if (isFirstLoad) {
      set({ isLoading: true, error: null });
    } else {
      set({ error: null });
    }
    try {
      const [boardRes, tasksRes] = await Promise.all([
        api.get(`/boards/${boardId}`),        // GET /api/v1/boards/:id
        api.get(`/tasks?board=${boardId}`),   // GET /api/v1/tasks?board=:id
      ]);

      set({
        activeBoard: boardRes.data.data.board,
        // Sort by `order` field to ensure cards appear in the correct sequence
        tasks: tasksRes.data.data.tasks.sort((a, b) => a.order - b.order),
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || 'Failed to load board',
        isLoading: false,
      });
    }
  },

  /**
   * moveTask(taskId, newColumn, newOrder)
   *
   * THE OPTIMISTIC UPDATE PATTERN:
   *
   * Step 1 — Snapshot: Save the current tasks array for rollback.
   * Step 2 — Optimistic: Immediately update local state so the UI
   *           feels instant. The card appears in its new column instantly.
   * Step 3 — API: Fire the PATCH request in the background.
   *           The user doesn't wait for this — they've already seen the move.
   * Step 4a — If API succeeds: Nothing more to do. State is already updated.
   * Step 4b — If API fails: Restore the snapshot (card snaps back) + show toast.
   */
  moveTask: async (taskId, newColumn, newOrder) => {
    const { tasks } = get();

    // Step 1: Snapshot for rollback
    const previousTasks = [...tasks];

    // Step 2: Find the task being moved
    const taskIndex = tasks.findIndex(t => t.id === taskId || t._id === taskId);
    if (taskIndex === -1) return;

    const movedTask = { ...tasks[taskIndex] };

    // Remove the task from its current position
    const tasksWithoutMoved = tasks.filter((_, idx) => idx !== taskIndex);

    // Update the moved task with its new column and order
    movedTask.column = newColumn;
    movedTask.order = newOrder;

    // Shift the order of all tasks in the target column that are at or after
    // the new position. This prevents two tasks from having the same order value.
    const updatedOtherTasks = tasksWithoutMoved.map(t => {
      if (t.column === newColumn && t.order >= newOrder) {
        return { ...t, order: t.order + 1 };
      }
      return t;
    });

    // Add the moved task back to the flat array
    updatedOtherTasks.push(movedTask);

    // Apply the optimistic update immediately — UI re-renders now
    set({ tasks: updatedOtherTasks });

    // Step 3: Send the change to the server
    try {
      await api.post(`/tasks/${taskId}/move`, {
        targetColumn: newColumn,
        newOrder: newOrder,
      });
      // Success — server confirmed the move. Nothing to do.
    } catch (error) {
      // Step 4b: Roll back to previous state
      set({ tasks: previousTasks });

      // Show error toast — this is how the user knows the move failed
      useToastStore.getState().addToast(
        error.response?.data?.message || 'Failed to move task. Changes reverted.',
        'error'
      );
    }
  },

  /**
   * Local state updaters for immediate UI feedback.
   * Prevents needing to refetch the entire board after every small edit.
   */
  addTaskLocally: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
  },

  addTasksLocally: (newTasks) => {
    set((state) => ({ tasks: [...state.tasks, ...newTasks] }));
  },

  updateTaskLocally: (taskId, updates) => {
    set((state) => {
      const updatedTasks = state.tasks.map((t) => 
        (t.id === taskId || t._id === taskId) ? { ...t, ...updates } : t
      );
      
      // Also update the drawer's task if it's the one being edited
      let newTaskDrawer = state.taskDrawer;
      if (state.taskDrawer.task && (state.taskDrawer.task.id === taskId || state.taskDrawer.task._id === taskId)) {
        newTaskDrawer = {
          ...state.taskDrawer,
          task: { ...state.taskDrawer.task, ...updates },
        };
      }

      return {
        tasks: updatedTasks,
        taskDrawer: newTaskDrawer,
      };
    });
  },

  deleteTaskLocally: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId && t._id !== taskId)
    }));
  },

  /**
   * clearBoard()
   * Called when the user navigates away from the board page.
   * Resets all board state so the next board loads fresh without
   * showing stale data from the previous board.
   */
  clearBoard: () =>
    set({ activeBoard: null, tasks: [], isLoading: true, error: null }),
}));
