import { create } from 'zustand';
import api from '@/lib/axios';

/**
 * Global Board Store
 * 
 * Manages the current active board, its tasks, and handles optimistic
 * UI updates for drag-and-drop operations.
 */
export const useBoardStore = create((set, get) => ({
  activeBoard: null,
  tasks: [],
  isLoading: true,
  error: null,

  // Load a board and its tasks from the API
  fetchBoardData: async (boardId) => {
    set({ isLoading: true, error: null });
    try {
      // Parallel fetch for speed
      const [boardRes, tasksRes] = await Promise.all([
        api.get(`/boards/${boardId}`),
        api.get(`/tasks?board=${boardId}`)
      ]);
      
      set({ 
        activeBoard: boardRes.data.data.board,
        // Sort tasks by their 'order' field to ensure correct initial rendering
        tasks: tasksRes.data.data.tasks.sort((a, b) => a.order - b.order),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Failed to load board', 
        isLoading: false 
      });
    }
  },

  // Optimistic drag-and-drop handler
  moveTask: async (taskId, newColumn, newOrder, newIndexInColumn) => {
    const { tasks, activeBoard } = get();
    
    // 1. Take a snapshot of the current state for rollback
    const previousTasks = [...tasks];
    
    // 2. Optimistically update local state
    const taskIndex = tasks.findIndex(t => t.id === taskId || t._id === taskId);
    if (taskIndex === -1) return;
    
    const taskToMove = { ...tasks[taskIndex], column: newColumn };
    
    // Remove task from its old position
    const newTasks = tasks.filter((_, idx) => idx !== taskIndex);
    
    // Insert task at its new position among other tasks in that column
    // Since 'tasks' is a flat array, we just need to append it and then re-sort
    // Actually, setting its 'order' and 'column' is enough for the UI to re-render it correctly
    // if the UI groups and sorts by column and order.
    taskToMove.order = newOrder;
    
    // Shift the order of other tasks in the target column if necessary
    const updatedTasks = newTasks.map(t => {
      if (t.column === newColumn && t.order >= newOrder) {
        return { ...t, order: t.order + 1 };
      }
      return t;
    });
    
    updatedTasks.push(taskToMove);
    
    set({ tasks: updatedTasks });

    // 3. Fire API request
    try {
      await api.post(`/tasks/${taskId}/move`, {
        targetColumn: newColumn,
        newOrder: newOrder
      });
    } catch (error) {
      // 4. Rollback on failure
      console.error('Optimistic update failed, rolling back...', error);
      set({ tasks: previousTasks });
      // Here we could also trigger a toast notification system
    }
  },

  // Clear store when leaving the board page
  clearBoard: () => set({ activeBoard: null, tasks: [], isLoading: true, error: null }),
}));
