import React, { useState, useEffect } from 'react';
import api from '../api';

const Profile = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    region: user.region || '',
    profileImage: user.profileImage || ''
  });

  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/api/users/profile', form);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setStatus('Profile updated!');
    } catch (err) {
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
          <option value="East">East</option>
          <option value="South">South</option>
        </select>

        {/* Profile image will be handled separately (Cloudinary + upload) */}
        <button type="submit">Update Profile</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
};

export default Profile;
