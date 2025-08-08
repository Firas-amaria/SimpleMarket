import React from 'react';
import { useNavigate } from 'react-router-dom';
import './admin.css'; // Optional: if you want sidebar to be fully standalone

const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-sidebar">
      <h3>Admin Menu</h3>
      <ul>
        <li>
          <button onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        </li>
        <li>
          <button onClick={() => navigate('/admin/products')}>Manage Products</button>
        </li>
        <li>
          <button onClick={() => navigate('/admin/orders')}>Orders</button>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
