import React, { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';
import { formatTime } from './quizUtils';

// Krótka fanfara na koniec sesji. Przeglądarka może ją zablokować – wtedy po prostu jej nie ma.
const useFanfare = () => {
  useEffect(() => {
    let audioContext;
    let closeTimer;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return undefined;
      audioContext = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = audioContext.currentTime + index * 0.16;
        const last = index === notes.length - 1;
        oscillator.type = last ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (last ? 0.65 : 0.3));
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + (last ? 0.7 : 0.35));
      });
      closeTimer = window.setTimeout(() => audioContext?.close(), 1600);
    } catch (error) {
      console.debug('Przeglądarka zablokowała fanfarę.', error);
    }
    return () => {
      window.clearTimeout(closeTimer);
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
    };
  }, []);
};

// Karta odpowiedzi: wszystkie pytania wypełniają się falą.
const FilledSheet = ({ count }) => {
  const shown = Math.min(count, 200);
  const columns = 10;
  return (
    <div className="grid grid-cols-10 gap-1" aria-hidden="true">
      {Array.from({ length: shown }, (_, index) => {
        const wave = (index % columns) + Math.floor(index / columns);
        return (
          <span
            key={index}
            className="flex aspect-square items-center justify-center rounded-[4px] border-[1.5px] border-ink/15 text-[11px] font-bold tabular-nums text-faint motion-safe:animate-[sheet-fill_.35s_ease-out_forwards] motion-reduce:border-accent motion-reduce:bg-accent motion-reduce:text-accent-ink"
            style={{ animationDelay: `${0.2 + Math.min(wave, 40) * 0.06}s` }}
          >
            {index + 1}
          </span>
        );
      })}
      <style>{'@keyframes sheet-fill{to{background:rgb(var(--c-accent));border-color:rgb(var(--c-accent));color:rgb(var(--c-accent-ink))}}'}</style>
    </div>
  );
};

const QuizSummary = ({ summary, progress, timer, deckTitle, localized, onBack, onRepeat }) => {
  const { t } = useLanguage();
  useFanfare();

  const total = summary?.initial_questions ?? progress.initial_questions ?? 0;
  const correct = summary?.correct_answers ?? progress.correct_answers ?? 0;
  const incorrect = summary?.incorrect_answers ?? progress.incorrect_answers ?? 0;
  const answers = summary?.total_answers ?? (correct + incorrect);
  const accuracy = answers ? Math.round((correct / answers) * 100) : 0;
  const time = summary?.time_spent ?? timer;
  const difficult = summary?.difficult_questions || [];

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-7 px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pt-12">
      {total > 0 && <FilledSheet count={total} />}
      <div className="flex flex-col gap-3">
        <h1 className="font-slab text-[40px] font-bold leading-none sm:text-[52px]">{t('Wszystkie {count} opanowane.', { count: total })}</h1>
        <p className="text-[17px] leading-relaxed text-muted">{t('{deck} zaliczone. Każde pytanie padło poprawnie dwa razy z rzędu.', { deck: deckTitle })}</p>
      </div>

      <dl className="flex flex-col">
        <div className="flex min-h-[52px] items-baseline justify-between gap-4"><dt className="text-muted">{t('Czas nauki')}</dt><dd className="font-slab text-2xl font-bold tabular-nums">{formatTime(time)}</dd></div>
        <div className="flex min-h-[52px] items-baseline justify-between gap-4 border-t border-ink/15"><dt className="text-muted">{t('Skuteczność')}</dt><dd className="font-slab text-2xl font-bold tabular-nums">{accuracy}%</dd></div>
        <div className="flex min-h-[52px] items-baseline justify-between gap-4 border-t border-ink/15"><dt className="text-muted">{t('Odpowiedzi')}</dt><dd className="text-right"><span className="font-slab text-2xl font-bold tabular-nums">{answers}</span><span className="ml-2 text-sm text-muted">{t('poprawne {correct}, błędne {incorrect}', { correct, incorrect })}</span></dd></div>
      </dl>
      <div className="flex h-2.5 overflow-hidden rounded-sm bg-ink/10" aria-hidden="true">
        <span className="bg-accent" style={{ width: `${accuracy}%` }} />
      </div>

      {difficult.length > 0 && (
        <section className="flex flex-col gap-3 border-t-[3px] border-accent pt-4">
          <h2 className="font-slab text-xl font-bold">{t('Najwięcej kłopotu sprawiły')}</h2>
          <ul className="flex flex-col gap-2">
            {difficult.map(item => (
              <li key={item.id} className="flex justify-between gap-4 text-[15px]">
                <span className="min-w-0 truncate">{localized(item)}</span>
                <span className="flex-none font-bold text-warn">{t('Błędy: {count}', { count: item.incorrect })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-start sm:gap-6">
        <Button size="lg" onClick={onBack} className="sm:min-w-[240px]">{t('Wróć do zestawów')}</Button>
        <Button variant="quiet" size="lg" onClick={onRepeat}>{t('Powtórz zestaw od nowa')}</Button>
      </div>
    </main>
  );
};

export default QuizSummary;
