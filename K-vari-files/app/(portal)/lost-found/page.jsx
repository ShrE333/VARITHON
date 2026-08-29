'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

function LostFoundMapFocus({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof map.fitBounds !== 'function') return;
    if (!Array.isArray(points) || points.length === 0) return;

    const validPoints = points.filter(([lat, lng]) =>
      Number.isFinite(lat) && Number.isFinite(lng)
    );

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 12);
      return;
    }

    map.fitBounds(validPoints, { padding: [35, 35], maxZoom: 12 });
  }, [map, points]);

  return null;
}

export default function LostFoundPage() {
  const router = useRouter();
  const [tab, setTab] = useState('browse');
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 18.6489, lng: 75.3268 });

  const [items] = useState([
    { 
      id: 1, 
      type: 'Found', 
      item: 'Blue Backpack', 
      location: 'Indapur Camp', 
      lat: 18.7721, 
      lng: 75.1289,
      date: '28 Aug 2026', 
      contact: '9876543210',
      description: 'Blue Decathlon backpack with yellow straps'
    },
    { 
      id: 2, 
      type: 'Lost', 
      item: 'Gold Bracelet', 
      location: 'Route between Pandharpur-Indapur', 
      lat: 18.72, 
      lng: 75.23,
      date: '27 Aug 2026', 
      contact: '9123456789',
      description: 'Traditional gold bracelet with family insignia'
    },
    { 
      id: 3, 
      type: 'Found', 
      item: 'Mobile Phone (Samsung)', 
      location: 'Saswad Rest Area', 
      lat: 18.8321, 
      lng: 75.0521,
      date: '26 Aug 2026', 
      contact: '8765432109',
      description: 'Samsung Galaxy A12, Black color, locked'
    },
    { 
      id: 4, 
      type: 'Lost', 
      item: 'White Shawl', 
      location: 'Lonand Shelter', 
      lat: 18.8921, 
      lng: 74.9521,
      date: '25 Aug 2026', 
      contact: '7654321098',
      description: 'White cotton shawl with embroidery'
    },
  ]);

  const [formData, setFormData] = useState({ itemType: 'Lost', description: '', location: '', contact: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const itemPoints = items.map(item => [item.lat, item.lng]);

  useEffect(() => {
    setMapReady(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {}
      );
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setSuccess('✅ Report submitted! Our team will help you find it.');
      setFormData({ itemType: 'Lost', description: '', location: '', contact: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="vm-lost-found" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', margin: 0, padding: 0 }}>
      <style>{`
        .vm-lost-found {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .lf-header {
          padding: 20px;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .lf-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .lf-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .map-section {
          flex: 1;
          position: relative;
          background: #F0F0F0;
        }
        .map-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #EFE1CC 0%, #E8F4F8 100%);
          font-size: 48px;
        }
        .details-section {
          width: 300px;
          background: white;
          border-left: 1px solid #E5E7EB;
          overflow-y: auto;
          padding: 20px;
        }
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          border-bottom: 2px solid #E5E7EB;
        }
        .tab-btn {
          padding: 12px 16px;
          background: none;
          border: none;
          font-weight: 600;
          cursor: pointer;
          color: #6B7280;
          border-bottom: 3px solid transparent;
          margin-bottom: -2px;
          transition: all 0.2s;
        }
        .tab-btn.active {
          color: #8B1B1B;
          border-bottom-color: #8B1B1B;
        }
        .item-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .item-card {
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid #E5E7EB;
        }
        .item-card.lost {
          border-left-color: #EF4444;
          background: #FEF2F2;
        }
        .item-card.found {
          border-left-color: #10B981;
          background: #F0FDF4;
        }
        .item-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .item-name {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .item-meta {
          font-size: 11px;
          color: #6B7280;
          display: flex;
          justify-content: space-between;
        }
        .form-group {
          margin-bottom: 14px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
          font-size: 13px;
          color: #1F2937;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 8px;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 12px;
          font-family: inherit;
          transition: border 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8B1B1B;
          box-shadow: 0 0 0 2px rgba(139, 27, 27, 0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 60px;
        }
        .submit-btn {
          width: 100%;
          padding: 10px;
          background: #8B1B1B;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .submit-btn:hover {
          background: #6B1515;
        }
        .success-msg {
          background: #DCFCE7;
          color: #166534;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 12px;
          border-left: 4px solid #10B981;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #F0F0F0;
        }
        ::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
      `}</style>

      <div className="lf-header">
        <div>
          <h1>🔍 Lost & Found Services</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13px' }}>
            Click items on the map to see details
          </p>
        </div>
        <button 
          onClick={() => router.back()} 
          style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          ← Back
        </button>
      </div>

      <div className="lf-content">
        <div className="map-section">
          {mapReady ? (
            <MapContainer
              key="lost-found-map"
              style={{ width: '100%', height: '100%' }}
              bounds={itemPoints}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <LostFoundMapFocus points={itemPoints} />
              
              {/* Item markers */}
              {items.map((item) => (
                <Marker key={item.id} position={[item.lat, item.lng]}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '200px' }}>
                      <strong>{item.type === 'Lost' ? '❌' : '✅'} {item.item}</strong>
                      <br />
                      {item.description}
                      <br />
                      Location: {item.location}
                      <br />
                      Date: {item.date}
                      <br />
                      📞 {item.contact}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="map-placeholder">🗺️ Loading map...</div>
          )}
        </div>

        <div className="details-section">
          <div className="tabs">
            <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
              📍 Browse Items
            </button>
            <button className={`tab-btn ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
              📤 Report
            </button>
          </div>

          {tab === 'browse' && (
            <div className="item-list">
              {items.length === 0 ? (
                <p style={{ color: '#6B7280', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>
                  No items yet
                </p>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={`item-card ${item.type.toLowerCase()}`}
                    onClick={() => alert(`${item.item}\n${item.description}\n\nContact: ${item.contact}`)}
                  >
                    <div className="item-name">{item.type === 'Lost' ? '❌' : '✅'} {item.item}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                      {item.location}
                    </div>
                    <div className="item-meta">
                      <span>{item.date}</span>
                      <span>📞 {item.contact}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'report' && (
            <form onSubmit={handleSubmit}>
              {success && <div className="success-msg">{success}</div>}
              
              <div className="form-group">
                <label>Item Type</label>
                <select value={formData.itemType} onChange={(e) => setFormData({...formData, itemType: e.target.value})}>
                  <option value="Lost">Lost</option>
                  <option value="Found">Found</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Item Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Describe the item in detail..."
                  required
                ></textarea>
              </div>
              
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={(e) => setFormData({...formData, location: e.target.value})} 
                  placeholder="Where was it lost/found?" 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Contact Number</label>
                <input 
                  type="tel" 
                  value={formData.contact} 
                  onChange={(e) => setFormData({...formData, contact: e.target.value})} 
                  placeholder="10-digit mobile" 
                  pattern="[0-9]{10}" 
                  required 
                />
              </div>
              
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Submitting...' : '📤 Submit Report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
