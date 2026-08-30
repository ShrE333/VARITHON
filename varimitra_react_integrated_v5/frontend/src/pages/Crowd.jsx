import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Camera, Pause, Play, RefreshCw, Users } from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatusPill from '../components/StatusPill';
import { CROWD_API, getJson } from '../api';

const levelColor = { LOW: '#1F9D55', MODERATE: '#E0A825', HIGH: '#E8630C', CRITICAL: '#D64545' };

export default function Crowd() {
  const [health, setHealth] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [zones, setZones] = useState([]);
  const [tick, setTick] = useState(Date.now());
  const [allStreamsActive, setAllStreamsActive] = useState(true);
  const [pausedCameras, setPausedCameras] = useState({});

  const load = async () => {
    setHealth(await getJson(`${CROWD_API}/health`));
    setCameras(await getJson(`${CROWD_API}/cameras`, []));
    setZones(await getJson(`${CROWD_API}/zones`, []));
    setTick(Date.now());
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 1800);
    return () => clearInterval(id);
  }, []);

  const toggleAllStreams = () => {
    const nextState = !allStreamsActive;
    setAllStreamsActive(nextState);
    const updated = {};
    cameras.forEach(c => {
      updated[c.camera_id] = !nextState;
    });
    setPausedCameras(updated);
  };

  const toggleCameraStream = (cameraId) => {
    setPausedCameras(prev => ({
      ...prev,
      [cameraId]: !prev[cameraId]
    }));
  };

  const isCameraStreaming = (cameraId) => {
    if (!allStreamsActive) return false;
    return !pausedCameras[cameraId];
  };

  const people = cameras.reduce((n, c) => n + (Number(c.detected_people) || 0), 0);
  const risk = zones.filter(z => ['HIGH', 'CRITICAL'].includes(z.level)).length;

  return (
    <AdminShell title="Crowd Congestion AI" subtitle="4-camera people detection · tracking · temple heatmap">
      <div className="module-toolbar">
        <div>
          <h1>
            <Users /> Crowd Command Center
          </h1>
          <p>YOLO person detection + ByteTrack + camera-to-temple zone projection.</p>
        </div>
        <div className="toolbar-actions">
          <StatusPill ok={!!health} label={health ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'} />
          <button className="secondary-btn" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      <div className="overview-stats compact">
        <div>
          <b>
            {cameras.filter(c => c.online).length}/{cameras.length}
          </b>
          <span>Cameras Online</span>
        </div>
        <div>
          <b>{people}</b>
          <span>People Across Feeds</span>
        </div>
        <div>
          <b>{zones.length}</b>
          <span>Mapped Zones</span>
        </div>
        <div>
          <b>{risk}</b>
          <span>High / Critical Zones</span>
        </div>
      </div>

      <section className="panel">
        <div className="panel-title">
          <h2>
            <Camera /> Live Crowd Feeds
          </h2>
          <div className="panel-actions">
            <span>processed AI frames</span>
            <button
              className={`stream-master-btn ${allStreamsActive ? 'active' : 'paused'}`}
              onClick={toggleAllStreams}
            >
              {allStreamsActive ? <Pause size={14} /> : <Play size={14} />}
              {allStreamsActive ? 'Pause All Camera Streams' : 'Resume All Camera Streams'}
            </button>
          </div>
        </div>

        <div className="camera-grid">
          {cameras.map(c => {
            const streaming = isCameraStreaming(c.camera_id);
            return (
              <div className={`camera-card ${!streaming ? 'paused-card' : ''}`} key={c.camera_id}>
                <div className="video-wrap">
                  {streaming ? (
                    <img
                      src={`${CROWD_API}/cameras/${encodeURIComponent(c.camera_id)}/stream`}
                      alt={c.camera_id}
                    />
                  ) : (
                    <div className="stream-paused-overlay">
                      <Pause size={32} />
                      <b>Stream Paused</b>
                      <span>Click Start Stream to resume</span>
                    </div>
                  )}
                  <div className="video-overlay">
                    <StatusPill ok={!!c.online && streaming} label={c.online ? (streaming ? 'LIVE' : 'PAUSED') : 'OFFLINE'} />
                    <span>{c.camera_id}</span>
                  </div>
                </div>

                <div className="camera-meta">
                  <div>
                    <b>{c.location || c.camera_id}</b>
                    <span>{c.camera_id}</span>
                  </div>
                  <div className="mini-stats">
                    <span>
                      <b>{Number(c.fps || 0).toFixed(1)}</b> FPS
                    </span>
                    <span>
                      <b>{c.detected_people || 0}</b> People
                    </span>
                  </div>
                </div>

                <div className="camera-actions-bar">
                  <button
                    className={`btn-stream-toggle ${streaming ? 'pause' : 'play'}`}
                    onClick={() => toggleCameraStream(c.camera_id)}
                  >
                    {streaming ? <Pause size={14} /> : <Play size={14} />}
                    {streaming ? 'Stop Stream' : 'Start Stream'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="crowd-layout">
        <section className="panel heatmap-panel">
          <div className="panel-title">
            <h2>Temple Congestion Heatmap</h2>
            <span>Live zone occupancy</span>
          </div>
          <TempleMap zones={zones} />
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>
              <Activity /> Zone Status
            </h2>
          </div>
          <div className="zone-list">
            {zones.map(z => (
              <div className="zone-row" key={z.zone_id}>
                <div className="zone-level" style={{ background: levelColor[z.level] || '#888' }}></div>
                <div>
                  <b>{z.name || z.zone_name}</b>
                  <span>
                    {z.people_count || 0} / {z.capacity} people
                  </span>
                </div>
                <div className="zone-right">
                  <b>{Math.round((Number(z.occupancy) || 0) * 100)}%</b>
                  <span style={{ color: levelColor[z.level] }}>{z.level || 'LOW'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function TempleMap({ zones }) {
  const gradients = useMemo(
    () => zones.map((z, i) => ({ id: `g${i}`, color: levelColor[z.level] || '#1F9D55' })),
    [zones]
  );
  return (
    <div className="temple-map">
      <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
        <defs>
          {gradients.map(g => (
            <radialGradient key={g.id} id={g.id}>
              <stop offset="0%" stopColor={g.color} stopOpacity=".72" />
              <stop offset="60%" stopColor={g.color} stopOpacity=".26" />
              <stop offset="100%" stopColor={g.color} stopOpacity=".05" />
            </radialGradient>
          ))}
        </defs>
        <rect width="1000" height="700" rx="28" fill="#f4ede3" />
        {zones.map((z, i) => {
          const pts = z.polygon || [];
          const xs = pts.map(p => p[0]),
            ys = pts.map(p => p[1]);
          const minX = Math.min(...xs),
            maxX = Math.max(...xs),
            minY = Math.min(...ys),
            maxY = Math.max(...ys);
          const cx = (minX + maxX) / 2,
            cy = (minY + maxY) / 2;
          return (
            <g key={z.zone_id}>
              <polygon
                points={pts.map(p => p.join(',')).join(' ')}
                fill={`url(#g${i})`}
                stroke={levelColor[z.level] || '#a88'}
                strokeWidth="4"
              />
              <circle cx={cx} cy={cy} r="72" fill={`url(#g${i})`} />
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize="25" fontWeight="800" fill="#2B2320">
                {z.name || z.zone_name}
              </text>
              <text x={cx} y={cy + 26} textAnchor="middle" fontSize="20" fontWeight="700" fill={levelColor[z.level] || '#555'}>
                {Math.round((Number(z.occupancy) || 0) * 100)}% · {z.people_count || 0}/{z.capacity}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        {Object.entries(levelColor).map(([k, v]) => (
          <span key={k}>
            <i style={{ background: v }}></i>
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

