import React from 'react';

// Znak Webownika: mała fiszka z czerwoną linią + nazwa.
const Logo = ({ className = '', size = 'md' }) => {
  const big = size === 'lg';
  return (
    <span className={`inline-flex items-center gap-2.5 font-slab font-bold ${big ? 'text-[30px]' : 'text-[26px]'} ${className}`}>
      <span
        aria-hidden="true"
        className={`${big ? 'h-6 w-8' : 'h-[19px] w-[26px]'} rounded-[3px] bg-card`}
        style={{ boxShadow: `inset 0 ${big ? 5 : 4}px 0 rgb(var(--c-card)), inset 0 ${big ? 7 : 6}px 0 rgb(var(--c-pen)), 0 0 0 1px var(--card-edge)` }}
      />
      Webownik
    </span>
  );
};

export default Logo;
