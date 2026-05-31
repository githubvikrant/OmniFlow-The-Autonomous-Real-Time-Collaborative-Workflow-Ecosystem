/**
 * TaskCard.js — A single draggable task card in the Kanban board
 *
 * HOW DRAGGING WORKS:
 * `useSortable` from @dnd-kit/sortable does three things:
 *   1. Registers this element as a DRAGGABLE item (can be picked up)
 *   2. Registers this element as a DROPPABLE target (other cards can be
 *      sorted relative to it when dragging within the same column)
 *   3. Provides `transform` and `transition` CSS values to animate
 *      the card shifting position as other cards move around it.
 *
 * SEPARATING DRAG HANDLE FROM CLICK TARGET:
 *   Problem: If the entire card is draggable, clicking to open the task
 *   drawer becomes unreliable — dnd-kit intercepts mousedown.
 *
 *   Solution: We separate concerns:
 *   - The drag HANDLE (⠿ icon) gets the `...listeners` spread — it's the
 *     ONLY element that initiates a drag on mousedown.
 *   - The rest of the card body has an `onClick` for opening the drawer.
 *   - We DON'T put `...listeners` on the card root element, only the handle.
 *   This is why the `distance: 8` constraint in BoardView's PointerSensor
 *   exists — belt-and-suspenders to prevent drag/click conflicts.
 *
 * isOverlay prop:
 *   When a card is being dragged, dnd-kit renders TWO instances of TaskCard:
 *   1. The original (now a transparent ghost in its original position)
 *   2. The DragOverlay version (the floating clone following the cursor)
 *   The `isOverlay` prop lets us style the floating version differently
 *   (elevated shadow, no opacity) vs the ghost (low opacity, no pointer events).
 *
 * PRIORITY COLORS:
 *   Each card gets a left-border color based on priority. This is done with
 *   a data attribute (`data-priority="high"`) styled in globals.css.
 *   No inline styles or JS conditionals needed — just CSS attribute selectors.
 */
'use client';

import React, { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '@/store/boardStore';

const TaskCard = memo(function TaskCard({ task, isOverlay = false }) {
  const openTaskDrawer = useBoardStore((state) => state.openTaskDrawer);

  const {
    attributes,  // aria-* attributes for accessibility
    listeners,   // onPointerDown, onKeyDown — the drag event handlers
    setNodeRef,  // ref for dnd-kit to track this DOM element's position
    transform,   // current CSS transform (x/y offset during drag)
    transition,  // CSS transition string for smooth animation
    isDragging,  // true while THIS specific card is being dragged
  } = useSortable({
    id: task.id || task._id,
    data: {
      type: 'Task', // Tells BoardView this is a task, not a column
      task,         // Full task object available in dragEnd via active.data.current.task
    },
    // Disable sortable behavior for the overlay clone — it's just a visual
    disabled: isOverlay,
  });

  const style = {
    // CSS.Transform.toString converts dnd-kit's {x, y, scaleX, scaleY} to a CSS string
    transform: CSS.Transform.toString(transform),
    transition,
    // The original ghost placeholder becomes semi-transparent during drag
    opacity: isDragging ? 0.35 : 1,
    // Remove pointer events from the ghost so it doesn't interfere with drop detection
    pointerEvents: isDragging ? 'none' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // Spread a11y attributes (role="button", aria-roledescription="sortable item", etc.)
      {...attributes}
      className={`kanban-task-card ${isDragging ? 'is-dragging' : ''} ${isOverlay ? 'is-overlay' : ''}`}
      // Set priority as data attribute — CSS handles the left-border color
      data-priority={task.priority || 'medium'}
    >
      {/*
       * DRAG HANDLE — only this area starts a drag.
       * `...listeners` binds the pointer/mouse events that activate dnd-kit.
       * Using a separate handle prevents the card click from being swallowed.
       */}
      <button
        type="button"
        className="task-drag-handle"
        {...listeners}
        aria-label="Drag to reorder task"
        // Prevent this button from opening the drawer (it's for dragging only)
        onClick={(e) => e.stopPropagation()}
      >
        ⠿ {/* Braille pattern dots-123456 — a common "grippy" icon */}
      </button>

      {/*
       * CLICKABLE BODY — opens the Task Detail Drawer.
       * Does NOT have `...listeners` so dnd-kit won't capture its clicks.
       */}
      <div
        className="task-card-body"
        onClick={() => openTaskDrawer(task)}
        onKeyDown={(e) => e.key === 'Enter' && openTaskDrawer(task)}
        role="button"
        tabIndex={0}
        aria-label={`Open details for: ${task.title}`}
      >
        <p className="task-title">{task.title}</p>

        {/* Show metadata row only if there's something to show */}
        {(task.priority || task.aiGenerated || task.description) && (
          <div className="task-meta">
            {/* Priority badge — text only, color comes from the card's left border */}
            {task.priority && (
              <span className={`badge badge--priority badge--${task.priority}`}>
                {task.priority}
              </span>
            )}
            {/* AI-generated marker */}
            {task.aiGenerated && (
              <span className="badge badge--ai">✨ AI</span>
            )}
            {/* Description indicator (shows if there's a description) */}
            {task.description && (
              <span className="badge badge--muted" title={task.description}>
                📝
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Custom comparison function for React.memo
// Prevents the card from re-rendering unless its visual data actually changes
const arePropsEqual = (prevProps, nextProps) => {
  if (prevProps.isOverlay !== nextProps.isOverlay) return false;
  
  const pt = prevProps.task;
  const nt = nextProps.task;
  
  return (
    pt.id === nt.id &&
    pt._id === nt._id &&
    pt.title === nt.title &&
    pt.description === nt.description &&
    pt.priority === nt.priority &&
    pt.aiGenerated === nt.aiGenerated &&
    pt.column === nt.column &&
    pt.order === nt.order
  );
};

export default memo(TaskCard, arePropsEqual);
