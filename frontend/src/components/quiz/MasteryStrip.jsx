import React from 'react';

// Pasek postępu z kreską na każde pytanie: opanowane, w trakcie, sprawiające kłopot, nowe.
const MasteryStrip = ({ progress, className = '' }) => {
  const total = Math.max(0, progress.initial_questions || 0);
  const mastered = Math.min(total, progress.mastered_questions || 0);
  const learning = Math.min(total - mastered, progress.learning_questions || 0);
  const struggling = Math.min(total - mastered - learning, progress.struggling_questions || 0);
  if (!total) return null;

  if (total > 120) {
    const pct = value => `${(value / total) * 100}%`;
    return (
      <div className={`flex h-2.5 overflow-hidden rounded-sm bg-ink/10 ${className}`} aria-hidden="true">
        <span className="bg-accent" style={{ width: pct(mastered) }} />
        <span className="bg-accent/40" style={{ width: pct(learning) }} />
        <span className="bg-warn" style={{ width: pct(struggling) }} />
      </div>
    );
  }

  const ticks = Array.from({ length: total }, (_, index) => {
    if (index < mastered) return 'bg-accent';
    if (index < mastered + learning) return 'bg-accent/40';
    if (index < mastered + learning + struggling) return 'bg-warn';
    return 'bg-ink/10';
  });
  return (
    <div className={`flex h-2.5 gap-[2px] ${className}`} aria-hidden="true">
      {ticks.map((color, index) => <span key={index} className={`min-w-0 flex-1 rounded-[2px] ${color}`} />)}
    </div>
  );
};

export default MasteryStrip;
