/**
 * TaskDetailDrawer.js — Slide-in panel for creating and editing tasks
 *
 * DUAL MODE OPERATION:
 * This component handles TWO different scenarios in one:
 *
 *   CREATE MODE (task prop is null):
 *     - Triggered by: "+ Add Task" button in the column footer
 *     - OR: "+ Add Task" button in the board header
 *     - Shows an empty form
 *     - `targetColumn` pre-selects which column the task will be created in
 *     - Sends: POST /tasks
 *
 *   EDIT MODE (task prop is an object):
 *     - Triggered by: clicking anywhere on a task card body
 *     - Shows the task's existing title, description, priority
 *     - The column selector is DISABLED in edit mode (to change columns, drag)
 *     - Sends: PATCH /tasks/:id
 *
 * STATE MANAGEMENT PATTERN:
 *   Local state (useState) handles the form fields — title, description,
 *   priority, column. This is the right choice because:
 *   - The form state is temporary (doesn't need to persist across navigation)
 *   - It's isolated to this component (no other component reads form state)
 *   - If the user cancels, the global Zustand store is untouched
 *
 *   After a SUCCESSFUL save, we call `fetchBoardData()` from Zustand to
 *   refresh the full board state from the server. This ensures the UI
 *   shows the latest data (including server-generated fields like `_id`).
 *
 * useEffect SYNC PATTERN:
 *   The form fields are synced from props via useEffect.
 *   Why? The drawer stays mounted (we removed the `if (!isOpen) return null`
 *   pattern). When a different task is clicked or the drawer reopens,
 *   we need to reset the form to the new task's data.
 *   The `[isOpen, task]` dependency array ensures this happens at the
 *   right time — specifically when the drawer transitions to open state.
 */
'use client';

import { useState, useEffect } from 'react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import api from '@/lib/axios';
import { useBoardStore } from '@/store/boardStore';
import { useToastStore } from '@/store/toastStore';

export default function TaskDetailDrawer({ isOpen, onClose, task, targetColumn }) {
  const { activeBoard } = useBoardStore();
  const { addToast } = useToastStore();

  // `isCreateMode` is true when no task is passed (we're creating, not editing)
  const isCreateMode = !task;

  // Form field state — local to this component, synced from props in useEffect
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [column, setColumn] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Sync form fields from the task prop when the drawer opens or the task changes.
   *
   * Why watch `isOpen` AND `task`?
   * - When the drawer CLOSES and REOPENS with a NEW task, `isOpen` changes.
   * - When a different task is clicked while drawer is already open, `task` changes.
   * Both cases need a form reset.
   */
  useEffect(() => {
    if (isOpen) {
      if (isCreateMode) {
        // Reset to blank form, pre-select the target column
        setTitle('');
        setDescription('');
        setPriority('medium');
        setColumn(targetColumn || activeBoard?.columns?.[0] || 'To Do');
      } else {
        // Populate form with existing task data
        setTitle(task.title || '');
        setDescription(task.description || '');
        setPriority(task.priority || 'medium');
        setColumn(task.column);
      }
    }
  }, [isOpen, task, isCreateMode, targetColumn, activeBoard]);

  /**
   * handleSave — validates and submits the form.
   *
   * Steps:
   * 1. Client-side validation (title required)
   * 2. Set loading state (disables buttons, shows "Saving...")
   * 3. POST (create) or PATCH (update) the task via API
   * 4. On success: show toast, refresh board data, close drawer
   * 5. On error: show toast with the server's error message
   */
  const handleSave = async () => {
    // Validate required fields before sending to server
    if (!title.trim()) {
      addToast('Task title cannot be empty', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (isCreateMode) {
        // CREATE — POST /tasks with board ID, column, and form values
        const res = await api.post('/tasks', {
          board: activeBoard._id,
          title: title.trim(),
          description: description.trim(),
          priority,
          column,
        });
        
        // Instantly add to local UI without fetching the whole board again
        useBoardStore.getState().addTaskLocally(res.data.data.task);
        addToast(`"${title.trim()}" created successfully`, 'success');
      } else {
        // EDIT — PATCH /tasks/:id with only the updatable fields
        const res = await api.patch(`/tasks/${task._id || task.id}`, {
          title: title.trim(),
          description: description.trim(),
          priority,
        });
        
        // Instantly update the local UI card without fetching the whole board again
        useBoardStore.getState().updateTaskLocally(task._id || task.id, res.data.data.task);
        addToast('Task updated successfully', 'success');
      }

      // Close the drawer immediately after the API succeeds and local state updates
      onClose();
    } catch (error) {
      // Show the server's error message, or a generic fallback
      addToast(
        error.response?.data?.message || 'Failed to save task. Please try again.',
        'error'
      );
    } finally {
      // Always re-enable the form buttons, even if the API call failed
      setIsSaving(false);
    }
  };

  /**
   * handleDelete — permanently deletes a task (edit mode only)
   */
  const handleDelete = async () => {
    if (!task) return;
    // Simple confirm dialog — Day 8+ will use a proper confirmation modal
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

    setIsSaving(true);
    try {
      await api.delete(`/tasks/${task._id || task.id}`);
      
      // Remove instantly from UI
      useBoardStore.getState().deleteTaskLocally(task._id || task.id);
      addToast('Task deleted', 'success');
      
      onClose();
    } catch (error) {
      addToast(
        error.response?.data?.message || 'Failed to delete task',
        'error'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isCreateMode ? '+ New Task' : 'Task Details'}
    >
      <div className="task-drawer-form">

        {/* ─── Title ───────────────────────────────────────────────────────── */}
        <div className="form-field">
          <label className="form-field__label" htmlFor="task-title">
            Title <span aria-hidden="true" className="required-star">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            className="form-field__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            // autoFocus is handled by Drawer's focus trap logic
            maxLength={200}
          />
        </div>

        {/* ─── Description ─────────────────────────────────────────────────── */}
        <div className="form-field">
          <label className="form-field__label" htmlFor="task-description">
            Description
          </label>
          <textarea
            id="task-description"
            className="form-field__input textarea-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details, acceptance criteria, links..."
            rows={6}
          />
        </div>

        {/* ─── Priority + Column (side by side) ────────────────────────────── */}
        <div className="drawer-sidebar-layout">
          <div className="form-field">
            <label className="form-field__label" htmlFor="task-priority">
              Priority
            </label>
            <select
              id="task-priority"
              className={`form-field__input priority-select priority-select--${priority}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="critical">🔴 Critical</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-field__label" htmlFor="task-column">
              Column
            </label>
            <select
              id="task-column"
              className="form-field__input"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              /*
               * Column is only changeable during CREATION.
               * In edit mode, column changes happen via drag-and-drop on
               * the Kanban board — not in this form. This prevents
               * confusing double-update patterns.
               */
              disabled={!isCreateMode}
              title={!isCreateMode ? 'Drag the card to change column' : undefined}
            >
              {activeBoard?.columns.map((col) => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            {!isCreateMode && (
              <p className="form-field__hint">Drag the card to change column</p>
            )}
          </div>
        </div>

        {/* ─── Footer Actions ───────────────────────────────────────────────── */}
        <div className="drawer-footer">
          {/* Delete button — only shown in edit mode */}
          {!isCreateMode && (
            <button
              type="button"
              className="btn-danger-text"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete task
            </button>
          )}

          {/* Spacer to push Cancel + Save to the right */}
          <div style={{ flex: 1 }} />

          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
            {isSaving ? 'Saving...' : isCreateMode ? 'Create Task' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
