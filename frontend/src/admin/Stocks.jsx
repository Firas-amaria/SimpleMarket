import React, { useEffect, useState } from 'react';
import {
  adminListStocks,
  adminCreateStock,
  adminUpdateStockQty,
  adminDeleteStock,
  adminListProducts
} from './scripts/adminApi';

const REGIONS = ['east', 'west'];

export default function AdminStocks() {
  const [stocks, setStocks] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // New stock form state
  const [newProductId, setNewProductId] = useState('');
  const [newRegion, setNewRegion] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [adding, setAdding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErr('');
    try {
      const [stockRes, prodRes] = await Promise.all([
        adminListStocks(),
        adminListProducts()
      ]);
      setStocks(stockRes.items || []);
      setProducts(prodRes.items || []);
    } catch (e) {
      console.error(e);
      setErr('Failed to load stocks or products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStock = async () => {
    if (!newProductId || !newRegion) {
      alert('Select product and region');
      return;
    }
    setAdding(true);
    try {
      const newStock = await adminCreateStock({
        productId: newProductId,
        region: newRegion.toLowerCase(),
        quantity: Number(newQty)
      });
      setStocks((prev) => [newStock, ...prev]);
      setNewProductId('');
      setNewRegion('');
      setNewQty(0);
      loadData();
    } catch (e) {
      if (e.response?.status === 409) {
        alert('Stock for this product and region already exists');
      } else {
        alert('Failed to create stock');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateQty = async (id, qty) => {
    try {
      const updated = await adminUpdateStockQty(id, { quantity: Number(qty) });
      setStocks((prev) => prev.map((s) => (s._id === id ? updated : s)));
    } catch (e) {
      alert('Failed to update quantity');
    }
  };

  const handleDeleteStock = async (id) => {
    if (!window.confirm('Are you sure you want to delete this stock entry?')) return;
    try {
      await adminDeleteStock(id);
      setStocks((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      alert('Failed to delete stock');
    }
  };

  return (
    <div>
      <h2>Manage Stocks</h2>

      <div className="table-card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', gap: 8  }}>
            <select
              className="select"
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="select"
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value.toLowerCase())}
            >
              <option value="">Select region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <input
              className="input"
              type="number"
              min="0"
              value={newQty}
              placeholder="Quantity (kg)"
              onChange={(e) => setNewQty(e.target.value)}
              style={{ width: '120px' }}
            />
          </div>

          <button className="btn" onClick={handleAddStock} disabled={adding}>
            {adding ? 'Adding…' : '+ Add Stock'}
          </button>
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
                  <th>Product</th>
                  <th>Region</th>
                  <th>Quantity (kg)</th>
                  <th>Created</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr key={s._id}>
                    <td>
                      {s.productId?.image && (
                        <img
                          src={s.productId.image}
                          alt={s.productId.name}
                          style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 8 }}
                        />
                      )}
                      {s.productId?.name || 'Unknown Product'}
                    </td>
                    <td>{s.region}</td>
                    <td>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={s.quantity}
                        onChange={(e) => handleUpdateQty(s._id, e.target.value)}
                        style={{ width: '80px' }}
                      />
                    </td>
                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => handleDeleteStock(s._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {stocks.length === 0 && (
                  <tr><td colSpan="5" align="center">No stock entries</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
