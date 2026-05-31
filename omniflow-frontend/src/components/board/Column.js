/**
 * Column.js — A single Kanban column (e.g., "To Do", "In Progress")
 *
 * WHY useDroppable + SortableContext TOGETHER?
 *
 * dnd-kit has two layers:
 *   1. `useDroppable` — makes the column's body area a valid drop TARGET
 *      for cards being dragged from OTHER columns. When a card hovers over
 *      this column, `isOver` becomes true and we can highlight it.
 *
 *   2. `SortableContext` + `useSortable` (inside TaskCard) — handles
 *      REORDERING within a single column. It tracks the list of item IDs
 *      and computes smooth animations when items shift positions.
 *
 * Together they give us: cross-column movement (useDroppable) AND
 * within-column reordering (SortableContext). Two different jobs.
 *
 * COLUMN ID = COLUMN NAME:
 *   We use the column title (e.g., "To Do") as the droppable `id`.
 *   This makes it trivial to identify the target column in `handleDragEnd`
 *   — `over.id` will literally be "To Do", "In Progress", etc.
 */
'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { useBoardStore } from '@/store/boardStore';

export default function Column({ title, tasks }) {
  const openTaskDrawer = useBoardStore((state) => state.openTaskDrawer);

  // Make this column a valid drop zone for dragged tasks
  const { setNodeRef, isOver } = useDroppable({
    id: title, // The droppable ID IS the column name — used in BoardView's handleDragEnd
    data: {
      type: 'Column', // Lets BoardView distinguish columns from task cards
      title,
    },
  });

  // SortableContext needs the list of item IDs in their current order
  // This drives the "ghost" repositioning animations during drag
  const taskIds = tasks.map(t => t.id || t._id);

  return (
    <div className={`kanban-column ${isOver ? 'column-is-over' : ''}`}>
      {/* Column header: title + task count badge */}
      <div className="column-header">
        <h3 className="column-title">{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      {/*
       * The column body is the ref for useDroppable — this is the entire
       * droppable area. Cards dropped anywhere inside here will register
       * as dropped onto this column.
       */}
      <div className="column-body" ref={setNodeRef}>
        {/* SortableContext provides sortable behavior to all child TaskCards */}
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id || task._id} task={task} />
          ))}
        </SortableContext>

        {/*
         * "+ Add Task" appears at the bottom of every column.
         * Opens the drawer in CREATE mode, pre-selecting this column.
         * The `null` first arg signals "create mode" to the drawer.
         */}
        <button
          className="btn-add-task-col"
          onClick={() => openTaskDrawer(null, title)}
          aria-label={`Add a task to ${title}`}
        >
          + Add Task
        </button>
      </div>
    </div>
  );
}
