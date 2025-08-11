import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const AdminHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Listen for user changes (both storage from other tabs and our custom event)
  useEffect(() => {
    const updateUserFromStorage = () => {
      try {
        setUser(JSON.parse(localStorage.getItem('user')) || null);
      } catch {
        setUser(null);
      }
    };

    const onStorage = (e) => {
      if (e.key === 'user') updateUserFromStorage();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('userChanged', updateUserFromStorage); // custom event

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('userChanged', updateUserFromStorage);
    };
  }, []);

  // Close dropdown if click is outside
  useEffect(() => {
    const handleClickOutside = (evt) => {
      if (dropdownRef.current && !dropdownRef.current.contains(evt.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
      setShowDropdown(false);
  
      try {
        // Use {} not null to avoid body-parser strict error
        await api.post('/auth/logout', {}, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
      } catch {
      // ignore — we'll still clear local state
      } finally {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('region');
        window.dispatchEvent(new Event('userChanged'));
        navigate('/login', { replace: true });
      }
    };

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-header-right">
        {user && (
          <div className="user-dropdown" ref={dropdownRef}>
            <span
              onClick={() => setShowDropdown((p) => !p)}
              style={{ cursor: 'pointer' }}
            >
              👤 {user.name}
            </span>
            {showDropdown && (
              <div className="dropdown-menu">
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;
