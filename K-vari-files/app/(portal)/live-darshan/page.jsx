'use client';

import { useRouter } from 'next/navigation';

export default function LiveDarshanPage() {
  const router = useRouter();
  
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'var(--cream)', border: '1px solid var(--card-border)', cursor: 'pointer', fontSize: '18px', color: 'var(--maroon)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 style={{ margin: 0, color: 'var(--maroon)', fontSize: '24px', fontWeight: 'bold' }}>
          <i className="fa-solid fa-video" style={{ marginRight: '8px' }}></i> Live Darshan
        </h2>
      </div>
      
      <div className="stream-container" style={{
        width: '100%',
        aspectRatio: '16/9',
        backgroundColor: '#000',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        flexDirection: 'column',
        gap: '16px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '10px' }}>
          <span style={{ background: '#D64545', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', background: '#fff', borderRadius: '50%', display: 'inline-block' }}></span> LIVE
          </span>
          <span style={{ background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '6px', fontSize: '14px', backdropFilter: 'blur(4px)' }}>
            Pandharpur Main Temple
          </span>
        </div>
        
        <i className="fa-solid fa-video-slash" style={{ fontSize: '64px', opacity: 0.5, color: '#D64545' }}></i>
        <div style={{ fontSize: '24px', fontWeight: '600', opacity: 0.9 }}>Live Stream Currently Offline</div>
        <div style={{ fontSize: '16px', opacity: 0.6, textAlign: 'center', maxWidth: '500px', lineHeight: '1.6' }}>
          The temple live stream will be available here soon. For the initial phase, please keep this screen handy.
        </div>
      </div>
      
      <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--cream)', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--maroon)' }}>
          <i className="fa-solid fa-circle-info" style={{ marginRight: '8px', color: '#E8630C' }}></i>
          About Live Darshan
        </h3>
        <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6' }}>
          Watch darshan live from Pandharpur and partner temples directly from your mobile device. The high-definition live stream brings the temple feeds to you in real time, ensuring you never miss the auspicious moment, no matter where you are in the crowd or at home.
        </p>
      </div>
    </div>
  );
}
