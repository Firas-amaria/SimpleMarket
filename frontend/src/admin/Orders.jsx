import React, { useEffect, useMemo, useState } from 'react';
import { adminListOrders, adminUpdateOrderStatus } from './adminApi';

const statuses = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export default function AdminOrders() {
  const [list, setList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const pages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await adminListOrders({
        status: statusFilter || undefined,
        page,
        limit,
      });
      setList(data.items);
      setTotal(data.total);
    } catch (e) {
      setErr('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const changeStatus = async (id, status) => {
    try {
      await adminUpdateOrderStatus(id, { status });
      await load();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      <h2>Orders</h2>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : err ? (
        <div>{err}</div>
      ) : (
        <>
          <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Order</th>
                <th>User</th>
                <th>Total</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o._id}>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {o.products?.map((p, i) => (
                        <li key={i}>
                          {p?.product?.name || 'Item'} × {p.quantity} @ {p.price}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{o.user?.name} ({o.user?.email})</td>
                  <td>{o.totalAmount}</td>
                  <td>
                    <select value={o.status} onChange={(e) => changeStatus(o._id, e.target.value)}>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan="5" align="center">No orders</td></tr>
              )}
            </tbody>
          </table>

          {pages > 1 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span>Page {page} / {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
