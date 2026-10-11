import React from 'react';
import { PenCheck, PenCircle, PenStrike } from '../ui/PenMarks';

// Odpowiedź na fiszce: kratka z literą jak na karcie maturalnej, zaznaczenie krzyżykiem,
// a po sprawdzeniu ślady czerwonego długopisu.
// state: idle | ok (zaznaczona i poprawna) | miss (poprawna, pominięta) | bad (zaznaczona, błędna) | dim
const AnswerRow = ({ letter, text, selected, state = 'idle', locked, onToggle, labels }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={locked}
    aria-pressed={selected}
    className={`group relative flex min-h-[68px] w-full items-center gap-4 rounded-sm pl-9 pr-2 text-left text-[18px] font-semibold text-card-ink transition-opacity disabled:cursor-default ${state === 'dim' ? 'opacity-45' : ''}`}
  >
    <span className="absolute left-0 top-1/2 flex w-8 -translate-y-1/2 justify-center" aria-hidden="true">
      {state === 'ok' && <PenCheck className="h-8 w-8" />}
    </span>
    <span className={`relative flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border-2 bg-card text-[15px] font-bold ${selected ? 'border-card-ink text-card-ink' : 'border-card-ink/70 text-card-ink/80 group-enabled:group-hover:border-card-ink'}`}>
      {letter}
      {selected && (
        <svg viewBox="0 0 40 40" aria-hidden="true" className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)]">
          <path d="M8 9 L32 31" stroke="rgb(var(--c-card-ink))" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M31 8 L9 32" stroke="rgb(var(--c-card-ink))" strokeWidth="3.6" strokeLinecap="round" />
        </svg>
      )}
      {state === 'miss' && <PenCircle className="-left-4 -top-2.5 h-[52px] w-[72px]" />}
    </span>
    <span className="relative min-w-0 break-words py-2 leading-[26px]">
      {text}
      {state === 'bad' && <PenStrike className="-left-1 -right-1" />}
    </span>
    {state !== 'idle' && state !== 'dim' && labels?.[state] && <span className="sr-only">{labels[state]}</span>}
  </button>
);

export default AnswerRow;
