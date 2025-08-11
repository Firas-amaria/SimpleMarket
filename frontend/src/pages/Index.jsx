import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// tiny helper: decode JWT payload safely
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const json = atob(base64Url.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const CANON_REGIONS = ['east', 'west'];

const Index = () => {
  const navigate = useNavigate();
  const [region, setRegion] = useState(
    (localStorage.getItem('region') || '').toLowerCase()
  );

  // Normalize and persist region
  const handleRegionSelect = (selected) => {
    const normalized = (selected || '').toLowerCase();
    if (!CANON_REGIONS.includes(normalized)) return;
    localStorage.setItem('region', normalized);
    setRegion(normalized);
  };

  // Auth + role check on load and when tab refocuses
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      const token = localStorage.getItem('token') || '';
      const userRaw = localStorage.getItem('user');
      let user = null;
      try { user = userRaw ? JSON.parse(userRaw) : null; } catch { user = null; }

      // No token: nothing to do on the home page (public), but if you prefer, redirect to /login:
      // if (!token) return navigate('/login', { replace: true });

      if (token) {
        const payload = parseJwt(token);
        const expired = !payload || (payload.exp && payload.exp * 1000 < Date.now());

        if (expired) {
          // Token is bad/expired → clear and send to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return navigate('/login', { replace: true });
        }

        // If either the stored user or the token payload says admin → go to admin
        const isAdmin = (user?.role === 'admin') || (payload?.role === 'admin');
        if (isAdmin) {
          return navigate('/admin/dashboard', { replace: true });
        }
      }
    };

    checkAuthAndRedirect();
    // recheck when the tab regains focus (e.g., after login in another tab)
    const onFocus = () => checkAuthAndRedirect();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [navigate]);

  return (
    <div>
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        {!region ? (
          <>
            <h2>Select Your Region</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button type="button" onClick={() => handleRegionSelect('east')}>East</button>
              <button type="button" onClick={() => handleRegionSelect('west')}>West</button>
            </div>
          </>
        ) : (
          <>
            <h2>Products for: {region}</h2>
            <p>🧪 Product cards will go here...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
