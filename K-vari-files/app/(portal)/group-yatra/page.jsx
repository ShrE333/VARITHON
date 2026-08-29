'use client';

/**
 * Create / Join Group Yatra
 * 
 * Users can:
 * - Create a new group and receive a unique code to share
 * - Join existing groups using a code
 * - View group members and their live locations on map
 * - Leave groups
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GroupYatraPage() {
  const router = useRouter();
  const [tab, setTab] = useState('view'); // 'view', 'create', 'join'
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [copiedCode, setCopiedCode] = useState('');

  // Load user from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('varimitra_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        router.replace('/');
      }
    } else {
      router.replace('/');
    }
  }, [router]);

  // Load groups from localStorage (demo implementation)
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem('yatra_groups');
    if (stored) {
      try {
        const allGroups = JSON.parse(stored);
        // Filter groups where user is a member
        const userGroups = allGroups.filter(g => g.members.some(m => m.phone === user.phone));
        setGroups(userGroups);
      } catch (e) {
        console.error('Error loading groups:', e);
      }
    }
  }, [user]);

  // Generate random 6-character alphanumeric code
  const generateGroupCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Handle create group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!groupName.trim()) {
      setError('Group name is required');
      setLoading(false);
      return;
    }

    try {
      const groupCode = generateGroupCode();
      const newGroup = {
        id: Date.now().toString(),
        code: groupCode,
        name: groupName,
        description: groupDescription,
        createdBy: user.phone,
        createdAt: new Date().toISOString(),
        members: [
          {
            phone: user.phone,
            name: user.name,
            joined: new Date().toISOString(),
            lat: null,
            lng: null,
            lastLocationUpdate: null,
            role: 'admin',
          },
        ],
      };

      // Save to localStorage (demo) - in production this goes to Supabase
      const stored = localStorage.getItem('yatra_groups') || '[]';
      const allGroups = JSON.parse(stored);
      allGroups.push(newGroup);
      localStorage.setItem('yatra_groups', JSON.stringify(allGroups));

      // Add to local state
      setGroups([...groups, newGroup]);

      setSuccess(`✅ Group created! Share code: ${groupCode}`);
      setGroupName('');
      setGroupDescription('');
      
      // Auto-select new group
      setTimeout(() => {
        setTab('view');
      }, 2000);
    } catch (err) {
      setError(`Error creating group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle join group
  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!joinCode.trim()) {
      setError('Group code is required');
      setLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem('yatra_groups') || '[]';
      const allGroups = JSON.parse(stored);
      const targetGroup = allGroups.find(g => g.code === joinCode.toUpperCase());

      if (!targetGroup) {
        setError('Invalid group code. Please check and try again.');
        setLoading(false);
        return;
      }

      // Check if already member
      if (targetGroup.members.some(m => m.phone === user.phone)) {
        setError('You are already a member of this group.');
        setLoading(false);
        return;
      }

      // Add member to group
      targetGroup.members.push({
        phone: user.phone,
        name: user.name,
        joined: new Date().toISOString(),
        lat: null,
        lng: null,
        lastLocationUpdate: null,
        role: 'member',
      });

      // Update storage
      localStorage.setItem('yatra_groups', JSON.stringify(allGroups));

      // Update local state
      setGroups(allGroups.filter(g => g.members.some(m => m.phone === user.phone)));

      setSuccess(`✅ Joined "${targetGroup.name}" successfully!`);
      setJoinCode('');

      setTimeout(() => {
        setTab('view');
      }, 2000);
    } catch (err) {
      setError(`Error joining group: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle leave group
  const handleLeaveGroup = (groupId) => {
    if (!confirm('Are you sure you want to leave this group?')) return;

    try {
      const stored = localStorage.getItem('yatra_groups') || '[]';
      const allGroups = JSON.parse(stored);
      
      const group = allGroups.find(g => g.id === groupId);
      if (group) {
        group.members = group.members.filter(m => m.phone !== user.phone);
        localStorage.setItem('yatra_groups', JSON.stringify(allGroups));
        setGroups(groups.filter(g => g.id !== groupId));
        setSuccess('Left group successfully');
      }
    } catch (err) {
      setError(`Error leaving group: ${err.message}`);
    }
  };

  // Copy code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="vm-group-yatra">
      <style>{`
        .vm-group-yatra {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
          border-bottom: 1px solid #E5E7EB;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #1F2937;
          margin: 0;
        }
        .back-btn {
          padding: 10px 15px;
          border: 1px solid #D1D5DB;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 30px;
          border-bottom: 2px solid #E5E7EB;
        }
        .tab-btn {
          padding: 12px 20px;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #6B7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s;
          margin-bottom: -2px;
        }
        .tab-btn.active {
          color: #7C3AED;
          border-bottom-color: #7C3AED;
        }
        .tab-btn:hover {
          color: #374151;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          transition: border 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #7C3AED;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7C3AED, #5B21B6);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .alert {
          padding: 14px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .alert.error {
          background: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .alert.success {
          background: #DCFCE7;
          color: #166534;
          border: 1px solid #BBF7D0;
        }
        .groups-grid {
          display: grid;
          gap: 20px;
          margin-top: 20px;
        }
        .group-card {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }
        .group-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border-color: #7C3AED;
        }
        .group-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .group-title {
          font-size: 18px;
          font-weight: 700;
          color: #1F2937;
        }
        .group-code-badge {
          background: #EDE9FE;
          color: #7C3AED;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .group-code-badge:hover {
          background: #DDD6FE;
        }
        .group-code-badge.copied {
          background: #D1FAE5;
          color: #065F46;
        }
        .group-description {
          font-size: 14px;
          color: #6B7280;
          margin-bottom: 12px;
        }
        .group-members {
          margin-bottom: 15px;
        }
        .group-members-label {
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          margin-bottom: 8px;
          display: block;
        }
        .member-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .member-badge {
          background: #F3F4F6;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .member-badge.admin {
          background: #FEF3C7;
          color: #92400E;
        }
        .group-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #F3F4F6;
          font-size: 12px;
          color: #6B7280;
        }
        .group-actions {
          display: flex;
          gap: 8px;
        }
        .btn-action {
          padding: 8px 12px;
          border: 1px solid #D1D5DB;
          background: white;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action:hover {
          background: #F3F4F6;
          border-color: #9CA3AF;
        }
        .btn-action.view {
          background: #7C3AED;
          color: white;
          border-color: #7C3AED;
        }
        .btn-action.view:hover {
          background: #6D28D9;
        }
        .btn-action.leave {
          color: #EF4444;
          border-color: #FCA5A5;
        }
        .btn-action.leave:hover {
          background: #FEE2E2;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6B7280;
        }
        .empty-state i {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #374151;
        }
      `}</style>

      <div className="header">
        <h1>📍 Group Yatra</h1>
        <button className="back-btn" onClick={() => router.back()}>← Back</button>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${tab === 'view' ? 'active' : ''}`}
          onClick={() => setTab('view')}
        >
          👥 My Groups
        </button>
        <button
          className={`tab-btn ${tab === 'create' ? 'active' : ''}`}
          onClick={() => setTab('create')}
        >
          ➕ Create Group
        </button>
        <button
          className={`tab-btn ${tab === 'join' ? 'active' : ''}`}
          onClick={() => setTab('join')}
        >
          🔗 Join Group
        </button>
      </div>

      {/* View Groups Tab */}
      <div className={`tab-content ${tab === 'view' ? 'active' : ''}`}>
        {groups.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3>No Groups Yet</h3>
            <p>Create a new group or join an existing one to get started!</p>
          </div>
        ) : (
          <div className="groups-grid">
            {groups.map((group) => {
              const isAdmin = group.createdBy === user?.phone;
              const userMember = group.members.find(m => m.phone === user?.phone);
              return (
                <div key={group.id} className="group-card">
                  <div className="group-header">
                    <div>
                      <h3 className="group-title">{group.name}</h3>
                      {group.description && (
                        <p className="group-description">{group.description}</p>
                      )}
                    </div>
                    <div
                      className={`group-code-badge ${copiedCode === group.code ? 'copied' : ''}`}
                      onClick={() => copyToClipboard(group.code)}
                      title="Click to copy code"
                    >
                      <i className="fa-solid fa-copy"></i>
                      {group.code}
                    </div>
                  </div>

                  <div className="group-members">
                    <label className="group-members-label">
                      Members ({group.members.length})
                    </label>
                    <div className="member-list">
                      {group.members.map((member) => (
                        <div
                          key={member.phone}
                          className={`member-badge ${isAdmin && member.phone === group.createdBy ? 'admin' : ''}`}
                        >
                          <i className={`fa-solid ${isAdmin && member.phone === group.createdBy ? 'fa-crown' : 'fa-user-circle'}`}></i>
                          {member.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="group-meta">
                    <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                    <div className="group-actions">
                      <button
                        className="btn-action view"
                        onClick={() => router.push(`/group-yatra/${group.id}`)}
                      >
                        <i className="fa-solid fa-map"></i> View on Map
                      </button>
                      {userMember && (
                        <button
                          className="btn-action leave"
                          onClick={() => handleLeaveGroup(group.id)}
                        >
                          <i className="fa-solid fa-sign-out-alt"></i> Leave
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group Tab */}
      <div className={`tab-content ${tab === 'create' ? 'active' : ''}`}>
        {error && <div className="alert error"><i className="fa-solid fa-circle-exclamation"></i>{error}</div>}
        {success && <div className="alert success"><i className="fa-solid fa-circle-check"></i>{success}</div>}

        <form onSubmit={handleCreateGroup}>
          <div className="form-group">
            <label htmlFor="groupName">Group Name *</label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Family Yatra 2026, Friends from Pune"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupDescription">Description (Optional)</label>
            <textarea
              id="groupDescription"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Add any notes about this group..."
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : '✨ Create Group'}
          </button>
        </form>
      </div>

      {/* Join Group Tab */}
      <div className={`tab-content ${tab === 'join' ? 'active' : ''}`}>
        {error && <div className="alert error"><i className="fa-solid fa-circle-exclamation"></i>{error}</div>}
        {success && <div className="alert success"><i className="fa-solid fa-circle-check"></i>{success}</div>}

        <form onSubmit={handleJoinGroup}>
          <div className="form-group">
            <label htmlFor="joinCode">Group Code *</label>
            <input
              type="text"
              id="joinCode"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code (e.g., ABC123)"
              maxLength="6"
              required
              disabled={loading}
              style={{ fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px' }}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Joining...' : '🔗 Join Group'}
          </button>
        </form>
      </div>
    </div>
  );
}
