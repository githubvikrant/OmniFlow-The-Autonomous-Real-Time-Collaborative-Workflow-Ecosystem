'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const res = await api.get('/boards');
        setBoards(res.data.data.boards);
      } catch (error) {
        console.error('Failed to fetch boards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoards();
  }, []);

  const handleCreateBoard = async () => {
    try {
      const res = await api.post('/boards', { name: 'New Project', columns: ['To Do', 'In Progress', 'Review', 'Done'] });
      router.push(`/dashboard/board/${res.data.data.board._id}`);
    } catch (error) {
      console.error('Failed to create board', error);
    }
  };

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1 className="dashboard-header__title">Your Boards</h1>
        <Button variant="primary" onClick={handleCreateBoard}>
          + New Board
        </Button>
      </header>

      {isLoading ? (
        <div className="dashboard-loading">Loading boards...</div>
      ) : boards.length === 0 ? (
        <div className="dashboard-empty">
          <p>You don't have any boards yet.</p>
          <Button variant="secondary" onClick={handleCreateBoard}>
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => (
            <Link key={board._id} href={`/dashboard/board/${board._id}`} className="board-card">
              <div className="board-card__color" style={{ backgroundColor: board.color || '#6366f1' }}></div>
              <div className="board-card__info">
                <h3 className="board-card__title">{board.name}</h3>
                <p className="board-card__meta">
                  {board.memberCount} member{board.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
