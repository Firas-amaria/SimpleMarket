import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if click is outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // optional
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        {location.pathname !== '/' ? (
          <Link to="/" className="home-button">Home</Link>
        ) : (
          <button onClick={() => alert('Cart feature coming soon')}>🛒 Cart</button>
        )}
      </div>

      <div className="header-right">
        {!user ? (
          <>
            <button onClick={() => navigate('/login')}>Login</button>
            <button onClick={() => navigate('/register')}>Register</button>
          </>
        ) : (
          <div className="user-dropdown" ref={dropdownRef}>
            <span onClick={() => setShowDropdown(prev => !prev)} style={{ cursor: 'pointer' }}>
              👤 {user.name}
            </span>
            {showDropdown && (
              <div className="dropdown-menu">
                <button onClick={() => navigate('/profile')}>Profile</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
