import React from 'react';

// Ślady czerwonego długopisu na fiszce: ptaszek, kółko i przekreślenie.
export const PenCheck = ({ className = 'h-7 w-7', label }) => (
  <svg viewBox="0 0 32 32" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
    <path d="M5 17 C8 19, 10 22, 12 26 C15 17, 21 9, 29 4" fill="none" stroke="rgb(var(--c-pen))" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const PenCircle = ({ className = '' }) => (
  <svg viewBox="0 0 64 44" aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
    <path d="M8 24 C5 9, 44 2, 56 14 C64 24, 48 40, 28 39 C10 38, 4 30, 12 16" fill="none" stroke="rgb(var(--c-pen))" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
);

export const PenStrike = ({ className = '' }) => (
  <span aria-hidden="true" className={`pointer-events-none absolute top-1/2 h-[3px] -rotate-2 rounded-sm bg-pen ${className}`} />
);

// Pieczątka „Opanowane” / „Jeszcze raz”.
export const Stamp = ({ children, className = '' }) => (
  <span className={`pointer-events-none inline-block -rotate-[8deg] rounded-md border-[3px] border-double border-pen px-3.5 py-2 text-[17px] font-extrabold uppercase tracking-[0.06em] text-pen opacity-90 mix-blend-multiply motion-safe:animate-[stamp_.32s_cubic-bezier(.3,1.6,.5,1)] ${className}`}>
    {children}
  </span>
);
