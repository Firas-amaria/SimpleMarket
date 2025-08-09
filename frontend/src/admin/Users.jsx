import React, { useEffect, useMemo, useState } from 'react';
import { adminListUsers } from './adminApi';

export default function AdminUsers() {
  const me = JSON.parse(localStorage.getItem('user') || 'null');

  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
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
      const { data } = await adminListUsers({
        q: q || undefined,
        role: 'customer', // Only customers from the backend
        page,
        limit,
      });

      // Remove the currently logged-in user if present
      const filtered = me ? data.items.filter(u => u._id !== me._id) : data.items;

      setList(filtered);

      // Adjust total if "me" was present on this page
      const removed = (data.items.length - filtered.length);
      setTotal(Math.max(0, data.total - removed));
    } catch (e) {
      setErr('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page]);

  return (
    <div>
      <h2>Users</h2>

      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="input"
            placeholder="Search name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : err ? (
            <div style={{ padding: 16 }}>{err}</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Region</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.region || '-'}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="5" align="center">No users</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>Page {page} / {pages}</span>
            <button className="page-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
