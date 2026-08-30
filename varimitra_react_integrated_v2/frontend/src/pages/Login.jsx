import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, CalendarDays, KeyRound, ShieldCheck } from 'lucide-react';
import Brand from '../components/Brand';
import { saveUser } from '../auth';

export default function Login(){
  const nav=useNavigate();
  const [role,setRole]=useState('user');
  const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [age,setAge]=useState(''); const [otp,setOtp]=useState('');
  const [message,setMessage]=useState('');
  const sendOtp=()=>{ if(phone.length!==10){setMessage('Enter a valid 10-digit mobile number.');return;} setOtp('123456'); setMessage('OTP sent. Demo code: 123456'); };
  const submit=(e)=>{e.preventDefault(); if(otp!=='123456'){setMessage('Invalid OTP. Use 123456 for this local demo.');return;} saveUser({name,phone,age:role==='user'?(age||'N/A'):'N/A',role}); nav(role==='admin'?'/admin':'/portal');};
  return <div className="login-page"><div className="login-card">
    <Brand/><p className="login-tagline">One Platform. Safer Pilgrimage. Preserved Heritage.</p>
    <div className="role-tabs"><button className={role==='user'?'active':''} onClick={()=>setRole('user')}>Pilgrim / Devotee</button><button className={role==='admin'?'active':''} onClick={()=>setRole('admin')}><ShieldCheck size={15}/>Temple Admin</button></div>
    <form onSubmit={submit}>
      <label>Full Name<div className="input-box"><User size={17}/><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" required/></div></label>
      <label>Mobile Number<div className="input-box"><Phone size={17}/><input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile number" required/></div></label>
      {role==='user'&&<label>Age<div className="input-box"><CalendarDays size={17}/><input type="number" min="5" max="120" value={age} onChange={e=>setAge(e.target.value)} placeholder="Enter age" required/></div></label>}
      <label>One-Time Password<div className="otp-row"><div className="input-box"><KeyRound size={17}/><input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP" required/></div><button type="button" className="secondary-btn" onClick={sendOtp}>Send OTP</button></div></label>
      {message&&<div className="form-message">{message}</div>}
      <button className="primary-btn wide">Sign In to Portal</button>
    </form>
  </div></div>;
}
