'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToastStore } from '@/store/toastStore';
import { useBoardStore } from '@/store/boardStore';
import api from '@/lib/axios';

export default function ShareModal({ isOpen, onClose, boardId }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const fetchBoardData = useBoardStore((state) => state.fetchBoardData);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await api.post(`/boards/${boardId}/members`, { email, role: 'member' });
      addToast('Member added successfully', 'success');
      setEmail('');
      fetchBoardData(boardId); // Refresh board data to show new member count
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add member', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Board">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Invite someone to collaborate on this board in real-time.
          </p>
          <Input
            type="email"
            placeholder="User's email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Invite'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
