import React from 'react';

// Delikatne ziarno papieru na biurku. Czysto dekoracyjne.
const Grain = () => (
  <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full mix-blend-overlay" style={{ opacity: 'var(--grain)' }}>
    <filter id="webownik-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" /></filter>
    <rect width="100%" height="100%" filter="url(#webownik-grain)" />
  </svg>
);

export default Grain;
