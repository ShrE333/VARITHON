import React, { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Clock3,
  RefreshCw,
  UserRoundSearch,
  X,
  MapPin,
  Activity,
  Inbox,
  Radio,
  Play,
  Pause,
  Phone,
  CheckCircle2,
  Trash2,
  AlertCircle,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatusPill from '../components/StatusPill';
import { LOST_API, getJson, postJson } from '../api';

export default function LostFound() {
  const [health, setHealth] = useState(null);
  const [cases, setCases] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [reports, setReports] = useState([]);
  const [msg, setMsg] = useState('');
  const [reportFilter, setReportFilter] = useState('active'); // 'active' | 'resolved' | 'all'
  const [allStreamsActive, setAllStreamsActive] = useState(true);
  const [pausedCameras, setPausedCameras] = useState({});

  const load = async () => {
    setHealth(await getJson(`${LOST_API}/health`));
    setCases(await getJson(`${LOST_API}/cases`, []));
    setCameras(await getJson(`${LOST_API}/cameras`, []));
    setAlerts(await getJson(`${LOST_API}/alerts?status=PENDING&limit=100`, []));
    setSightings(await getJson(`${LOST_API}/sightings?limit=100`, []));
    setReports(await getJson(`${LOST_API}/reports?include_resolved=true`, []));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, []);

  const review = async (id, action) => {
    try {
      await postJson(`${LOST_API}/alerts/${id}/${action}`);
      if (action === 'confirm') {
        setMsg('Match confirmed! Person marked as FOUND and removed from active reports.');
      } else {
        setMsg('Candidate match rejected.');
      }
      await load();
    } catch (e) {
      setMsg(String(e));
    }
  };

  const resolveReport = async (reportType, reportId) => {
    try {
      await postJson(`${LOST_API}/reports/${reportType}/${reportId}/resolve`);
      setMsg(`Report ${reportId} marked as RESOLVED and removed from active report inbox.`);
      await load();
    } catch (e) {
      setMsg(`Failed to resolve report: ${e}`);
    }
  };

  const deleteReport = async (reportType, reportId) => {
    if (!window.confirm(`Are you sure you want to delete report ${reportId}?`)) return;
    try {
      const res = await fetch(`${LOST_API}/reports/${reportType}/${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        setMsg(`Report ${reportId} deleted successfully.`);
        await load();
      } else {
        throw new Error(await res.text());
      }
    } catch (e) {
      setMsg(`Failed to delete report: ${e}`);
    }
  };

  const closeCase = async (caseId) => {
    try {
      await postJson(`${LOST_API}/cases/${caseId}/close`);
      setMsg(`Case ${caseId} closed successfully.`);
      await load();
    } catch (e) {
      setMsg(`Failed to close case: ${e}`);
    }
  };

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

  const totalFaces = cameras.reduce((n, c) => n + (Number(c.faces) || 0), 0);
  const totalMatched = cameras.reduce((n, c) => n + (Number(c.matched_faces) || 0), 0);
  const byCase = useMemo(() => {
    const m = {};
    sightings.forEach(s => (m[s.case_id] ??= []).push(s));
    return m;
  }, [sightings]);

  const activeReports = useMemo(() => reports.filter(r => r.status !== 'RESOLVED'), [reports]);
  const resolvedReports = useMemo(() => reports.filter(r => r.status === 'RESOLVED'), [reports]);

  const filteredReports = useMemo(() => {
    if (reportFilter === 'active') return activeReports;
    if (reportFilter === 'resolved') return resolvedReports;
    return reports;
  }, [reportFilter, activeReports, resolvedReports, reports]);

  return (
    <AdminShell title="Lost & Found AI" subtitle="Automatic report intake · continuous CCTV recognition">
      {/* Top Header Toolbar */}
      <div className="module-toolbar">
        <div>
          <h1>
            <UserRoundSearch /> Lost Person Detection Command
          </h1>
          <p>Automated Intake → Instant AI CCTV Recognition → Live Verification & Resolution</p>
        </div>
        <div className="toolbar-actions">
          <StatusPill ok={!!health} label={health ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'} />
          <button className="secondary-btn" onClick={load}>
            <RefreshCw size={15} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="overview-stats compact">
        <div>
          <b>{cases.length}</b>
          <span>Active CCTV Search Cases</span>
        </div>
        <div>
          <b>{activeReports.length}</b>
          <span>Active Report Inbox</span>
        </div>
        <div>
          <b>{cameras.filter(c => c.online).length}/{cameras.length}</b>
          <span>Cameras Streaming</span>
        </div>
        <div>
          <b>{alerts.length}</b>
          <span>Pending Verification</span>
        </div>
        <div>
          <b>{resolvedReports.length}</b>
          <span>Persons Found & Resolved</span>
        </div>
      </div>

      {/* Notification Message Banner */}
      {msg && (
        <div className="notification-banner">
          <span>{msg}</span>
          <button onClick={() => setMsg('')}><X size={14} /></button>
        </div>
      )}

      {/* SECTION 1: Live Recognition Cameras with Stream Toggles */}
      <section className="panel">
        <div className="panel-title">
          <h2>
            <Radio /> Live CCTV Recognition Stream Feeds
          </h2>
          <div className="panel-actions">
            <span>{cameras.length} camera workers registered</span>
            <button
              className={`stream-master-btn ${allStreamsActive ? 'active' : 'paused'}`}
              onClick={toggleAllStreams}
            >
              {allStreamsActive ? <Pause size={14} /> : <Play size={14} />}
              {allStreamsActive ? 'Pause All Camera Streams' : 'Resume All Camera Streams'}
            </button>
          </div>
        </div>

        <p className="form-hint" style={{ marginBottom: 14 }}>
          CCTV workers continuously run face detection against active lost cases. Use the stream toggle on any camera card to pause or start video streaming anytime.
        </p>

        <div className="camera-grid">
          {cameras.length ? (
            cameras.map(c => {
              const streaming = isCameraStreaming(c.camera_id);
              return (
                <div className={`camera-card ${!streaming ? 'paused-card' : ''}`} key={c.camera_id}>
                  <div className="video-wrap">
                    {streaming ? (
                      <img
                        src={`${LOST_API}/cameras/${encodeURIComponent(c.camera_id)}/stream`}
                        alt={c.camera_id}
                        onError={e => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="stream-paused-overlay">
                        <Pause size={32} />
                        <b>Stream Paused</b>
                        <span>Click Start Stream below to resume feed</span>
                      </div>
                    )}
                    <div className="video-overlay">
                      <StatusPill ok={!!c.online && streaming} label={c.online ? (streaming ? 'LIVE' : 'PAUSED') : 'OFFLINE'} />
                      <span>{c.camera_id}</span>
                    </div>
                  </div>

                  <div className="camera-meta">
                    <div>
                      <b>{c.camera_location || c.camera_id}</b>
                      <span>{c.camera_id}</span>
                    </div>
                    <div className="mini-stats">
                      <span>
                        <b>{Number(c.fps || 0).toFixed(1)}</b> FPS
                      </span>
                      <span>
                        <b>{c.faces || 0}</b> Detected
                      </span>
                      <span>
                        <b>{c.matched_faces || 0}</b> Matches
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

                  {!c.online && c.error && <p className="form-message">{c.error}</p>}
                </div>
              );
            })
          ) : (
            <Empty text="No CCTV camera workers currently registered. Start the lost camera workers to stream feeds." />
          )}
        </div>
      </section>

      {/* SECTION 2: Pending Candidate Matches Verification */}
      <section className="panel alerts-panel">
        <div className="panel-title">
          <h2>
            <UserCheck /> Pending Candidate Verification Matches
          </h2>
          <span className="badge-count">{alerts.length} pending review</span>
        </div>

        <div className="alert-grid">
          {alerts.length ? (
            alerts.map(a => (
              <article className="match-card highlighted-match" key={a.alert_id}>
                <div className="match-card-header">
                  <span className="similarity-badge">
                    {(Number(a.similarity) * 100).toFixed(1)}% Match Confidence
                  </span>
                  <span className="alert-time">
                    <Clock3 size={13} /> {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="compare">
                  <figure>
                    <img
                      src={`${LOST_API}/cases/${encodeURIComponent(a.case_id)}/reference`}
                      alt="Reference"
                    />
                    <figcaption>Lost Reference Photo</figcaption>
                  </figure>
                  <div className="vs">VS</div>
                  <figure>
                    <img src={`${LOST_API}/alerts/${a.alert_id}/evidence`} alt="CCTV evidence" />
                    <figcaption>CCTV Match Evidence</figcaption>
                  </figure>
                </div>

                <div className="match-info">
                  <h3>{a.name}</h3>
                  <p>
                    <MapPin size={14} /> {a.camera_location} ({a.camera_id}) · Track ID #{a.track_id}
                  </p>
                </div>

                <div className="match-actions">
                  <button className="confirm-btn" onClick={() => review(a.alert_id, 'confirm')}>
                    <CheckCircle2 size={16} /> Confirm Match & Remove Person
                  </button>
                  <button className="reject-btn" onClick={() => review(a.alert_id, 'reject')}>
                    <X size={16} /> Reject
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty text="No candidate matches waiting for admin verification at this moment." />
          )}
        </div>
      </section>

      {/* SECTION 3: Automatic Report Inbox with Resolution & Removal */}
      <section className="panel">
        <div className="panel-title">
          <h2>
            <Inbox /> External Report Inbox (WhatsApp / CSP API Intake)
          </h2>
          <div className="tab-filters">
            <button
              className={reportFilter === 'active' ? 'active' : ''}
              onClick={() => setReportFilter('active')}
            >
              Active Reports ({activeReports.length})
            </button>
            <button
              className={reportFilter === 'resolved' ? 'active' : ''}
              onClick={() => setReportFilter('resolved')}
            >
              Resolved / Found ({resolvedReports.length})
            </button>
            <button
              className={reportFilter === 'all' ? 'active' : ''}
              onClick={() => setReportFilter('all')}
            >
              All ({reports.length})
            </button>
          </div>
        </div>

        <div className="explain-list" style={{ marginBottom: 16 }}>
          <div>
            <b>External API Endpoint: <code>POST {LOST_API}/reports</code></b>
            <span>Receives reports directly from CSP / WhatsApp bot / External Mobile Apps with <code>report_id</code>, <code>report_type</code> (lost/found), <code>metadata</code>, and <code>image</code>.</span>
          </div>
        </div>

        <div className="report-cards-grid">
          {filteredReports.length ? (
            filteredReports.map(r => {
              const isResolved = r.status === 'RESOLVED';
              return (
                <article
                  className={`report-card ${isResolved ? 'resolved-card' : ''}`}
                  key={`${r.report_type}-${r.report_id}`}
                >
                  <div className="report-card-image-wrap">
                    <img
                      src={`${LOST_API}/reports/${r.report_type}/${encodeURIComponent(r.report_id)}/image`}
                      alt={r.report_id}
                    />
                    <div className="report-type-badge">
                      <span className={`tag ${r.report_type}`}>{String(r.report_type).toUpperCase()}</span>
                      <span className={`tag-status ${isResolved ? 'resolved' : 'active'}`}>
                        {isResolved ? 'PERSON FOUND' : 'ACTIVE SEARCH'}
                      </span>
                    </div>
                  </div>

                  <div className="report-card-body">
                    <h3>{r.name || r.person_name || r.report_id}</h3>
                    <div className="report-meta-row">
                      <span className="meta-item">
                        <MapPin size={13} /> {r.last_seen || r.last_seen_location || r.location || 'Location not specified'}
                      </span>
                      {r.reporter_contact && (
                        <span className="meta-item">
                          <Phone size={13} /> Contact: {r.reporter_contact}
                        </span>
                      )}
                      <span className="meta-item">
                        <Clock3 size={13} /> {r.created_at ? new Date(r.created_at).toLocaleString() : 'Received'}
                      </span>
                    </div>

                    <div className="report-card-actions">
                      {!isResolved ? (
                        <button
                          className="resolve-btn"
                          onClick={() => resolveReport(r.report_type, r.report_id)}
                        >
                          <CheckCircle2 size={15} /> Mark Person Found & Remove
                        </button>
                      ) : (
                        <span className="found-pill">
                          <ShieldCheck size={14} /> Resolved & Marked Found
                        </span>
                      )}
                      <button
                        className="delete-icon-btn"
                        title="Delete Report"
                        onClick={() => deleteReport(r.report_type, r.report_id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <Empty text="No reports found matching the selected filter." />
          )}
        </div>
      </section>

      {/* SECTION 4: Active CCTV Search Cases Registry */}
      <section className="panel">
        <div className="panel-title">
          <h2>
            <UserRoundSearch /> Active CCTV Search Registry
          </h2>
          <span>{cases.length} active face-recognition cases</span>
        </div>

        <div className="cases-grid">
          {cases.length ? (
            cases.map(c => (
              <div className="case-registry-card" key={c.case_id}>
                <div className="case-img-wrap">
                  <img src={`${LOST_API}/cases/${encodeURIComponent(c.case_id)}/reference`} alt={c.case_id} />
                </div>
                <div className="case-details">
                  <h4>{c.name || c.case_id}</h4>
                  <p><MapPin size={12} /> {c.last_seen || 'Unknown location'}</p>
                  {c.reporter_contact && <p><Phone size={12} /> {c.reporter_contact}</p>}
                  <button className="close-case-btn" onClick={() => closeCase(c.case_id)}>
                    <Check size={14} /> Resolve & Close Case
                  </button>
                </div>
              </div>
            ))
          ) : (
            <Empty text="No active search cases in the CCTV registry." />
          )}
        </div>
      </section>

      {/* SECTION 5: Cross-Camera Sighting History */}
      <section className="panel">
        <div className="panel-title">
          <h2>
            <Activity /> Cross-Camera Sighting History
          </h2>
        </div>
        <div className="timeline-list">
          {Object.entries(byCase).slice(0, 8).map(([caseId, rows]) => (
            <div className="timeline-case" key={caseId}>
              <b>{rows[0]?.name || caseId}</b>
              <div>
                {rows.slice(0, 8).map((s, i) => (
                  <span key={s.sighting_id || i}>
                    {s.camera_location} <small>{Number(s.similarity).toFixed(3)}</small>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!sightings.length && <Empty text="Sightings will appear automatically as AI cameras detect matches." />}
        </div>
      </section>
    </AdminShell>
  );
}

function Empty({ text }) {
  return <div className="empty-state">{text}</div>;
}

