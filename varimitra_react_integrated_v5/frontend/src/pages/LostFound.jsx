import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Clock3, RefreshCw, UserRoundSearch, X, MapPin, Activity, Inbox, Radio } from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatusPill from '../components/StatusPill';
import { LOST_API, getJson, postJson } from '../api';

export default function LostFound(){
  const [health,setHealth]=useState(null);
  const [cases,setCases]=useState([]);
  const [cameras,setCameras]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [sightings,setSightings]=useState([]);
  const [reports,setReports]=useState([]);
  const [msg,setMsg]=useState('');

  const load=async()=>{
    setHealth(await getJson(`${LOST_API}/health`));
    setCases(await getJson(`${LOST_API}/cases`,[]));
    setCameras(await getJson(`${LOST_API}/cameras`,[]));
    setAlerts(await getJson(`${LOST_API}/alerts?status=PENDING&limit=100`,[]));
    setSightings(await getJson(`${LOST_API}/sightings?limit=100`,[]));
    setReports(await getJson(`${LOST_API}/reports`,[]));
  };

  useEffect(()=>{ load(); const id=setInterval(load,2000); return()=>clearInterval(id); },[]);

  const review=async(id,action)=>{
    try{ await postJson(`${LOST_API}/alerts/${id}/${action}`); await load(); }
    catch(e){ setMsg(String(e)); }
  };

  const totalFaces=cameras.reduce((n,c)=>n+(Number(c.faces)||0),0);
  const totalMatched=cameras.reduce((n,c)=>n+(Number(c.matched_faces)||0),0);
  const byCase=useMemo(()=>{const m={}; sightings.forEach(s=>(m[s.case_id]??=[]).push(s));return m},[sightings]);

  return <AdminShell title="Lost & Found AI" subtitle="Automatic report intake · continuous CCTV recognition">
    <div className="module-toolbar">
      <div><h1><UserRoundSearch/> Lost Person Detection</h1><p>External report → automatic enrollment → continuous CCTV search → admin verification.</p></div>
      <div className="toolbar-actions"><StatusPill ok={!!health} label={health?'BACKEND READY':'BACKEND OFFLINE'}/><button className="secondary-btn" onClick={load}><RefreshCw size={15}/>Refresh</button></div>
    </div>

    <div className="overview-stats compact">
      <div><b>{cases.length}</b><span>Active Lost Cases</span></div>
      <div><b>{cameras.filter(c=>c.online).length}/{cameras.length}</b><span>Cameras Online</span></div>
      <div><b>{totalFaces}</b><span>Faces Detected Now</span></div>
      <div><b>{totalMatched}</b><span>Above Match Threshold</span></div>
      <div><b>{alerts.length}</b><span>Pending Confirmations</span></div>
    </div>

    <section className="panel">
      <div className="panel-title"><h2><Radio/> Live Recognition Cameras</h2><span>{cameras.length} registered feeds</span></div>
      <p className="form-hint" style={{marginBottom:12}}>Camera workers are started automatically by <code>start_all.ps1</code>. Local MP4 sources loop continuously; webcam/RTSP sources reconnect automatically.</p>
      <div className="camera-grid">
        {cameras.length ? cameras.map(c=><div className="camera-card" key={c.camera_id}>
          <div className="video-wrap">
            <img src={`${LOST_API}/cameras/${encodeURIComponent(c.camera_id)}/stream`} alt={c.camera_id}/>
            <div className="video-overlay"><StatusPill ok={!!c.online}/><span>{c.camera_id}</span></div>
          </div>
          <div className="camera-meta"><div><b>{c.camera_location||c.camera_id}</b><span>{c.camera_id}</span></div><div className="mini-stats"><span><b>{Number(c.fps||0).toFixed(1)}</b> FPS</span><span><b>{c.faces||0}</b> Detected</span><span><b>{c.matched_faces||0}</b> Matched</span></div></div>
          {!c.online && c.error && <p className="form-message">{c.error}</p>}
        </div>) : <Empty text="No camera workers have registered yet. Check the Lost Camera Worker terminal started by start_all.ps1."/>}
      </div>
    </section>

    <section className="panel">
      <div className="panel-title"><h2><Inbox/> Automatic Report Inbox</h2><span>{reports.length} received</span></div>
      <div className="explain-list" style={{marginBottom:14}}>
        <div><b>External endpoint</b><span><code>POST {LOST_API}/reports</code> — multipart fields: report_id, report_type, metadata, image. Nothing is entered manually on this admin page.</span></div>
        <div><b>Lost</b><span>Immediately becomes an ACTIVE face-search case. Already-running cameras pick it up on their next registry refresh.</span></div>
        <div><b>Found</b><span>Immediately compared with every active lost case and can create a candidate match.</span></div>
      </div>
      <div className="alert-grid">
        {reports.length ? reports.slice(0,12).map(r=><article className="match-card" key={`${r.report_type}-${r.report_id}`}>
          <div className="compare" style={{gridTemplateColumns:'1fr'}}><figure><img src={`${LOST_API}/reports/${r.report_type}/${encodeURIComponent(r.report_id)}/image`} alt={r.report_id}/><figcaption>{String(r.report_type||'').toUpperCase()} REPORT</figcaption></figure></div>
          <div className="match-info"><div><h3>{r.name||r.person_name||r.report_id}</h3><span className="similarity">{r.report_id}</span></div><p><MapPin size={14}/>{r.last_seen||r.last_seen_location||r.location||'Location not supplied'}</p><p><Clock3 size={14}/>{r.created_at ? new Date(r.created_at).toLocaleString() : 'Received'}</p></div>
        </article>) : <Empty text="No external Lost/Found reports received yet. When your reporting website POSTs /reports, they appear here automatically."/>}
      </div>
      {msg&&<p className="form-message">{msg}</p>}
    </section>

    <section className="panel"><div className="panel-title"><h2>Candidate Matches</h2><span>{alerts.length} pending</span></div><div className="alert-grid">{alerts.length?alerts.map(a=><article className="match-card" key={a.alert_id}><div className="compare"><figure><img src={`${LOST_API}/cases/${encodeURIComponent(a.case_id)}/reference`} alt="Reference"/><figcaption>Lost Reference</figcaption></figure><div className="vs">VS</div><figure><img src={`${LOST_API}/alerts/${a.alert_id}/evidence`} alt="CCTV evidence"/><figcaption>CCTV Evidence</figcaption></figure></div><div className="match-info"><div><h3>{a.name}</h3><span className="similarity">{(Number(a.similarity)*100).toFixed(1)}% similarity</span></div><p><MapPin size={14}/>{a.camera_location} · {a.camera_id} · Track {a.track_id}</p><p><Clock3 size={14}/>{new Date(a.timestamp).toLocaleString()}</p></div><div className="match-actions"><button className="confirm" onClick={()=>review(a.alert_id,'confirm')}><Check size={16}/>Confirm Match</button><button className="reject" onClick={()=>review(a.alert_id,'reject')}><X size={16}/>Reject</button></div></article>):<Empty text="No candidate matches waiting for verification."/>}</div></section>

    <section className="panel"><div className="panel-title"><h2><Activity/> Cross-Camera Sighting History</h2></div><div className="timeline-list">{Object.entries(byCase).slice(0,8).map(([caseId,rows])=><div className="timeline-case" key={caseId}><b>{rows[0]?.name||caseId}</b><div>{rows.slice(0,8).map((s,i)=><span key={s.sighting_id||i}>{s.camera_location}<small>{Number(s.similarity).toFixed(3)}</small></span>)}</div></div>)}{!sightings.length&&<Empty text="Sightings will appear after candidate alerts are created."/>}</div></section>
  </AdminShell>;
}

function Empty({text}){ return <div className="empty-state">{text}</div>; }
