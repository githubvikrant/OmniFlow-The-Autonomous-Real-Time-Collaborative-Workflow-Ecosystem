'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBoardStore } from '@/store/boardStore';
import { useToastStore } from '@/store/toastStore';
import api from '@/lib/axios';
import BoardView from '@/components/board/BoardView';
import Button from '@/components/ui/Button';
import TaskDetailDrawer from '@/components/board/TaskDetailDrawer';
import ShareModal from '@/components/board/ShareModal';

export default function BoardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToast } = useToastStore();
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const activeBoard = useBoardStore((state) => state.activeBoard);
  const isLoading = useBoardStore((state) => state.isLoading);
  const error = useBoardStore((state) => state.error);
  const fetchBoardData = useBoardStore((state) => state.fetchBoardData);
  const clearBoard = useBoardStore((state) => state.clearBoard);
  const taskDrawer = useBoardStore((state) => state.taskDrawer);
  const openTaskDrawer = useBoardStore((state) => state.openTaskDrawer);
  const closeTaskDrawer = useBoardStore((state) => state.closeTaskDrawer);

  useEffect(() => {
    if (id) {
      fetchBoardData(id);
    }
    return () => clearBoard();
  }, [id, fetchBoardData, clearBoard]);

  useEffect(() => {
    if (activeBoard) {
      setBoardTitle(activeBoard.name);
    }
  }, [activeBoard]);

  const handleRenameSubmit = async () => {
    setIsEditingTitle(false);
    const newName = boardTitle.trim();
    if (!newName || newName === activeBoard?.name) {
      setBoardTitle(activeBoard?.name || '');
      return;
    }
    try {
      await api.patch(`/boards/${activeBoard._id}`, { name: newName });
      addToast('Board renamed', 'success');
      fetchBoardData(activeBoard._id);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to rename board', 'error');
      setBoardTitle(activeBoard?.name || '');
    }
  };

  const handleDeleteBoard = async () => {
    if (!window.confirm(`Are you sure you want to delete "${activeBoard?.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/boards/${activeBoard._id}`);
      addToast('Board deleted successfully', 'success');
      router.push('/dashboard');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete board', 'error');
    }
  };

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
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              className="board-title-input"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') {
                  setBoardTitle(activeBoard?.name || '');
                  setIsEditingTitle(false);
                }
              }}
              style={{ fontSize: '1.5rem', fontWeight: 'bold', padding: '0.25rem', border: '1px solid var(--color-border-strong)', borderRadius: '4px', background: 'transparent', color: 'inherit' }}
            />
          ) : (
            <h1 
              className="board-title" 
              onClick={() => setIsEditingTitle(true)}
              style={{ cursor: 'text' }}
              title="Click to rename"
            >
              {activeBoard?.name}
            </h1>
          )}
          <span className="board-member-count">
            {activeBoard?.memberCount} Member{activeBoard?.memberCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="board-header__right">
          <button 
            type="button" 
            className="btn-danger-text" 
            onClick={handleDeleteBoard}
            style={{ marginRight: '1rem' }}
          >
            Delete Board
          </button>
          <Button variant="secondary" onClick={() => openTaskDrawer()}>
            + Add Task
          </Button>
          <Button variant="secondary" onClick={() => setIsShareModalOpen(true)}>Share</Button>
          <Button variant="primary">✨ AI Generate</Button>
        </div>
      </header>

      <BoardView board={activeBoard} />

      <TaskDetailDrawer 
        isOpen={taskDrawer.isOpen}
        onClose={closeTaskDrawer}
        task={taskDrawer.task}
        targetColumn={taskDrawer.targetColumn}
      />

      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        boardId={activeBoard?._id} 
      />
    </div>
  );
}
