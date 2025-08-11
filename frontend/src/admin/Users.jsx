import React, { useEffect, useMemo, useState } from 'react';
import { adminListUsers, adminDeleteUser } from './scripts/adminApi';

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
      const res = await adminListUsers({
        q: q || undefined,
        role: 'customer', // Only customers
        page,
        limit,
      });

      // Remove the currently logged-in admin if in list
      const filtered = me ? res.items.filter(u => u._id !== me._id) : res.items;

      setList(filtered);

      // Adjust total if "me" was present on this page
      const removed = (res.items.length - filtered.length);
      setTotal(Math.max(0, res.total - removed));
    } catch (e) {
      setErr('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminDeleteUser(id);
      setList((prev) => prev.filter((u) => u._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      alert('Failed to delete user');
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.region ? u.region.toLowerCase() : '-'}</td>
                    <td>{u.role}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        style={{ background: 'red', color: 'white', padding: '4px 8px', borderRadius: 4 }}
                        onClick={() => handleDelete(u._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan="6" align="center">No users</td></tr>
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
