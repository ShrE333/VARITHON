import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Compass, ListChecks, Lightbulb } from 'lucide-react';
import { FEATURES } from '../data/features';
import { readUser } from '../auth';
export default function FeaturePage(){
  const {key}=useParams(); const user=readUser(); const data=FEATURES[key];
  if(!data) return <Navigate to={user?.role==='admin'?'/admin':'/portal'} replace/>;
  if(data.audience==='admin'&&user?.role!=='admin') return <Navigate to="/portal" replace/>;
  const back=user?.role==='admin'?'/admin':'/portal';
  return <div className="feature-page"><header className="feature-top"><Link to={back}><ArrowLeft size={16}/>Back</Link><div><Compass size={17}/>VariMitra</div></header><section className="feature-hero" style={{background:`linear-gradient(135deg,${data.color},#4c1616)`}}><div><span>{data.tag||'Feature'}</span><h1>{data.title}</h1><p>{data.desc}</p><div className="feature-stats">{(data.stats||[]).map((s,i)=><div key={i}><b>{s.value}</b><span>{s.label}</span></div>)}</div></div></section><main className="feature-body"><h2><ListChecks/>What this feature does</h2><div className="feature-points">{(data.points||[]).map((p,i)=><div key={i}><i style={{background:data.color}}>{i+1}</i><p>{p}</p></div>)}</div><section className="panel"><div className="panel-title"><h2><Lightbulb/>The bigger picture</h2></div><p className="long-copy">{data.long||data.desc}</p></section></main></div>;
}
