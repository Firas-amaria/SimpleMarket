import React, { useEffect, useState } from 'react';
import { adminGetDashboardStats } from './scripts/adminApi';

export default function Dashboard() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminGetDashboardStats(); // already returns .data
        if (alive && res?.cards) {
          setStats(res.cards); // array of { key, value }
        }
      } catch {
        if (alive) setErr('Failed to load dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div>Loading…</div>;
  if (err) return <div>{err}</div>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <div style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))'
      }}>
        {stats.map(({ key, value }) => (
          <Card key={key} label={formatLabel(key)} value={value} />
        ))}
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function formatLabel(key) {
  switch (key) {
    case 'products': return 'Products';
    case 'orders': return 'Orders';
    case 'users': return 'Users';
    case 'pendingOrders': return 'Pending Orders';
    case 'deliveredOrders': return 'Delivered Orders';
    default: return key;
  }
}
