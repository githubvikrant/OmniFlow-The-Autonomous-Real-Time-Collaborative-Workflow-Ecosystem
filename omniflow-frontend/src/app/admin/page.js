'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, projectsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/projects'),
      ]);

      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
      setProjects(projectsRes.data.data.projects);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Handle Blacklist / Reactivate User
  const handleToggleUserStatus = async (user) => {
    setActionLoading(user._id);
    try {
      const newStatus = !user.isActive;
      await api.patch(`/admin/users/${user._id}/status`, { isActive: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Change User Role
  const handleChangeRole = async (user, newRole) => {
    setActionLoading(user._id);
    try {
      await api.patch(`/admin/users/${user._id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-container">
      {/* Fixed Top Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-header__title">🛡️ Ecosystem Admin Dashboard</h1>
          <p className="admin-header__subtitle">
            Real-time management, analytics, user workloads, and system permissions.
          </p>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="admin-refresh-btn"
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', color: 'var(--color-error)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', flexShrink: 0 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Fixed Tab Selector */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`admin-tab ${activeTab === 'overview' ? 'admin-tab--active' : ''}`}
        >
          📊 Ecosystem Overview
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`admin-tab ${activeTab === 'users' ? 'admin-tab--active' : ''}`}
        >
          👥 User Roster & Workloads ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`admin-tab ${activeTab === 'projects' ? 'admin-tab--active' : ''}`}
        >
          📂 Active Projects ({projects.length})
        </button>
      </div>

      {/* Dedicated Scrollable Tab Content Area */}
      <div className="admin-tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-card__label">TOTAL REGISTERED USERS</div>
                <div className="admin-stat-card__value">{stats.totalUsers}</div>
                <div className="admin-stat-card__subtext">Entire database roster</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card__label">WORKING ON PROJECTS</div>
                <div className="admin-stat-card__value" style={{ color: 'var(--color-accent)' }}>{stats.workingOnProjectsCount}</div>
                <div className="admin-stat-card__subtext">{stats.unassignedUsersCount} unassigned users</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card__label">REAL-TIME ONLINE USERS</div>
                <div className="admin-stat-card__value" style={{ color: 'var(--color-success)' }}>
                  <span style={{ height: '12px', width: '12px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
                  {stats.onlineCount}
                </div>
                <div className="admin-stat-card__subtext">Active socket sessions</div>
              </div>

              <div className="admin-stat-card">
                <div className="admin-stat-card__label">ACTIVE PROJECTS & TASKS</div>
                <div className="admin-stat-card__value">
                  {stats.totalBoards} <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>boards / {stats.totalTasks} tasks</span>
                </div>
                <div className="admin-stat-card__subtext">Live synchronized workflow</div>
              </div>
            </div>

            {/* Role Breakdown */}
            <div className="admin-panel">
              <h2 style={{ fontSize: '1.2rem', margin: '0 0 16px 0', color: 'var(--color-text)' }}>Role Distribution Across Ecosystem</h2>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '180px', backgroundColor: 'var(--color-surface-hover)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-accent)' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Administrators</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)', marginTop: '4px' }}>{stats.roleDistribution.admin || 0}</div>
                </div>
                <div style={{ flex: 1, minWidth: '180px', backgroundColor: 'var(--color-surface-hover)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-success)' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Standard Members</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>{stats.roleDistribution.member || 0}</div>
                </div>
                <div style={{ flex: 1, minWidth: '180px', backgroundColor: 'var(--color-surface-hover)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--color-text-subtle)' }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Viewers</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-muted)', marginTop: '4px' }}>{stats.roleDistribution.viewer || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <input
              type="text"
              placeholder="🔍 Search user by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Workload</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar avatar--default" style={{ width: '36px', height: '36px', fontSize: '14px', fontWeight: 700 }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{user.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ height: '8px', width: '8px', borderRadius: '50%', backgroundColor: user.isOnline ? 'var(--color-success)' : 'var(--color-text-subtle)' }} />
                          <span style={{ fontSize: '0.85rem', color: user.isOnline ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        {!user.isActive && (
                          <span className="admin-badge admin-badge--blacklisted" style={{ marginTop: '4px' }}>
                            BLACKLISTED
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          value={user.role}
                          disabled={actionLoading === user._id}
                          onChange={(e) => handleChangeRole(user, e.target.value)}
                          className="admin-select"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div>📂 <strong>{user.projectCount}</strong> projects</div>
                          <div style={{ color: 'var(--color-text-muted)' }}>📋 <strong>{user.taskCount}</strong> assigned tasks</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedUser(user)}
                            style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            👁️ Inspect
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={actionLoading === user._id}
                            className={`admin-badge ${user.isActive ? 'admin-badge--blacklisted' : 'admin-badge--active'}`}
                            style={{ cursor: 'pointer', padding: '6px 12px' }}
                          >
                            {user.isActive ? '🚫 Blacklist' : '✅ Reactivate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {projects.map((project) => (
              <div key={project._id} className="admin-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-text)' }}>{project.name}</h3>
                  <span className="admin-badge" style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' }}>
                    {project.memberCount} members
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '16px', minHeight: '36px' }}>
                  {project.description || 'No description provided.'}
                </p>

                {/* Owner Info */}
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', marginBottom: '12px' }}>
                  👑 Owner: <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{project.owner?.name || 'Unknown'}</span> ({project.owner?.email})
                </div>

                {/* Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                    <span>Tasks Completion</span>
                    <span>{project.completedTaskCount}/{project.taskCount} ({project.progress}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-surface-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${project.progress}%`, height: '100%', backgroundColor: 'var(--color-accent)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Details Inspection Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-text)' }}>👤 User Profile & Workload</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)' }}>{selectedUser.name}</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>{selectedUser.email}</div>
              <div style={{ marginTop: '8px', fontSize: '0.85rem' }}>
                Role: <span style={{ textTransform: 'uppercase', fontWeight: 600, color: 'var(--color-accent)' }}>{selectedUser.role}</span> | Status: {selectedUser.isActive ? '✅ Active' : '🚫 Blacklisted'}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--color-accent)' }}>Assigned Projects ({selectedUser.projects.length})</h4>
              {selectedUser.projects.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Not assigned to any projects yet.</p>
              ) : (
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                  {selectedUser.projects.map((p) => (
                    <li key={p.id} style={{ marginBottom: '4px' }}>{p.name}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--color-accent)' }}>Assigned Tasks ({selectedUser.tasks.length})</h4>
              {selectedUser.tasks.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No tasks currently assigned.</p>
              ) : (
                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--color-text)' }}>
                  {selectedUser.tasks.map((t) => (
                    <li key={t.id} style={{ marginBottom: '4px' }}>
                      {t.title} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({t.column})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button onClick={() => setSelectedUser(null)} style={{ backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text)', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
