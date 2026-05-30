'use client';

import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState } from 'react';
import Column from './Column';
import TaskCard from './TaskCard';
import { useBoardStore } from '@/store/boardStore';

export default function BoardView({ board }) {
  const { tasks, moveTask } = useBoardStore();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts, allows click events
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => (t.id || t._id) === active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Find active task
    const activeTask = tasks.find(t => (t.id || t._id) === activeId);
    if (!activeTask) return;

    // Determine target column
    const overIsColumn = over.data.current?.type === 'Column';
    const overTask = overIsColumn ? null : tasks.find(t => (t.id || t._id) === overId);
    
    const targetColumn = overIsColumn ? over.id : overTask?.column;
    if (!targetColumn) return;

    // If moved to same column, calculate new order within the column
    // For simplicity right now, we append it to the end of the new column, 
    // or insert it at the specific order if hovering over a task
    
    let newOrder = 0;
    const columnTasks = tasks.filter(t => t.column === targetColumn).sort((a,b) => a.order - b.order);
    
    if (overIsColumn) {
      // Append to the end of the empty column
      newOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order + 1 : 0;
    } else if (overTask) {
      // Calculate order between tasks
      newOrder = overTask.order;
      // The store moveTask action will bump the order of subsequent tasks
    }

    // Fire the optimistic update
    moveTask(activeId, targetColumn, newOrder);
  };

  if (!board || !board.columns) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kanban-board">
        {board.columns.map(col => {
          const colTasks = tasks.filter(t => t.column === col).sort((a,b) => a.order - b.order);
          return <Column key={col} title={col} tasks={colTasks} />;
        })}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
