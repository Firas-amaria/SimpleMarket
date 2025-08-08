import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Register = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    region: localStorage.getItem('region') || ''
  });

  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return alert("Passwords don't match");

    try {
      await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        region: form.region
      });
      alert('Registered! Now log in.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <form onSubmit={submit}>
      <div><h2>Register</h2>
      <input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
      <input placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
      <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
      <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
      <input placeholder="Confirm Password" type="password" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} />

      {!form.region && (
        <>
          <label>Select region:</label>
          <select value={form.region} onChange={(e) => setForm({...form, region: e.target.value})}>
            <option value="">Select</option>
            <option value="East">East</option>
            <option value="South">South</option>
          </select>
        </>
      )}

      {form.region && <p>Selected region: {form.region}</p>}</div>
      <div style={{ margin: 20 }}>
        <button onClick={() => navigate('/login')}>already have an account? Login</button>{' '}
      </div>
      <div style={{ margin: 20 }}>
      <button type="submit">Register</button>
      </div>
    </form>
  );
};

export default Register;
