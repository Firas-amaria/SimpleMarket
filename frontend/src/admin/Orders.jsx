import React, { useEffect, useMemo, useState } from 'react';
import { adminListOrders, adminUpdateOrderStatus } from './scripts/adminApi';

const statuses = [
  'pending',
  'processing',
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
      const res = await adminListOrders({
        status: statusFilter || undefined,
        page,
        limit,
      });
      setList(res.items);
      setTotal(res.total);
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
      const updatedOrder = await adminUpdateOrderStatus(id, { status });
      setList(prev =>
        prev.map(o => (o._id === id ? { ...o, status: updatedOrder.status } : o))
      );
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div>
      <h2>Manage Orders</h2>

      <div className="table-card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : err ? (
            <div style={{ padding: 16 }}>{err}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Order Items</th>
                  <th>User</th>
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
                            {p?.product?.name || 'Item'} × {p.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{o.user?.name} ({o.user?.email})</td>
                    <td>
                      <select
                        className="select"
                        value={o.status}
                        onChange={(e) => changeStatus(o._id, e.target.value)}
                      >
                        {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="4" align="center">No orders</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>
            <span>Page {page} / {pages}</span>
            <button
              className="page-btn"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
