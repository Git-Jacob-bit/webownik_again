import React from 'react';
import { Trash2 } from 'lucide-react';

export const SectionHeading = ({ as: Tag = 'h2', children, aside, className = '' }) => (
  <div className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-ink/15 pb-3 ${className}`}>
    <Tag className="font-slab text-[26px] font-bold leading-tight sm:text-[30px]">{children}</Tag>
    {aside}
  </div>
);

// Przycisk usuwania z celem dotyku 44px; tone="paper" dla fiszek.
export const DeleteButton = ({ label, onClick, tone = 'desk', className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-11 w-11 flex-none items-center justify-center rounded-md transition ${tone === 'paper' ? 'text-card-muted hover:bg-card-ink/10 hover:text-pen' : 'text-faint hover:bg-ink/5 hover:text-accent-text'} ${className}`}
  >
    <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
  </button>
);

// Mały pasek opanowania na fiszce zestawu.
export const MasteryBar = ({ mastered, total }) => (
  <span className="flex h-[7px] gap-[2px]" aria-hidden="true">
    {mastered > 0 && <span className="bg-pen" style={{ flex: mastered }} />}
    <span className="bg-stack-1" style={{ flex: Math.max(total - mastered, mastered ? 0 : 1) }} />
  </span>
);
