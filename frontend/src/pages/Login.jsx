// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const login = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user } = res.data;

    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('userChanged')); // <--- add this

    if (user.role === 'admin') navigate('/admin/dashboard');
    else navigate('/market');
  } catch (err) {
    console.error(err);
    alert('Login failed. Please check your credentials.');
  }
};

  return (
    <form onSubmit={login}>
      <h2>Login</h2>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        required
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        type="password"
        required
      />

      <div style={{ margin: 20 }}>
        <button type="button" onClick={() => navigate('/register')}>
          Don&apos;t have an account? Register
        </button>
      </div>

      <div style={{ margin: 20 }}>
        <button type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
      </div>
    </form>
  );
};

export default Login;
