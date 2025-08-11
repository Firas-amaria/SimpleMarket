import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminHeader from './Header'; // new header
import '../admin.css';

const AdminLayout = () => {
  return (
    <div className="admin-container">
      <AdminHeader />
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
