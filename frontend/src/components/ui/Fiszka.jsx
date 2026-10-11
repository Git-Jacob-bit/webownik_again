import React from 'react';

// Fiszka: papier z nagłówkiem, czerwoną linią i liniaturą. Jasna w obu motywach.
export const Fiszka = ({
  as: Component = 'article', label, aside, rule = 34, className = '', bodyClassName = '', children, ...props
}) => (
  <Component
    className={`paper on-paper relative rounded-[4px] shadow-paper ${className}`}
    style={{ '--rule': `${rule}px`, '--head': '46px', ...props.style }}
    {...props}
  >
    <div className="flex h-[43px] items-center justify-between gap-3 px-5 text-[13px] font-semibold text-card-muted">
      <span className="min-w-0 truncate">{label}</span>
      {aside}
    </div>
    <div className="h-[3px] bg-pen" />
    <div className={`px-5 pb-5 ${bodyClassName}`}>{children}</div>
  </Component>
);

// Dwie przekrzywione kartki pod spodem – wygląda jak stos fiszek.
export const FiszkaStack = ({ className = '', children }) => (
  <div className={`relative ${className}`}>
    <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-2 rotate-[3deg] rounded-[4px] bg-stack-2 shadow-[0_20px_30px_-20px_var(--shadow)]" />
    <div aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-1 -rotate-2 rounded-[4px] bg-stack-1 shadow-[0_20px_30px_-20px_var(--shadow)]" />
    <div className="relative">{children}</div>
  </div>
);

export default Fiszka;
