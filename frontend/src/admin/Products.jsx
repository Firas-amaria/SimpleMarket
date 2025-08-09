import React, { useEffect, useMemo, useState } from 'react';
import {
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct
} from './adminApi';

const emptyForm = {
  name: '',
  description: '',
  category: '',
  price: '',
  stock: '',
  image: '',
  region: '',
  isActive: true,
  featured: false,
};

export default function AdminProducts() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [active, setActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const pages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await adminListProducts({
        q: q || undefined,
        region: region || undefined,
        active: active !== '' ? active : undefined,
        page,
        limit
      });
      setList(data.items);
      setTotal(data.total);
    } catch (e) {
      setErr('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, region, active]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      category: p.category || '',
      price: p.price ?? '',
      stock: p.stock ?? '',
      image: p.image || '',
      region: p.region || '',
      isActive: !!p.isActive,
      featured: !!p.featured,
    });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: form.price === '' ? undefined : Number(form.price),
        stock: form.stock === '' ? undefined : Number(form.stock),
      };
      if (editingId) {
        await adminUpdateProduct(editingId, payload);
      } else {
        await adminCreateProduct(payload);
      }
      setShowForm(false);
      await load();
    } catch (e) {
      alert('Failed to save product');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await adminDeleteProduct(id);
      await load();
    } catch {
      alert('Delete failed');
    }
  };

  return (
    <div>
      <h2>Manage Products</h2>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          <option value="East">East</option>
          <option value="South">South</option>
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={openCreate}>+ New Product</button>
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
                <th>Image</th>
                <th>Name</th>
                <th>Region</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Active</th>
                <th>Featured</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td>{p.image ? <img src={p.image} alt="" width="40" /> : '-'}</td>
                  <td>{p.name}</td>
                  <td>{p.region || '-'}</td>
                  <td>{p.price}</td>
                  <td>{p.stock}</td>
                  <td>{String(p.isActive)}</td>
                  <td>{String(p.featured)}</td>
                  <td>
                    <button onClick={() => openEdit(p)}>Edit</button>{' '}
                    <button onClick={() => del(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan="8" align="center">No products</td></tr>
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

      {showForm && (
        <div style={{ border: '1px solid #ddd', padding: 12, marginTop: 16, borderRadius: 8 }}>
          <h3>{editingId ? 'Edit Product' : 'New Product'}</h3>
          <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input placeholder="Stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
              <option value="">Region</option>
              <option value="East">East</option>
              <option value="South">South</option>
            </select>
            <input placeholder="Image URL (Cloudinary)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            <label><input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
            <label><input type="checkbox" checked={!!form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
            <div>
              <button type="submit">{editingId ? 'Save' : 'Create'}</button>{' '}
              <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
