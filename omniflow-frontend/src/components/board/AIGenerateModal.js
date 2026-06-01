import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import api from '@/lib/axios';
import { useBoardStore } from '@/store/boardStore';
import { useToastStore } from '@/store/toastStore';

export default function AIGenerateModal({ isOpen, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { activeBoard, addTasksLocally } = useBoardStore();
  const { addToast } = useToastStore();

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      addToast('Please enter a goal or prompt', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/tasks/generate', {
        board: activeBoard._id || activeBoard.id,
        prompt: prompt.trim()
      });

      addTasksLocally(res.data.data.tasks);
      addToast(`Successfully generated ${res.data.results} tasks!`, 'success');
      setPrompt('');
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to generate tasks via AI', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ Generate Tasks with AI">
      <form onSubmit={handleGenerate}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            What do you want to build or achieve?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Build a landing page with a hero section, pricing table, and contact form."
            rows={4}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading} style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', border: 'none' }}>
            {isLoading ? 'Thinking...' : 'Generate Tasks'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
