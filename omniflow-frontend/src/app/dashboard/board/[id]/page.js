'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useBoardStore } from '@/store/boardStore';
import BoardView from '@/components/board/BoardView';
import Button from '@/components/ui/Button';
import api from '@/lib/axios';

export default function BoardPage() {
  const { id } = useParams();
  const { activeBoard, isLoading, error, fetchBoardData, clearBoard } = useBoardStore();

  useEffect(() => {
    if (id) {
      fetchBoardData(id);
    }
    return () => clearBoard();
  }, [id, fetchBoardData, clearBoard]);

  if (isLoading) {
    return <div className="board-loading">Loading Board...</div>;
  }

  if (error) {
    return (
      <div className="board-error">
        <h2>Failed to load board</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header__left">
          <h1 className="board-title">{activeBoard?.name}</h1>
          <span className="board-member-count">
            {activeBoard?.memberCount} Member{activeBoard?.memberCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="board-header__right">
          <Button variant="secondary" onClick={async () => {
            try {
              await api.post('/tasks', {
                board: activeBoard._id,
                title: 'Test Task ' + Math.floor(Math.random() * 1000),
                column: 'To Do',
                priority: 'medium'
              });
              fetchBoardData(activeBoard._id);
            } catch (err) {
              console.error('Failed to create task', err);
            }
          }}>+ Add Dummy Task</Button>
          <Button variant="secondary">Share</Button>
          <Button variant="primary">✨ AI Generate</Button>
        </div>
      </header>

      <BoardView board={activeBoard} />
    </div>
  );
}
