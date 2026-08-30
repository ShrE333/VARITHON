import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, Users, MapPinned, HeartPulse, UserRoundSearch, Languages, Ticket, CloudSun, BookOpen } from 'lucide-react';
import Brand from '../components/Brand';
import { clearUser, readUser } from '../auth';
import { FEATURES } from '../data/features';

const quick=[['eticketing',Ticket],['crowd-safety',Users],['route-weather',CloudSun],['lost-found',UserRoundSearch],['medical-help',HeartPulse],['group-location',MapPinned],['heritage-hub',BookOpen]];
export default function PilgrimPortal(){
  const nav=useNavigate(); const user=readUser();
  const logout=()=>{clearUser();nav('/')};
  return <div className="portal-page"><header className="portal-top"><Brand compact/><div className="portal-search"><Search size={15}/><input placeholder="Search services, routes, alerts…"/></div><nav><Link to="/feature/services-menu">Services</Link><Link to="/feature/yatra-menu">Yatra</Link><Link to="/feature/heritage-menu">Heritage</Link></nav><Bell size={18}/><div className="portal-user"><div><small>Pilgrim</small><b>{user?.name}</b></div><button className="icon-btn" onClick={logout}><LogOut size={15}/></button></div></header>
  <main className="portal-main"><section className="pilgrim-hero"><div><span className="eyebrow">PANDHARPUR WARI DIGITAL COMPANION</span><h1>Namaskar, {user?.name?.split(' ')[0] || 'Yatri'}.</h1><h2>Your VariMitra is ready.</h2><p>Plan darshan, check crowd conditions, stay connected with your group and get help when you need it.</p><div className="hero-badges"><span><Users/> Live crowd safety</span><span><Languages/> Multilingual access</span><span><HeartPulse/> Emergency support</span></div></div></section>
  <h3 className="section-heading">Quick Actions</h3><div className="quick-grid">{quick.map(([key,Icon])=>{const f=FEATURES[key];return <Link key={key} to={`/feature/${key}`} className="quick-card"><div style={{background:f.color}}><Icon/></div><b>{f.title}</b><span>{f.desc}</span></Link>})}</div>
  <div className="portal-columns"><section className="panel"><div className="panel-title"><h2>Live Crowd & Safety</h2></div><div className="pilgrim-crowd"><div><b>82%</b><span>Main Gate density</span></div><div className="meter"><i style={{width:'82%'}}></i></div><p>High congestion near the Main Gate. Consider Queue B / alternate entry when directed.</p><Link to="/feature/crowd-safety" className="text-link">View crowd details →</Link></div></section><section className="panel"><div className="panel-title"><h2>My Yatri Profile</h2></div><div className="profile-summary"><b>{user?.name}</b><span>+91 {user?.phone}</span><span>Age: {user?.age}</span><span>Yatri ID: VM{user?.phone?.slice(-6)}</span></div></section></div>
  </main></div>;
}
