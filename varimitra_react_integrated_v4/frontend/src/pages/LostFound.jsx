import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Clock3, RefreshCw, UserRoundSearch, X, MapPin, Activity, HardDriveUpload } from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatusPill from '../components/StatusPill';
import { LOST_API, getJson, postJson } from '../api';

export default function LostFound(){
  const [health,setHealth]=useState(null),[cases,setCases]=useState([]),[cameras,setCameras]=useState([]),[alerts,setAlerts]=useState([]),[sightings,setSightings]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
  const load=async()=>{setHealth(await getJson(`${LOST_API}/health`));setCases(await getJson(`${LOST_API}/cases`,[]));setCameras(await getJson(`${LOST_API}/cameras`,[]));setAlerts(await getJson(`${LOST_API}/alerts?status=PENDING&limit=100`,[]));setSightings(await getJson(`${LOST_API}/sightings?limit=100`,[]));};
  useEffect(()=>{load();const id=setInterval(load,2500);return()=>clearInterval(id)},[]);
  const createCase=async(e)=>{e.preventDefault();setBusy(true);setMsg('');const fd=new FormData(e.currentTarget);try{const r=await fetch(`${LOST_API}/cases`,{method:'POST',body:fd});if(!r.ok)throw new Error(await r.text());setMsg('Missing-person case created. Camera workers refresh active cases automatically.');e.currentTarget.reset();await load();}catch(err){setMsg(`Could not create case: ${err.message}`)}finally{setBusy(false)}};

  const ingestReport=async(e)=>{
    e.preventDefault();
    setBusy(true); setMsg('');
    const form=e.currentTarget;
    const fd=new FormData(form);
    const metadata={
      name: fd.get('person_name')||'',
      age: fd.get('age')||'',
      last_seen: fd.get('last_seen')||'',
      reporter_contact: fd.get('reporter_contact')||''
    };
    fd.delete('person_name'); fd.delete('age'); fd.delete('last_seen'); fd.delete('reporter_contact');
    fd.set('metadata',JSON.stringify(metadata));
    try{
      const r=await fetch(`${LOST_API}/reports`,{method:'POST',body:fd});
      const body=await r.json().catch(()=>({detail:'Unknown server response'}));
      if(!r.ok)throw new Error(body.detail||JSON.stringify(body));
      if(body.report_type==='lost')setMsg(`Lost report ${body.report_id} stored locally and activated for continuous CCTV search. No camera restart required.`);
      else setMsg(`Found report ${body.report_id} stored locally. ${body.candidate_lost_matches?.length||0} candidate lost-case match(es) found.`);
      form.reset(); await load();
    }catch(err){setMsg(`Could not receive report: ${err.message}`)}finally{setBusy(false)}
  };
  const review=async(id,action)=>{try{await postJson(`${LOST_API}/alerts/${id}/${action}`);await load();}catch(e){setMsg(String(e))}};
  const totalFaces=cameras.reduce((n,c)=>n+(Number(c.faces)||0),0), totalMatched=cameras.reduce((n,c)=>n+(Number(c.matched_faces)||0),0);
  const byCase=useMemo(()=>{const m={}; sightings.forEach(s=>(m[s.case_id]??=[]).push(s));return m},[sightings]);
  return <AdminShell title="Lost & Found AI" subtitle="Single-photo face recognition · local InsightFace mode">
    <div className="module-toolbar"><div><h1><UserRoundSearch/> Lost Person Detection</h1><p>Reference enrollment → CCTV recognition → temporal confirmation → admin verification.</p></div><div className="toolbar-actions"><StatusPill ok={!!health} label={health?'BACKEND READY':'BACKEND OFFLINE'}/><button className="secondary-btn" onClick={load}><RefreshCw size={15}/>Refresh</button></div></div>
    <div className="overview-stats compact"><div><b>{cases.length}</b><span>Active Cases</span></div><div><b>{cameras.filter(c=>c.online).length}/{cameras.length}</b><span>Cameras Online</span></div><div><b>{totalFaces}</b><span>Faces Detected Now</span></div><div><b>{totalMatched}</b><span>Above Match Threshold</span></div><div><b>{alerts.length}</b><span>Pending Confirmations</span></div></div>
    <div className="two-col">
      <section className="panel">
        <div className="panel-title"><h2><HardDriveUpload/> Local Report Intake</h2><span>multipart /reports</span></div>
        <form className="case-form" onSubmit={ingestReport}>
          <div className="form-grid">
            <label>Report ID<input name="report_id" placeholder="LF-20260829-D69ED1AF" required/></label>
            <label>Report type<select name="report_type" defaultValue="lost"><option value="lost">Lost</option><option value="found">Found</option></select></label>
            <label>Person name<input name="person_name" placeholder="Name"/></label>
            <label>Age<input name="age" placeholder="Age"/></label>
            <label>Last seen / found at<input name="last_seen" placeholder="North Gate"/></label>
            <label>Reporter contact<input name="reporter_contact" placeholder="Mobile number"/></label>
          </div>
          <label>Report image<input type="file" name="image" accept="image/*" required/></label>
          <p className="form-hint">Your external website can POST the same multipart fields directly to <code>/reports</code>. The backend stores the files locally and starts AI processing automatically.</p>
          <button className="primary-btn" disabled={busy}>{busy?'Processing report…':'Submit Report'}</button>
          {msg&&<p className="form-message">{msg}</p>}
        </form>
      </section>
      <section className="panel"><div className="panel-title"><h2><Activity/> Automated behavior</h2></div><div className="explain-list"><div><b>Lost report</b><span>Image is stored locally, enrolled, and becomes an ACTIVE CCTV case. Running cameras discover it automatically.</span></div><div><b>Found report</b><span>Image is stored locally and compared immediately against every active lost-person case.</span></div><div><b>Cameras</b><span>Workers remain running even when there are zero cases and refresh the active registry continuously.</span></div></div></section>
    </div>
    <section className="panel"><details><summary style={{cursor:'pointer',fontWeight:800}}>Manual fallback enrollment</summary><form className="case-form" onSubmit={createCase} style={{marginTop:16}}><label>Reference photo<input type="file" name="photo" accept="image/*" required/></label><div className="form-grid"><label>Name<input name="name" required placeholder="Person name"/></label><label>Age<input name="age" placeholder="Age"/></label><label>Last seen<input name="last_seen" placeholder="North Gate / Queue"/></label><label>Reporter contact<input name="reporter_contact" placeholder="Mobile number"/></label></div><button className="secondary-btn" disabled={busy}>{busy?'Creating…':'Create Active Case Manually'}</button></form></details></section>
    <section className="panel"><div className="panel-title"><h2><Camera/> Live Recognition Cameras</h2><span>{cameras.length} feeds</span></div><div className="camera-grid">{cameras.length?cameras.map(c=><div className="camera-card" key={c.camera_id}><div className="video-wrap"><img src={`${LOST_API}/cameras/${encodeURIComponent(c.camera_id)}/stream`} alt={c.camera_id}/><div className="video-overlay"><StatusPill ok={!!c.online}/><span>{c.camera_id}</span></div></div><div className="camera-meta"><div><b>{c.camera_location||c.camera_id}</b><span>{c.camera_id}</span></div><div className="mini-stats"><span><b>{Number(c.fps||0).toFixed(1)}</b> FPS</span><span><b>{c.faces||0}</b> Detected</span><span><b>{c.matched_faces||0}</b> Matched</span></div></div></div>):<Empty text="Start multi_camera.py. Cameras can stay running even with zero active cases."/>}</div></section>
    <section className="panel"><div className="panel-title"><h2>Candidate Matches</h2><span>{alerts.length} pending</span></div><div className="alert-grid">{alerts.length?alerts.map(a=><article className="match-card" key={a.alert_id}><div className="compare"><figure><img src={`${LOST_API}/cases/${encodeURIComponent(a.case_id)}/reference`} alt="Reference"/><figcaption>Reference</figcaption></figure><div className="vs">VS</div><figure><img src={`${LOST_API}/alerts/${a.alert_id}/evidence`} alt="CCTV evidence"/><figcaption>CCTV Evidence</figcaption></figure></div><div className="match-info"><div><h3>{a.name}</h3><span className="similarity">{(Number(a.similarity)*100).toFixed(1)}% similarity</span></div><p><MapPin size={14}/>{a.camera_location} · {a.camera_id} · Track {a.track_id}</p><p><Clock3 size={14}/>{new Date(a.timestamp).toLocaleString()}</p></div><div className="match-actions"><button className="confirm" onClick={()=>review(a.alert_id,'confirm')}><Check size={16}/>Confirm Match</button><button className="reject" onClick={()=>review(a.alert_id,'reject')}><X size={16}/>Reject</button></div></article>):<Empty text="No candidate matches waiting for verification."/>}</div></section>
    <section className="panel"><div className="panel-title"><h2>Cross-Camera Sighting History</h2></div><div className="timeline-list">{Object.entries(byCase).slice(0,8).map(([caseId,rows])=><div className="timeline-case" key={caseId}><b>{rows[0]?.name||caseId}</b><div>{rows.slice(0,8).map((s,i)=><span key={s.sighting_id||i}>{s.camera_location}<small>{Number(s.similarity).toFixed(3)}</small></span>)}</div></div>)}{!sightings.length&&<Empty text="Sightings will appear after candidate alerts are created."/>}</div></section>
  </AdminShell>;
}
function Empty({text}){return <div className="empty-state">{text}</div>}
