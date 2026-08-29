'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function GroupMapPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId;
  const [group, setGroup] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    
    // Load group data
    const stored = localStorage.getItem('yatra_groups');
    if (stored) {
      const groups = JSON.parse(stored);
      const targetGroup = groups.find(g => g.id === groupId);
      setGroup(targetGroup);
    }

    // Get user location (simulated for now)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoading(false);
        },
        () => {
          // Fallback: demo location (Pandharpur)
          setUserLocation({ lat: 18.6489, lng: 75.3268 });
          setLoading(false);
        }
      );
    } else {
      setUserLocation({ lat: 18.6489, lng: 75.3268 });
      setLoading(false);
    }
  }, [groupId]);

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading map...</div>;
  }

  if (!group) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Group not found</p>
        <button onClick={() => router.back()}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .map-header {
          padding: 16px;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .map-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }
        .map-container {
          flex: 1;
          background: #F0F0F0;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .map-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #E8F4F8 0%, #F0E8F8 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #6B7280;
        }
        .map-placeholder i {
          font-size: 64px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .members-panel {
          background: white;
          padding: 16px;
          border-top: 1px solid #E5E7EB;
          max-height: 300px;
          overflow-y: auto;
        }
        .member-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7C3AED, #5B21B6);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        }
        .member-info {
          flex: 1;
        }
        .member-info strong {
          display: block;
          font-size: 14px;
          color: #1F2937;
        }
        .member-info span {
          display: block;
          font-size: 12px;
          color: #6B7280;
        }
        .member-status {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10B981;
        }
      `}</style>

      <div className="map-header">
        <div>
          <h2>{group.name}</h2>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13px' }}>
            {group.members.length} members • Code: <strong>{group.code}</strong>
          </p>
        </div>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>
          ← Back
        </button>
      </div>

      <div className="map-container">
        <div className="map-placeholder">
          <i className="fa-solid fa-map"></i>
          <p style={{ textAlign: 'center', maxWidth: '400px' }}>
            🗺️ Map integration for {group.members.length} group members<br />
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              This will display live locations of all group members on an interactive map using Leaflet
            </span>
          </p>
        </div>
      </div>

      <div className="members-panel">
        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Group Members</h3>
        {group.members.map((member, idx) => (
          <div key={member.phone} className="member-item">
            <div className="member-avatar">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="member-info">
              <strong>{member.name} {member.role === 'admin' ? '👑' : ''}</strong>
              <span>{member.phone}</span>
            </div>
            <div className="member-status"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
