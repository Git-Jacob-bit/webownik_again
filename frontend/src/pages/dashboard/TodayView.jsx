import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { Fiszka, FiszkaStack } from '../../components/ui/Fiszka';
import notify from '../../components/ui/notify';
import { MasteryBar, SectionHeading } from './parts';
import { useDeckProgress } from './shared';

const MAX_SQUARES = 120;

// Karta odpowiedzi: jedna kratka = jedno pytanie. Kolejność to tylko grupy stanów, nie numery pytań.
const AnswerSheet = ({ progress, t }) => {
  const learning = Math.max(0, progress.initial - progress.mastered - progress.struggling);
  const states = [
    ...Array(progress.mastered).fill('m'),
    ...Array(progress.struggling).fill('k'),
    ...Array(learning).fill('n'),
  ];
  const look = {
    m: 'bg-accent',
    k: 'bg-warn',
    n: 'ring-[1.5px] ring-inset ring-ink/25',
  };
  return (
    <div className="flex flex-col gap-4">
      {progress.initial <= MAX_SQUARES ? (
        <div
          className="grid max-w-[540px] grid-cols-10 gap-1.5"
          role="img"
          aria-label={t('{total} pytań: {m} opanowanych, {k} sprawia kłopot, {n} do nauki', { total: progress.initial, m: progress.mastered, k: progress.struggling, n: learning })}
        >
          {states.map((state, index) => <span key={index} className={`aspect-square rounded-[4px] ${look[state]}`} />)}
        </div>
      ) : (
        <div className="flex h-4 max-w-[540px] gap-[2px] overflow-hidden rounded-sm" role="img" aria-label={t('{total} pytań: {m} opanowanych, {k} sprawia kłopot, {n} do nauki', { total: progress.initial, m: progress.mastered, k: progress.struggling, n: learning })}>
          {progress.mastered > 0 && <span className="bg-accent" style={{ flex: progress.mastered }} />}
          {progress.struggling > 0 && <span className="bg-warn" style={{ flex: progress.struggling }} />}
          {learning > 0 && <span className="bg-ink/15" style={{ flex: learning }} />}
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-[3px] bg-accent" aria-hidden="true" />{t('Opanowane {n}', { n: progress.mastered })}</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-[3px] bg-warn" aria-hidden="true" />{t('Sprawiają kłopot {n}', { n: progress.struggling })}</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-[3px] ring-[1.5px] ring-inset ring-ink/25" aria-hidden="true" />{t('Do nauki {n}', { n: learning })}</span>
      </div>
    </div>
  );
};

const TodayView = ({ onCountsChange }) => {
  const navigate = useNavigate();
  const { t, localizedTitle } = useLanguage();
  const [data, setData] = useState({ decks: [], tasks: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/decks/mine'), api.get('/todos'), api.get('/notes')])
      .then(([decks, tasks, notes]) => setData({ decks: decks.data, tasks: tasks.data, notes: notes.data }))
      .catch(() => setLoadError(t('Nie udało się załadować pulpitu. Odśwież stronę, żeby spróbować ponownie.')))
      .finally(() => setLoading(false));
  }, [t]);

  const deckIds = useMemo(() => data.decks.slice(0, 12).map(deck => deck.id), [data.decks]);
  const progress = useDeckProgress(deckIds);

  // Do wznowienia: zestaw z aktywną sesją i największą liczbą odpowiedzi.
  const resume = useMemo(() => {
    const candidates = data.decks
      .map(deck => ({ deck, p: progress[deck.id] }))
      .filter(item => item.p?.active && item.p.initial > 0)
      .sort((a, b) => b.p.totalAnswers - a.p.totalAnswers);
    return candidates[0] || null;
  }, [data.decks, progress]);

  const pending = data.tasks.filter(task => !task.done);
  const lastNote = data.notes.length ? data.notes[data.notes.length - 1] : null;

  const toggleTask = async task => {
    setData(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item) }));
    try {
      await api.put(`/todos/${task.id}`, { text: task.text, done: !task.done });
      onCountsChange?.('tasks', pending.length + (task.done ? 1 : -1));
      if (!task.done) notify.success(t('Zadanie zrobione.'));
    } catch {
      setData(current => ({ ...current, tasks: current.tasks.map(item => item.id === task.id ? task : item) }));
      notify.error(t('Nie udało się zapisać zadania.'));
    }
  };

  if (loading) return <div className="flex min-h-[45vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted" aria-label={t('Ładowanie')} /></div>;

  const left = resume ? resume.p.initial - resume.p.mastered : 0;
  const minutes = resume ? Math.max(1, Math.round(resume.p.timeSpent / 60)) : 0;

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      {loadError && <Alert>{loadError}</Alert>}

      <section className="flex flex-wrap items-center gap-10 lg:gap-14">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-6">
          {resume ? (
            <>
              <p className="text-base text-muted">{t('{title}, przerwane po {min} min', { title: localizedTitle(resume.deck), min: minutes })}</p>
              <h1 className="font-slab text-[40px] font-bold leading-none tracking-[-0.02em] sm:text-[56px] xl:text-[72px]">
                {left > 0 ? t('Jeszcze {n} pytań do opanowania.', { n: left }) : t('Wszystko opanowane.')}
              </h1>
              <p className="max-w-[480px] text-[17px] leading-relaxed text-muted">
                {t('{m} masz już opanowane.', { m: resume.p.mastered })}
                {resume.p.struggling > 0 && ` ${t('Te, które sprawiają kłopot, wracają częściej, aż zaskoczą.')}`}
              </p>
              <div className="flex flex-wrap items-center gap-6">
                <Button onClick={() => navigate(`/quiz/${resume.deck.id}`)}>{t('Wznów naukę')}</Button>
                <Button variant="quiet" size="sm" onClick={() => navigate(`/decks/${resume.deck.id}`)}>{t('Przejrzyj pytania')}</Button>
              </div>
            </>
          ) : data.decks.length ? (
            <>
              <h1 className="font-slab text-[40px] font-bold leading-none tracking-[-0.02em] sm:text-[56px]">{t('Wybierz zestaw i zacznij naukę.')}</h1>
              <p className="max-w-[480px] text-[17px] leading-relaxed text-muted">{t('Nie masz przerwanej sesji. Każdy zestaw możesz zacząć od nowa albo przejrzeć jego pytania.')}</p>
              <div><Button onClick={() => navigate('/decks')}>{t('Przejdź do zestawów')}</Button></div>
            </>
          ) : (
            <>
              <h1 className="font-slab text-[40px] font-bold leading-none tracking-[-0.02em] sm:text-[56px]">{t('Zacznij od pierwszego zestawu.')}</h1>
              <p className="max-w-[480px] text-[17px] leading-relaxed text-muted">{t('Wgraj pytania w formacie Testownika: pliki .txt, cały folder albo archiwum .zip.')}</p>
              <div><Button onClick={() => navigate('/decks', { state: { create: true } })}>{t('Wgraj zestaw')}</Button></div>
            </>
          )}
        </div>

        {resume && (
          <FiszkaStack className="w-full max-w-[460px] flex-[0_1_440px] sm:mr-3">
            <Fiszka label={t('Zestaw w trakcie nauki')} rule={34} bodyClassName="min-h-[190px] sm:min-h-[220px]">
              <p className="mt-3 font-slab text-[26px] font-semibold leading-[34px]">{localizedTitle(resume.deck)}</p>
              <p className="text-[17px] leading-[34px]">{t('Opanowane: {m} z {total}', { m: resume.p.mastered, total: resume.p.initial })}</p>
              <p className="text-[17px] leading-[34px]">{t('W kolejce: {n}', { n: resume.p.remaining })}</p>
            </Fiszka>
          </FiszkaStack>
        )}
      </section>

      <section className="flex flex-wrap gap-x-14 gap-y-12">
        {resume && (
          <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
            <SectionHeading aside={<span className="text-sm text-muted">{t('{title}, {n} pytań', { title: localizedTitle(resume.deck), n: resume.p.initial })}</span>}>{t('Karta odpowiedzi')}</SectionHeading>
            <AnswerSheet progress={resume.p} t={t} />
          </div>
        )}

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
          <SectionHeading className="mb-2" aside={<button type="button" className="link text-sm" onClick={() => navigate('/tasks')}>{t('Wszystkie zadania')}</button>}>{t('Na dziś')}</SectionHeading>
          {pending.slice(0, 5).map(task => (
            <label key={task.id} className="flex min-h-[48px] cursor-pointer items-center gap-3.5 text-base">
              <input type="checkbox" className="xbox" checked={task.done} onChange={() => toggleTask(task)} />
              <span className="min-w-0 break-words">{task.text}</span>
            </label>
          ))}
          {!pending.length && (
            <p className="py-3 text-muted">
              {t('Nic nie czeka.')} <button type="button" className="link" onClick={() => navigate('/tasks', { state: { create: true } })}>{t('Dopisz zadanie')}</button>
            </p>
          )}
          {lastNote && (
            <Fiszka label={t('Ostatnia notatka')} rule={28} className="mt-6" bodyClassName="pt-2">
              <button type="button" onClick={() => navigate('/notes')} className="block w-full text-left after:absolute after:inset-0 after:content-['']">
                <span className="block font-slab text-xl font-bold leading-[28px]">{lastNote.title}</span>
                <span className="line-clamp-3 block text-[15px] leading-[28px]">{lastNote.content || t('Pusta notatka')}</span>
              </button>
            </Fiszka>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading aside={<button type="button" className="link text-[15px]" onClick={() => navigate('/decks', { state: { create: true } })}>{t('Wgraj nowy zestaw')}</button>}>{t('Twoje zestawy')}</SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-7">
          {data.decks.slice(0, 3).map(deck => {
            const p = progress[deck.id];
            return (
              <button key={deck.id} type="button" onClick={() => navigate(`/decks/${deck.id}`)} className="on-paper flex flex-col gap-2.5 rounded-[4px] bg-card px-[18px] pb-[18px] text-left text-card-ink shadow-stack transition hover:-translate-x-px hover:-translate-y-px">
                <span className="-mx-[18px] mb-2 h-[3px] bg-pen" />
                <span className="font-slab text-[22px] font-bold leading-tight">{localizedTitle(deck)}</span>
                <span className="text-sm text-card-muted">{p ? t('{total} pytań, {m} opanowanych', { total: p.initial, m: p.mastered }) : t('Jeszcze nie zaczęty')}</span>
                <MasteryBar mastered={p?.mastered || 0} total={p?.initial || 1} />
              </button>
            );
          })}
          <button type="button" onClick={() => navigate('/decks', { state: { create: true } })} className="min-h-[130px] rounded-[4px] border-2 border-dashed border-ink/25 p-4 text-[15px] leading-normal text-muted transition hover:border-accent hover:text-ink">
            {t('Wgraj pliki .txt, folder albo archiwum .zip')}
          </button>
        </div>
      </section>
    </div>
  );
};

export default TodayView;
