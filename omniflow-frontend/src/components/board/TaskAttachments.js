'use client';

import { useState } from 'react';
import api from '@/lib/axios';
import { useBoardStore } from '@/store/boardStore';
import { useToastStore } from '@/store/toastStore';
import Button from '../ui/Button';

export default function TaskAttachments({ task }) {
  const [isUploading, setIsUploading] = useState(false);
  const { updateTaskLocally } = useBoardStore();
  const { addToast } = useToastStore();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      addToast('File size must be less than 10MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      const res = await api.post(`/tasks/${task._id || task.id}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update the local task with the new attachments array from the server
      updateTaskLocally(task._id || task.id, res.data.data.task);
      addToast('File attached successfully', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to attach file', 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = null;
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!window.confirm('Delete this attachment?')) return;

    try {
      const res = await api.delete(`/tasks/${task._id || task.id}/attachments/${attachmentId}`);
      updateTaskLocally(task._id || task.id, res.data.data.task);
      addToast('Attachment removed', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove attachment', 'error');
    }
  };

  return (
    <div className="task-attachments" style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '12px', fontWeight: 600 }}>Attachments</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
        {task.attachments?.map((attachment) => (
          <div 
            key={attachment._id} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              {attachment.fileType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={attachment.url} 
                  alt={attachment.fileName} 
                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }}
                />
              ) : (
                <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  FILE
                </div>
              )}
              <a 
                href={attachment.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '200px'
                }}
                title={attachment.fileName}
              >
                {attachment.fileName}
              </a>
            </div>
            
            <button
              onClick={() => handleDelete(attachment._id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-danger, #ef4444)',
                cursor: 'pointer',
                fontSize: '1.25rem',
                padding: '4px',
                lineHeight: 1,
              }}
              title="Remove attachment"
            >
              &times;
            </button>
          </div>
        ))}
        {(!task.attachments || task.attachments.length === 0) && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            No attachments yet.
          </p>
        )}
      </div>

      <div>
        <input 
          type="file" 
          id="task-file-upload" 
          style={{ display: 'none' }} 
          onChange={handleFileUpload} 
          disabled={isUploading}
        />
        <Button 
          variant="secondary" 
          onClick={() => document.getElementById('task-file-upload').click()}
          isLoading={isUploading}
          style={{ width: '100%' }}
        >
          {isUploading ? 'Uploading...' : 'Attach File'}
        </Button>
      </div>
    </div>
  );
}
