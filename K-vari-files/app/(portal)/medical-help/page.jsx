'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Circle = dynamic(() => import('react-leaflet').then(mod => mod.Circle), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

function MedicalMapFocus({ points }) {
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

export default function MedicalHelpPage() {
  const router = useRouter();
  const [emergencyLevel, setEmergencyLevel] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 18.6489, lng: 75.3268 }); // Default: Pandharpur

  // Medical facilities data
  const medicalFacilities = [
    {
      name: 'Pandharpur Primary Health Center',
      lat: 18.6489,
      lng: 75.3268,
      distance: '0.5 km',
      time: '10 mins',
      type: 'Hospital',
      services: 'General checkup, Surgery, Emergency',
      phone: '9876543210',
      rating: 4.8,
    },
    {
      name: 'Saswad Medical Camp',
      lat: 18.8321,
      lng: 75.0521,
      distance: '28 km',
      time: '45 mins walk',
      type: 'Medical Camp',
      services: 'First aid, ORS, Bandaging',
      phone: '9123456789',
      rating: 4.5,
    },
    {
      name: 'Indapur Emergency Center',
      lat: 18.7721,
      lng: 75.1289,
      distance: '18 km',
      time: '30 mins walk',
      type: 'Emergency Clinic',
      services: '24/7 Emergency, Ambulance',
      phone: '8765432109',
      rating: 4.7,
    },
  ];

  const symptomOptions = [
    'Fever',
    'Body Ache',
    'Dizziness',
    'Dehydration',
    'Injury/Cut',
    'Chest Pain',
    'Difficulty Breathing',
    'Other'
  ];

  useEffect(() => {
    setMapReady(true);
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Keep default if geolocation fails
        }
      );
    }
  }, []);

  const handleEmergency = () => {
    router.push('tel:112');
  };

  const handleSymptomToggle = (symptom) => {
    setSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  };

  const nearestFacility = medicalFacilities[0];
  const medicalPoints = [...medicalFacilities.map(item => [item.lat, item.lng]), [userLocation.lat, userLocation.lng]];

  return (
    <div className="vm-medical" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', margin: 0, padding: 0 }}>
      <style>{`
        .vm-medical {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: white;
        }
        .medical-header {
          padding: 20px;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .medical-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #1F2937;
        }
        .medical-content {
          display: flex;
          flex: 1;
          overflow: hidden;
          gap: 0;
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
          background: linear-gradient(135deg, #FEE2E2 0%, #FEF3E2 100%);
          font-size: 48px;
        }
        .details-section {
          width: 320px;
          background: white;
          border-left: 1px solid #E5E7EB;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .emergency-btn {
          width: 100%;
          padding: 20px;
          background: #EF4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .emergency-btn:hover {
          background: #DC2626;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        .facility-card {
          border: 2px solid #10B981;
          padding: 16px;
          border-radius: 8px;
          background: #F0FDF4;
        }
        .facility-card h3 {
          margin: 0 0 12px 0;
          color: #065F46;
          font-size: 15px;
        }
        .facility-info {
          margin: 8px 0;
          color: #047857;
          font-size: 13px;
          line-height: 1.5;
        }
        .facility-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          margin: 8px 0;
          color: #F59E0B;
          font-size: 13px;
        }
        .get-directions-btn {
          width: 100%;
          padding: 10px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 6px;
          margin-top: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .get-directions-btn:hover {
          background: #059669;
        }
        .symptoms-section {
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }
        .symptoms-title {
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 12px;
          font-size: 13px;
        }
        .symptom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
        }
        .symptom-btn {
          padding: 10px;
          border: 2px solid #E5E7EB;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 12px;
          font-weight: 600;
        }
        .symptom-btn.selected {
          background: #DBEAFE;
          border-color: #3B82F6;
          color: #1E40AF;
        }
        .report-btn {
          width: 100%;
          padding: 12px;
          background: #3B82F6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .report-btn:hover {
          background: #2563EB;
        }
        .other-facilities {
          padding-top: 12px;
          border-top: 1px solid #E5E7EB;
        }
        .other-facilities-title {
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .facility-item {
          padding: 10px;
          background: #F9FAFB;
          border-radius: 6px;
          margin-bottom: 8px;
          border-left: 4px solid #E8630C;
          font-size: 12px;
        }
        .facility-item-name {
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 2px;
        }
        .facility-item-type {
          color: #6B7280;
          font-size: 11px;
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

      <div className="medical-header">
        <div>
          <h1>🏥 Emergency & Medical Help</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13px' }}>
            Find nearest facility or report symptoms
          </p>
        </div>
        <button 
          onClick={() => router.back()} 
          style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          ← Back
        </button>
      </div>

      <div className="medical-content">
        <div className="map-section">
          {mapReady ? (
            <MapContainer
              key="medical-help-map"
              style={{ width: '100%', height: '100%' }}
              bounds={medicalPoints}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <MedicalMapFocus points={medicalPoints} />
              
              {/* User location */}
              <Circle center={[userLocation.lat, userLocation.lng]} radius={200} fillColor="#3B82F6" color="#1E40AF" weight={2} opacity={0.7} />
              
              {/* Medical facilities */}
              {medicalFacilities.map((facility, idx) => (
                <Marker key={idx} position={[facility.lat, facility.lng]}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '220px' }}>
                      <strong>🏥 {facility.name}</strong>
                      <br />
                      Type: {facility.type}
                      <br />
                      Services: {facility.services}
                      <br />
                      Distance: {facility.distance}
                      <br />
                      📞 {facility.phone}
                      <br />
                      ⭐ {facility.rating}/5
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="map-placeholder">🏥 Loading map...</div>
          )}
        </div>

        <div className="details-section">
          <button className="emergency-btn" onClick={handleEmergency}>
            🚨 EMERGENCY CALL (112)
          </button>

          <div className="facility-card">
            <h3>🎯 Nearest Medical Facility</h3>
            <div className="facility-info">
              <strong>{nearestFacility.name}</strong>
              <div>📍 {nearestFacility.distance} away ({nearestFacility.time})</div>
              <div>🏥 {nearestFacility.type}</div>
              <div>{nearestFacility.services}</div>
              <div className="facility-rating">
                {'⭐'.repeat(Math.floor(nearestFacility.rating))} {nearestFacility.rating}/5
              </div>
              <div>📞 {nearestFacility.phone}</div>
            </div>
            <button className="get-directions-btn" onClick={() => window.open(`https://maps.google.com/?q=${nearestFacility.lat},${nearestFacility.lng}`, '_blank')}>
              📍 Get Directions
            </button>
          </div>

          <div className="symptoms-section">
            <div className="symptoms-title">📋 What Are You Experiencing?</div>
            <div className="symptom-grid">
              {symptomOptions.map((symptom) => (
                <button
                  key={symptom}
                  className={`symptom-btn ${symptoms.includes(symptom) ? 'selected' : ''}`}
                  onClick={() => handleSymptomToggle(symptom)}
                >
                  {symptom}
                </button>
              ))}
            </div>
            <button 
              className="report-btn"
              onClick={() => {
                if (symptoms.length > 0) {
                  alert(`✅ Report sent: ${symptoms.join(', ')}\n\nMedical team notified. Nearest facility: ${nearestFacility.name}`);
                } else {
                  alert('Please select at least one symptom');
                }
              }}
            >
              📤 Send Health Report
            </button>
          </div>

          <div className="other-facilities">
            <div className="other-facilities-title">📍 Other Facilities</div>
            {medicalFacilities.slice(1).map((facility, idx) => (
              <div key={idx} className="facility-item">
                <div className="facility-item-name">{facility.name}</div>
                <div className="facility-item-type">
                  {facility.type} • {facility.distance} • ⭐ {facility.rating}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
