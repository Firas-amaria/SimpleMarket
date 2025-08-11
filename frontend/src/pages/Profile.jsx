// src/pages/Profile.jsx
import React, { useState } from 'react';
import api from '../utils/api';

const CANON_REGIONS = ['east', 'west'];

const Profile = () => {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    region: (user.region || '').toLowerCase(),
    profileImage: user.profileImage || ''
  });
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'region' ? value.toLowerCase() : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.region && !CANON_REGIONS.includes(form.region)) {
      return setStatus('Please select a valid region (east/west).');
    }
    try {
      // NOTE: confirm this path matches your server
      const res = await api.put('/api/users/profile', form);
      const updated = res.data.user || res.data; // depending on your controller return
      localStorage.setItem('user', JSON.stringify(updated));
      if (updated?.region) localStorage.setItem('region', (updated.region || '').toLowerCase());
      setStatus('Profile updated!');
    } catch (err) {
      console.error(err);
      setStatus('Update failed');
    }
  };

  return (
    <div>
      <h2>Edit Profile</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" />
        <select name="region" value={form.region} onChange={handleChange}>
          <option value="">Select region</option>
          <option value="east">East</option>
          <option value="west">West</option>
        </select>
        <button type="submit">Update Profile</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default Profile;
