'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

export default function Column({ title, tasks }) {
  const { setNodeRef, isOver } = useDroppable({
    id: title, // use column name as droppable ID
    data: {
      type: 'Column',
      title,
    }
  });

  const taskIds = tasks.map(t => t.id || t._id);

  return (
    <div className={`kanban-column ${isOver ? 'column-is-over' : ''}`}>
      <div className="column-header">
        <h3 className="column-title">{title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="column-body" ref={setNodeRef}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id || task._id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
