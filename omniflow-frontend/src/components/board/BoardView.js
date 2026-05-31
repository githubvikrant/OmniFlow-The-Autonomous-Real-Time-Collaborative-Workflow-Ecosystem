/**
 * BoardView.js — The main Kanban drag-and-drop orchestrator
 *
 * HOW THE DRAG-AND-DROP WORKS (two-phase system):
 *
 * Phase 1 — DRAG OVER (live preview):
 *   As the user drags a card, `onDragOver` fires continuously.
 *   We check: "Is the cursor hovering over a Column or another Task?"
 *   We optimistically update the `activeColumn` state so the UI
 *   shows the card visually moving to the correct column in real-time.
 *
 * Phase 2 — DRAG END (commit):
 *   When the user releases, `onDragEnd` fires once.
 *   We use the `over` information from dnd-kit to determine:
 *     a) Which column the card was dropped into
 *     b) The new order (position) within that column
 *   We then call `moveTask()` in the Zustand store which:
 *     1. Instantly updates local state (optimistic UI)
 *     2. Fires a background API call to persist the change
 *     3. Rolls back if the API fails + shows a toast error
 *
 * WHY TWO SENSORS?
 *   - PointerSensor: Mouse + touch. The `distance: 8` constraint means
 *     a user must drag 8px before we consider it a "drag" (not a click).
 *     This prevents the task click-to-open-drawer from conflicting with DnD.
 *   - KeyboardSensor: Accessibility. Users can drag with arrow keys.
 *
 * WHY DragOverlay?
 *   Without it, the dragged card disappears from its original position
 *   and just shows a ghost. The DragOverlay renders a floating "clone"
 *   of the card that follows the cursor smoothly.
 */
'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useState, useCallback } from 'react';
import Column from './Column';
import TaskCard from './TaskCard';
import { useBoardStore } from '@/store/boardStore';

/**
 * Custom collision detection strategy.
 *
 * Priority: try pointerWithin (detects the element directly under cursor) first.
 * Fallback: use rectIntersection (detects overlapping bounding boxes) for
 * cases where the pointer is on the empty space inside a column (below all tasks).
 *
 * This solves the most common bug: dropping on the empty area of a column
 * not being recognized as a valid drop target.
 */
function customCollisionDetection(args) {
  // First try to find a droppable directly under the pointer
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  // Fall back to rectangle intersection for empty column areas
  return rectIntersection(args);
}

export default function BoardView({ board }) {
  const tasks = useBoardStore((state) => state.tasks);
  const moveTask = useBoardStore((state) => state.moveTask);

  // activeTask: the task currently being dragged (for DragOverlay rendering)
  const [activeTask, setActiveTask] = useState(null);

  // Configure two input sensors for the DnD engine
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // User must drag 8px before it becomes a "drag" not a "click"
        // This allows the onClick on task cards to still fire for the drawer
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      // Uses arrow keys for keyboard-accessible drag-and-drop
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * onDragStart — fires once when the user starts dragging.
   * We store the task being dragged so DragOverlay can render it.
   */
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const task = tasks.find(t => (t.id || t._id) === active.id);
    setActiveTask(task);
  }, [tasks]);

  /**
   * onDragEnd — fires once when the user releases the dragged item.
   *
   * Logic:
   * 1. Clear the active task (hides the DragOverlay)
   * 2. If no valid drop target (`over` is null), do nothing — card snaps back
   * 3. Determine the TARGET COLUMN:
   *    - If dropped on a Column droppable → that column
   *    - If dropped on another TaskCard → that card's column
   * 4. Calculate the NEW ORDER (position index):
   *    - Dropped on empty column → append to end (length of column tasks)
   *    - Dropped on a specific card → insert at that card's position
   * 5. Only call moveTask if something actually changed
   */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    // Always clear the floating overlay card
    setActiveTask(null);

    // No valid drop target — user released in empty space
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the task being moved
    const draggedTask = tasks.find(t => (t.id || t._id) === activeId);
    if (!draggedTask) return;

    // ─── Determine Target Column ──────────────────────────────────────────────
    // dnd-kit gives us `over.data.current.type` which we set on each droppable.
    // Column droppables have `type: 'Column'`, TaskCard sortables have `type: 'Task'`
    const overIsColumn = over.data.current?.type === 'Column';
    const overTask = overIsColumn
      ? null
      : tasks.find(t => (t.id || t._id) === overId);

    const targetColumn = overIsColumn ? overId : (overTask?.column ?? draggedTask.column);

    // ─── Calculate New Order ──────────────────────────────────────────────────
    // Get all tasks in the target column, sorted by their current order
    const columnTasks = tasks
      .filter(t => t.column === targetColumn)
      .sort((a, b) => a.order - b.order);

    let newOrder;

    if (overIsColumn) {
      // Dropped on an empty column or the column's background area
      // Place at the end of whatever is in that column
      newOrder = columnTasks.length > 0
        ? columnTasks[columnTasks.length - 1].order + 1
        : 0;
    } else if (overTask) {
      // Dropped on top of a specific card
      // Insert at the hovered card's order position
      newOrder = overTask.order;
    } else {
      // Fallback: treat it as dropped at end of column
      newOrder = columnTasks.length;
    }

    // Skip the API call if nothing actually changed
    const taskId = draggedTask.id || draggedTask._id;
    if (draggedTask.column === targetColumn && draggedTask.order === newOrder) {
      return;
    }

    // Fire the optimistic update → background API call → rollback on failure
    moveTask(taskId, targetColumn, newOrder);
  }, [tasks, moveTask]);

  // If board data isn't loaded yet, render nothing
  if (!board || !board.columns) return null;

  return (
    <DndContext
      sensors={sensors}
      // Our custom strategy that correctly handles both cards and empty columns
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* The horizontal scrollable row of columns */}
      <div className="kanban-board">
        {board.columns.map(col => {
          // Pass only the tasks belonging to this column, sorted by order
          const colTasks = tasks
            .filter(t => t.column === col)
            .sort((a, b) => a.order - b.order);
          return <Column key={col} title={col} tasks={colTasks} />;
        })}
      </div>

      {/*
       * DragOverlay: Renders a floating "clone" of the card being dragged.
       * This follows the cursor and looks elevated (via CSS shadow on .dragging class).
       * Without this, dnd-kit would only show a ghosted placeholder.
       */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTask ? (
          <TaskCard task={activeTask} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
