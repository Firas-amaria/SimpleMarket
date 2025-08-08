import React, { useState } from 'react';

const Index = () => {
  const [region, setRegion] = useState(localStorage.getItem('region') || '');

  const handleRegionSelect = (selected) => {
    localStorage.setItem('region', selected);
    setRegion(selected);
  };

  return (
    <div>
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        {!region ? (
          <>
            <h2>Select Your Region</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <button onClick={() => handleRegionSelect('East')}>East</button>
              <button onClick={() => handleRegionSelect('South')}>South</button>
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
