import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import './admin.css';

const AdminLayout = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>Welcome {user?.name}</div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <aside className="admin-sidebar">
        <Sidebar />
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
