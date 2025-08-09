import React, { useEffect, useState } from 'react';
import { adminGetDashboardStats } from './adminApi';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await adminGetDashboardStats();
        if (alive) setStats(data);
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
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <Card label="Products" value={stats.products} />
        <Card label="Orders" value={stats.orders} />
        <Card label="Users" value={stats.users} />
        <Card label="Pending Orders" value={stats.pendingOrders} />
        <Card label="Delivered Orders" value={stats.deliveredOrders} />
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
