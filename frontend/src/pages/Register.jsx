// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const CANON_REGIONS = ['east', 'west'];

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    region: (localStorage.getItem('region') || '').toLowerCase(),
  });

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return alert("Passwords don't match");

    const region = (form.region || '').toLowerCase();
    if (!CANON_REGIONS.includes(region)) return alert('Please select a valid region (east/west).');

    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        region, // normalized
      });
      localStorage.setItem('region', region); // keep storefront in sync
      alert('Registered! Now log in.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <form onSubmit={submit}>
      <div>
        <h2>Register</h2>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />

        {!form.region && (
          <>
            <label>Select region:</label>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value.toLowerCase() })}
            >
              <option value="">Select</option>
              <option value="east">East</option>
              <option value="west">West</option>
            </select>
          </>
        )}

        {form.region && <p>Selected region: {form.region}</p>}
      </div>

      <div style={{ margin: 20 }}>
        <button type="button" onClick={() => navigate('/login')}>Already have an account? Login</button>
      </div>
      <div style={{ margin: 20 }}>
        <button type="submit">Register</button>
      </div>
    </form>
  );
};

export default Register;
