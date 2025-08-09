import React, { useEffect, useMemo, useState } from 'react';
import { adminListUsers } from './adminApi';

export default function AdminUsers() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
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
        role: role || undefined,
        page,
        limit,
      });
      setList(data.items);
      setTotal(data.total);
    } catch (e) {
      setErr('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, page]);

  return (
    <div>
      <h2>Users</h2>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="customer">customer</option>
          <option value="admin">admin</option>
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
