import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Search, UserRoundSearch, Users, LayoutDashboard } from 'lucide-react';
import { clearUser, readUser } from '../auth';
import Brand from './Brand';

export default function AdminShell({ title, subtitle, children }) {
  const nav=useNavigate(); const user=readUser();
  const signOut=()=>{clearUser(); nav('/');};
  return <div className="admin-app">
    <header className="topbar">
      <Brand compact />
      <div className="page-title"><b>{title}</b><span>{subtitle}</span></div>
      <div className="top-search"><Search size={15}/><input placeholder="Search VariMitra operations…" /></div>
      <div className="admin-user"><div><small>Temple Admin</small><b>{user?.name || 'Admin'}</b></div><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div>
    </header>
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <NavLink end to="/admin" className={({isActive})=>`side-nav ${isActive?'active':''}`}><LayoutDashboard size={17}/>Command Home</NavLink>
        <div className="side-label">AI OPERATIONS</div>
        <NavLink to="/admin/lost-found" className={({isActive})=>`side-nav ${isActive?'active':''}`}><UserRoundSearch size={17}/>Lost & Found AI</NavLink>
        <NavLink to="/admin/crowd" className={({isActive})=>`side-nav ${isActive?'active':''}`}><Users size={17}/>Crowd Congestion AI</NavLink>
        <div className="system-card"><span className="status-dot"></span><b>Local AI Mode</b><p>Running without Triton. FastAPI + InsightFace + YOLO workers.</p></div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}
