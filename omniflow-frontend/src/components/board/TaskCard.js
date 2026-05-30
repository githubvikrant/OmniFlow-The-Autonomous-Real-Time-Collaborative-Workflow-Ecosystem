'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function TaskCard({ task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id || task._id,
    data: {
      type: 'Task',
      task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-task-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="task-content">
        <p className="task-title">{task.title}</p>
        
        {/* Badges / Meta */}
        <div className="task-meta">
          {task.priority && (
            <span className={`badge priority-${task.priority}`}>
              {task.priority}
            </span>
          )}
          {task.aiGenerated && (
            <span className="badge ai-badge">✨ AI</span>
          )}
        </div>
      </div>
    </div>
  );
}
