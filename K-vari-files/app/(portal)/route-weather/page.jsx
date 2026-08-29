'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const useMap = dynamic(() => import('react-leaflet').then(mod => mod.useMap), { ssr: false });

function RouteMapFocus({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof map.fitBounds !== 'function') return;
    if (!Array.isArray(points) || points.length === 0) return;

    const validPoints = points.filter(([lat, lng]) =>
      Number.isFinite(lat) && Number.isFinite(lng)
    );

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      map.setView(validPoints[0], 11);
      return;
    }

    map.fitBounds(validPoints, { padding: [35, 35], maxZoom: 11 });
  }, [map, points]);

  return null;
}

export default function RouteWeatherPage() {
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);

  // Stage coordinates (Pandharpur Wari route - actual coordinates)
  const stages = [
    { 
      name: 'Pandharpur', 
      lat: 18.6489, 
      lng: 75.3268, 
      distance: '0 km', 
      time: 'Start', 
      temp: '32°C', 
      weather: '☀️ Sunny', 
      facilities: 'Main Temple',
      weatherSeverity: 'clear'
    },
    { 
      name: 'Indapur', 
      lat: 18.7721, 
      lng: 75.1289, 
      distance: '28 km', 
      time: '6-7 hrs', 
      temp: '32°C', 
      weather: '☀️ Sunny', 
      facilities: 'Water stations, Medical camps',
      weatherSeverity: 'clear'
    },
    { 
      name: 'Saswad', 
      lat: 18.8321, 
      lng: 75.0521, 
      distance: '24 km', 
      time: '5-6 hrs', 
      temp: '31°C', 
      weather: '⛅ Partly Cloudy', 
      facilities: 'Food stalls, Rest areas',
      weatherSeverity: 'moderate'
    },
    { 
      name: 'Lonand', 
      lat: 18.8921, 
      lng: 74.9521, 
      distance: '22 km', 
      time: '5 hrs', 
      temp: '30°C', 
      weather: '⛈️ Possible Showers', 
      facilities: 'Shelter, Medical',
      weatherSeverity: 'severe'
    },
  ];

  // Medical centers along the route
  const medicalCenters = [
    { name: 'Pandharpur Primary Health Center', lat: 18.6489, lng: 75.3268, type: 'Hospital', services: 'Full medical facilities, 24/7' },
    { name: 'Indapur Medical Camp', lat: 18.7721, lng: 75.1289, type: 'Camp', services: 'First aid, ORS, Basic treatment' },
    { name: 'Saswad Health Post', lat: 18.8321, lng: 75.0521, type: 'Health Post', services: 'Medical checkup, Bandaging' },
    { name: 'Lonand Emergency Center', lat: 18.8921, lng: 74.9521, type: 'Emergency', services: '24/7 Emergency support' },
  ];

  useEffect(() => {
    setMapReady(true);
  }, []);

  // Route path and nearby route focus
  const routePath = stages.map(s => [s.lat, s.lng]);
  const routeFocusPoints = [...routePath, ...medicalCenters.map(item => [item.lat, item.lng])];

  // Get color based on weather severity
  const getWeatherColor = (severity) => {
    switch(severity) {
      case 'clear': return '#10B981'; // Green
      case 'moderate': return '#F59E0B'; // Amber
      case 'severe': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  };

  const getMarkerIcon = (type) => {
    if (type === 'medical') {
      return '🏥';
    }
    return '📍';
  };

  return (
    <div className="vm-route-weather" style={{ maxWidth: '100%', margin: '0', padding: '0', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <style>{`
        .vm-route-weather {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .route-header {
          padding: 20px;
          background: white;
          border-bottom: 1px solid #E5E7EB;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .route-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .map-container-wrapper {
          flex: 1;
          display: flex;
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
          background: linear-gradient(135deg, #E8F4F8 0%, #F0E8F8 100%);
        }
        .map-placeholder i {
          font-size: 64px;
          opacity: 0.3;
          margin-right: 16px;
        }
        .legend-section {
          width: 280px;
          background: white;
          border-left: 1px solid #E5E7EB;
          overflow-y: auto;
          padding: 20px;
        }
        .legend-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #1F2937;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        .legend-marker {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
        }
        .stage-item {
          padding: 12px;
          background: #F9FAFB;
          border-radius: 6px;
          margin-bottom: 10px;
          border-left: 4px solid;
          cursor: pointer;
          transition: all 0.2s;
        }
        .stage-item:hover {
          background: #F3F4F6;
          transform: translateX(4px);
        }
        .stage-item.clear {
          border-left-color: #10B981;
        }
        .stage-item.moderate {
          border-left-color: #F59E0B;
        }
        .stage-item.severe {
          border-left-color: #EF4444;
        }
        .stage-name {
          font-weight: 600;
          color: #1F2937;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .stage-info {
          font-size: 12px;
          color: #6B7280;
          display: flex;
          justify-content: space-between;
        }
        .medical-title {
          font-size: 14px;
          font-weight: 700;
          margin-top: 20px;
          margin-bottom: 12px;
          color: #1F2937;
          border-top: 1px solid #E5E7EB;
          padding-top: 12px;
        }
        .medical-item {
          padding: 10px;
          background: #FEF3E2;
          border-radius: 6px;
          margin-bottom: 8px;
          border-left: 4px solid #E8630C;
          font-size: 12px;
        }
        .medical-item-name {
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 2px;
        }
        .medical-item-type {
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
        ::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>

      <div className="route-header">
        <div>
          <h1>🗺️ Route & Weather Updates with Live Map</h1>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '13px' }}>
            Click on stages to see details • Medical centers marked with 🏥
          </p>
        </div>
        <button 
          onClick={() => router.back()} 
          style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          ← Back
        </button>
      </div>

      <div className="map-container-wrapper">
        <div className="map-section">
          {mapReady ? (
            <MapContainer
              key="route-weather-map"
              style={{ width: '100%', height: '100%' }}
              bounds={routeFocusPoints}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <RouteMapFocus points={routeFocusPoints} />
              
              {/* Route polyline */}
              <Polyline positions={routePath} color="#3B82F6" weight={3} opacity={0.7} />
              
              {/* Stage markers */}
              {stages.map((stage, idx) => (
                <Marker key={`stage-${idx}`} position={[stage.lat, stage.lng]}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '200px' }}>
                      <strong>{stage.name}</strong>
                      <br />
                      {stage.weather}
                      <br />
                      Temperature: {stage.temp}
                      <br />
                      Facilities: {stage.facilities}
                    </div>
                  </Popup>
                </Marker>
              ))}
              
              {/* Medical centers */}
              {medicalCenters.map((center, idx) => (
                <Marker key={`medical-${idx}`} position={[center.lat, center.lng]}>
                  <Popup>
                    <div style={{ fontSize: '12px', minWidth: '200px' }}>
                      <strong>🏥 {center.name}</strong>
                      <br />
                      Type: {center.type}
                      <br />
                      Services: {center.services}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="map-placeholder">
              <i className="fa-solid fa-map"></i>
              <div>Loading interactive map...</div>
            </div>
          )}
        </div>

        {/* Legend and details panel */}
        <div className="legend-section">
          <div className="legend-title">📍 Weather Legend</div>
          
          <div className="legend-item">
            <div className="legend-marker" style={{ background: '#10B981' }}>✓</div>
            <span>Clear / Safe</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker" style={{ background: '#F59E0B' }}>!</div>
            <span>Caution / Cloudy</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker" style={{ background: '#EF4444' }}>⚠</div>
            <span>Severe / Storm Risk</span>
          </div>
          
          <div className="legend-item">
            <div className="legend-marker" style={{ background: '#E8630C' }}>🏥</div>
            <span>Medical Center</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker" style={{ background: '#3B82F6' }}>━</div>
            <span>Route Path</span>
          </div>

          <div className="legend-title">📍 Route Stages</div>
          {stages.map((stage, idx) => (
            <div key={idx} className={`stage-item ${stage.weatherSeverity}`}>
              <div className="stage-name">{stage.name}</div>
              <div className="stage-info">
                <span>{stage.distance}</span>
                <span>{stage.temp}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                {stage.weather}
              </div>
            </div>
          ))}

          <div className="medical-title">🏥 Medical Centers</div>
          {medicalCenters.map((center, idx) => (
            <div key={idx} className="medical-item">
              <div className="medical-item-name">{center.name}</div>
              <div className="medical-item-type">
                {center.type} • {center.services}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
