'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CrowdStatusPage() {
  const router = useRouter();
  const [crowdData, setCrowdData] = useState([
    { stage: 'Pandharpur', density: 85, status: 'High Density', color: '#EF4444', tip: 'Plan breaks at other stops' },
    { stage: 'Indapur', density: 45, status: 'Moderate', color: '#F59E0B', tip: 'Good time to take refreshments' },
    { stage: 'Saswad', density: 22, status: 'Low Crowd', color: '#10B981', tip: 'Perfect for rest' },
    { stage: 'Lonand', density: 60, status: 'Building Up', color: '#F59E0B', tip: 'Evening peak expected' },
  ]);

  return (
    <div className="vm-crowd" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <style>{`
        .vm-crowd h1 { font-size: 28px; font-weight: 700; margin-bottom: 20px; }
        .crowd-card { border: 1px solid #E5E7EB; padding: 16px; margin-bottom: 12px; border-radius: 8px; }
        .crowd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .crowd-bar { height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
        .crowd-fill { height: 100%; transition: all 0.3s; }
        .crowd-tip { font-size: 13px; color: #6B7280; padding-top: 8px; border-top: 1px solid #F3F4F6; }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>👥 Live Crowd Status</h1>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', border: '1px solid #D1D5DB', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>← Back</button>
      </div>

      <div style={{ background: '#FEF3C7', padding: '16px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #FBBF24' }}>
        <strong>📊 Last Updated:</strong> Just now • Real-time crowd monitoring active
      </div>

      {crowdData.map((item, idx) => (
        <div key={idx} className="crowd-card">
          <div className="crowd-header">
            <div>
              <h3 style={{ margin: '0 0 4px 0' }}>{item.stage}</h3>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '13px' }}>{item.status}</p>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: item.color }}>{item.density}%</div>
          </div>
          <div className="crowd-bar">
            <div className="crowd-fill" style={{ width: `${item.density}%`, background: item.color }}></div>
          </div>
          <div className="crowd-tip">💡 {item.tip}</div>
        </div>
      ))}
    </div>
  );
}
