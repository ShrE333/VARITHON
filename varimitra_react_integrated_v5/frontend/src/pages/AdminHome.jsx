import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserRoundSearch, Users, Camera, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatusPill from '../components/StatusPill';
import { CROWD_API, LOST_API, getJson } from '../api';

export default function AdminHome(){
  const [lost,setLost]=useState(null), [crowd,setCrowd]=useState(null), [lcams,setLcams]=useState([]), [ccams,setCcams]=useState([]), [alerts,setAlerts]=useState([]), [zones,setZones]=useState([]);
  useEffect(()=>{const load=async()=>{setLost(await getJson(`${LOST_API}/health`));setCrowd(await getJson(`${CROWD_API}/health`));setLcams(await getJson(`${LOST_API}/cameras`,[]));setCcams(await getJson(`${CROWD_API}/cameras`,[]));setAlerts(await getJson(`${LOST_API}/alerts?status=PENDING&limit=20`,[]));setZones(await getJson(`${CROWD_API}/zones`,[]));};load();const id=setInterval(load,2500);return()=>clearInterval(id)},[]);
  const critical=zones.filter(z=>['HIGH','CRITICAL'].includes(z.level)).length;
  return <AdminShell title="VariMitra Temple Command Center" subtitle="AI operations overview">
    <section className="admin-hero"><div><span className="eyebrow">TEMPLE OPERATIONS</span><h1>Choose an AI Operations Module</h1><p>Lost-person recognition and crowd congestion monitoring are connected to their local FastAPI detection services.</p></div><Activity size={58}/></section>
    <div className="overview-stats"><div><b>{lcams.filter(c=>c.online).length}</b><span>Lost & Found Cameras</span></div><div><b>{alerts.length}</b><span>Pending Candidate Matches</span></div><div><b>{ccams.filter(c=>c.online).length}</b><span>Crowd Cameras Online</span></div><div><b>{critical}</b><span>High / Critical Zones</span></div></div>
    <div className="module-grid">
      <Link to="/admin/lost-found" className="module-card lost-card"><div className="module-icon"><UserRoundSearch/></div><div className="module-head"><div><span>MODULE 01</span><h2>Lost & Found AI</h2></div><StatusPill ok={!!lost} label={lost?'API READY':'API OFFLINE'}/></div><p>Register a missing person from one reference image, monitor CCTV face matches, compare evidence, confirm or reject candidates, and follow cross-camera sightings.</p><div className="module-metrics"><span><Camera/> {lcams.length} registered cameras</span><span><AlertTriangle/> {alerts.length} pending matches</span></div><button>Open Lost & Found <ArrowRight size={16}/></button></Link>
      <Link to="/admin/crowd" className="module-card crowd-card"><div className="module-icon"><Users/></div><div className="module-head"><div><span>MODULE 02</span><h2>Crowd Congestion AI</h2></div><StatusPill ok={!!crowd} label={crowd?'API READY':'API OFFLINE'}/></div><p>Monitor four camera feeds, detect and track people, calculate zone occupancy and visualize congestion on the temple heatmap.</p><div className="module-metrics"><span><Camera/> {ccams.length} configured cameras</span><span><AlertTriangle/> {critical} risk zones</span></div><button>Open Crowd Command <ArrowRight size={16}/></button></Link>
    </div>
    <div className="note-panel"><b>Architecture</b><p>React is only the command UI. The AI continues running in Python workers: InsightFace for Lost & Found and YOLO + ByteTrack for Crowd. This version intentionally does not use Triton.</p></div>
  </AdminShell>;
}
