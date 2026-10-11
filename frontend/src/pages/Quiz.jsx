import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Clock } from 'lucide-react';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import { Fiszka, FiszkaStack } from '../components/ui/Fiszka';
import { Stamp } from '../components/ui/PenMarks';
import AnswerRow from '../components/quiz/AnswerRow';
import MasteryStrip from '../components/quiz/MasteryStrip';
import QuizSummary from '../components/quiz/QuizSummary';
import { answerLetter, formatTime } from '../components/quiz/quizUtils';
import { getErrorMessage } from '../utils/errors';

const ENCOURAGEMENT = [
  'Małe kroki robią dużą różnicę.',
  'Spokojnie, nie liczy się tempo, tylko regularność.',
  'Pamiętaj: dwa razy dobrze i pytanie jest opanowane.',
  'Świetnie trzymasz rytm.',
  'Mózg właśnie porządkuje nowe informacje.',
];

const EMPTY_PROGRESS = { initial_questions: 0, mastered_questions: 0, learning_questions: 0, struggling_questions: 0, total_answers: 0, correct_answers: 0, incorrect_answers: 0 };

const Kbd = ({ children }) => (
  <kbd className="inline-flex min-w-[28px] items-center justify-center rounded-[5px] bg-raise px-1.5 py-0.5 font-sans text-[13px] font-bold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.25)]">{children}</kbd>
);

const Quiz = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { language, localized, t } = useLanguage();
  const reduceMotion = useReducedMotion();

  const [view, setView] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [startError, setStartError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deckTitle, setDeckTitle] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [question, setQuestion] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionError, setQuestionError] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitChoice, setExitChoice] = useState('stay');
  const [summary, setSummary] = useState(null);
  const [hint, setHint] = useState(null);
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [reloadKey, setReloadKey] = useState(0);

  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerIntervalRef = useRef(null);
  const quizStateRef = useRef({ view: 'loading', isPaused: false });
  quizStateRef.current = { view, isPaused };
  const feedbackRef = useRef(null);
  feedbackRef.current = feedback;

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerIntervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
  }, [stopTimer]);

  const applyProgress = useCallback(data => {
    setProgress(previous => ({ ...previous, ...data }));
    if (data.remaining !== undefined) setRemaining(data.remaining);
    if (data.time_spent !== undefined) setTimer(data.time_spent);
  }, []);

  // --- Wczytanie stanu zestawu ---
  useEffect(() => {
    // Tłumaczenie uruchamiamy tylko, gdy jeszcze go nie ma — błąd (np. pełna kolejka) nie blokuje quizu.
    const ensureTranslation = async () => {
      try {
        const { data } = await api.get('/decks/mine');
        const deck = data.find(item => String(item.id) === String(deckId));
        if (deck && !['ready', 'queued', 'processing'].includes(deck.translation_status)) {
          await api.post(`/decks/${deckId}/translate`);
        }
      } catch (err) {
        console.error(err);
      }
    };

    let active = true;
    const fetchStatus = async () => {
      setView('loading');
      setLoadError('');
      try {
        if (language === 'en') ensureTranslation();
        const res = await api.get(`/quiz/status/${deckId}`);
        if (!active) return;
        setDeckTitle((language === 'en' && res.data.deck_title_en) || res.data.deck_title || `#${deckId}`);
        if (res.data.has_active_session) {
          setSessionData(res.data);
          setTimer(res.data.time_spent || 0);
          setProgress(previous => ({ ...previous, ...res.data }));
        } else if (res.data.last_summary) {
          setSummary(res.data.last_summary);
          setProgress(previous => ({ ...previous, ...res.data.last_summary }));
          setTimer(res.data.last_summary.time_spent || 0);
          setView('end');
          return;
        }
        setView('start');
      } catch (err) {
        console.error(err);
        if (!active) return;
        setLoadError(getErrorMessage(err, 'Nie udało się wczytać zestawu.'));
        setView('error');
      }
    };
    fetchStatus();
    return () => { active = false; stopTimer(); };
  }, [deckId, language, reloadKey, stopTimer]);

  // Zachęty co jakiś czas, w linii pod fiszką.
  useEffect(() => {
    if (view !== 'quiz' || isPaused) return undefined;
    let timeoutId;
    const scheduleMessage = () => {
      timeoutId = window.setTimeout(() => {
        if (!feedbackRef.current) setHint({ tone: 'idle', text: ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)] });
        scheduleMessage();
      }, 18000 + Math.random() * 18000);
    };
    scheduleMessage();
    return () => window.clearTimeout(timeoutId);
  }, [view, isPaused]);

  // --- Akcje ---
  const loadNextQuestion = async () => {
    setSelectedAnswerIds(new Set());
    setFeedback(null);
    setQuestionError(false);
    setActionError('');
    setHint(null);
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    try {
      const res = await api.get(`/quiz/next/${deckId}`);
      if (res.data.finished) {
        stopTimer();
        setSummary(res.data);
        applyProgress(res.data);
        setView('end');
        return;
      }
      setQuestion(res.data.question);
      applyProgress(res.data);
    } catch (err) {
      console.error(err);
      setQuestion(null);
      setQuestionError(true);
    }
  };

  const handleStart = async forceNew => {
    setStartError('');
    try {
      const res = await api.post(`/quiz/start/${deckId}`, { force_new: forceNew });
      if (res.data.deck_title) setDeckTitle((language === 'en' && res.data.deck_title_en) || res.data.deck_title);
      applyProgress(res.data);
      setSummary(null);
      setQuestion(null);
      setIsPaused(Boolean(res.data.is_paused));
      setView('quiz');
      if (!res.data.is_paused) {
        startTimer();
        loadNextQuestion();
      }
    } catch (err) {
      setStartError(getErrorMessage(err, 'Nie udało się rozpocząć nauki. Spróbuj ponownie.'));
      if (view === 'end') setView('start');
    }
  };

  const toggleAnswer = id => {
    if (feedback) return;
    const next = new Set(selectedAnswerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAnswerIds(next);
  };

  const confirmSelection = async () => {
    if (isSubmitting || selectedAnswerIds.size === 0) return;
    setIsSubmitting(true);
    setActionError('');
    stopTimer();
    try {
      const { data: result } = await api.post(`/quiz/answer/${deckId}`, { answer_ids: Array.from(selectedAnswerIds) });
      applyProgress(result);
      if (!result.finished) startTimer();
      else stopTimer();
      const mastered = result.is_correct && result.question_streak >= 2;
      setFeedback({ isCorrect: result.is_correct, mastered, correctIds: new Set(result.correct_ids), finished: result.finished });
      setHint({
        tone: result.is_correct ? 'good' : 'bad',
        text: result.is_correct
          ? (mastered ? 'Druga dobra odpowiedź z rzędu. Ta fiszka odpada ze stosu.' : 'Dobrze. Jeszcze raz i pytanie będzie opanowane.')
          : 'Nic nie szkodzi, fiszka wraca pod spód stosu i jeszcze się pojawi.',
      });
      if (result.finished) setSummary(result);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Nie udało się wysłać odpowiedzi. Spróbuj ponownie.'));
      startTimer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseToggle = async () => {
    setActionError('');
    try {
      if (!isPaused) {
        const res = await api.post(`/quiz/pause/${deckId}`);
        applyProgress(res.data);
        setIsPaused(true);
        stopTimer();
      } else {
        const res = await api.post(`/quiz/resume/${deckId}`);
        applyProgress(res.data);
        setIsPaused(false);
        startTimer();
        if (!question) loadNextQuestion();
      }
    } catch (err) {
      setActionError(getErrorMessage(err, isPaused ? 'Nie udało się wznowić nauki.' : 'Nie udało się wstrzymać nauki.'));
    }
  };

  const exitQuiz = async () => {
    stopTimer();
    if (view === 'quiz' && !isPaused) {
      try { await api.post(`/quiz/pause/${deckId}`); } catch (err) { console.error(err); }
    }
    navigate('/decks');
  };

  const requestExit = () => {
    setExitChoice('stay');
    setExitModalOpen(true);
  };

  const goNext = () => {
    if (feedback?.finished) setView('end');
    else loadNextQuestion();
  };

  // --- Skróty klawiszowe (komputer). Najnowsze akcje trzymamy w refie, żeby nasłuch był jeden. ---
  const keyboardRef = useRef(null);
  keyboardRef.current = { view, exitModalOpen, exitChoice, feedback, isPaused, isSubmitting, selectedAnswerIds, question, toggleAnswer, confirmSelection, goNext, handlePauseToggle, exitQuiz, requestExit };
  useEffect(() => {
    const handleKeyboard = event => {
      const s = keyboardRef.current;
      if (!window.matchMedia('(min-width: 1024px)').matches || s.view !== 'quiz' || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

      if (s.exitModalOpen) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          setExitChoice(choice => choice === 'stay' ? 'exit' : 'stay');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (s.exitChoice === 'exit') s.exitQuiz();
          else setExitModalOpen(false);
        }
        return;
      }

      const key = event.key.toLowerCase();
      const letterIndex = /^[a-i]$/.test(key) ? key.charCodeAt(0) - 97 : -1;
      const numberIndex = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
      const answerIndex = numberIndex >= 0 ? numberIndex : letterIndex;
      if (answerIndex >= 0 && !s.feedback && !s.isPaused && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const answer = s.question?.answers[answerIndex];
        if (answer) {
          event.preventDefault();
          s.toggleAnswer(answer.id);
        }
      } else if (event.code === 'Space' && !s.isPaused && !s.isSubmitting) {
        if (!s.feedback && s.selectedAnswerIds.size > 0) {
          event.preventDefault();
          s.confirmSelection();
        } else if (s.feedback) {
          event.preventDefault();
          s.goNext();
        }
      } else if (key === 'p' && !s.isSubmitting) {
        event.preventDefault();
        s.handlePauseToggle();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        s.requestExit();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, []);

  // Wstrzymanie sesji przy opuszczeniu ekranu.
  useEffect(() => () => {
    if (quizStateRef.current.view === 'quiz' && !quizStateRef.current.isPaused) {
      api.post(`/quiz/pause/${deckId}`).catch(() => {});
    }
  }, [deckId]);

  useEffect(() => {
    if (view !== 'quiz' || isPaused) return undefined;
    const heartbeat = window.setInterval(async () => {
      try {
        const res = await api.post(`/quiz/heartbeat/${deckId}`);
        if (res.data.time_spent !== undefined) setTimer(res.data.time_spent);
      } catch (err) { console.error(err); }
    }, 10000);
    return () => window.clearInterval(heartbeat);
  }, [view, isPaused, deckId]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState !== 'hidden' || view !== 'quiz' || isPaused) return;
      stopTimer();
      setIsPaused(true);
      api.post(`/quiz/pause/${deckId}`).then(res => applyProgress(res.data)).catch(() => {});
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    window.addEventListener('pagehide', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      window.removeEventListener('pagehide', pauseWhenHidden);
    };
  }, [view, isPaused, deckId, stopTimer, applyProgress]);

  // --- Widok ---
  const answerState = id => {
    if (!feedback) return 'idle';
    const selected = selectedAnswerIds.has(id);
    const correct = feedback.correctIds.has(id);
    if (selected && correct) return 'ok';
    if (!selected && correct) return 'miss';
    if (selected && !correct) return 'bad';
    return 'dim';
  };
  const answerLabels = { ok: t('Dobrze'), miss: t('Poprawna, pominięta'), bad: t('Błędna') };
  const hintText = hint?.text || 'Postaw X przy wszystkich poprawnych odpowiedziach.';
  const hintColor = hint?.tone === 'bad' ? 'text-accent-text' : hint?.tone === 'good' ? 'text-ink' : 'text-muted';
  const cardMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
      initial: { y: 16, scale: 0.97, rotate: 1.5, opacity: 0 },
      animate: { y: 0, scale: 1, rotate: 0, opacity: 1, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
      exit: { x: '-120%', y: -30, rotate: -16, opacity: 0, transition: { duration: 0.4, ease: [0.5, 0, 0.2, 1] } },
    };

  const total = progress.initial_questions || 0;
  const balanceTotal = progress.total_answers || 0;

  return (
    <div className="desk relative min-h-[100dvh] text-ink">
      {view === 'loading' && (
        <div className="flex min-h-[100dvh] items-center justify-center px-4" role="status">
          <p className="font-slab text-2xl font-bold text-muted motion-safe:animate-pulse">{t('Tasujemy fiszki…')}</p>
        </div>
      )}

      {view === 'error' && (
        <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center gap-6 px-4 py-10">
          <h1 className="font-slab text-4xl font-bold">{t('Nie udało się otworzyć zestawu')}</h1>
          <Alert type="error">{t(loadError)}</Alert>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button onClick={() => setReloadKey(key => key + 1)}>{t('Spróbuj ponownie')}</Button>
            <Button variant="quiet" onClick={() => navigate('/decks')}>{t('Wróć do zestawów')}</Button>
          </div>
        </main>
      )}

      {view === 'start' && (
        <main className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center gap-7 px-4 py-10">
          <button type="button" onClick={() => navigate('/decks')} className="link self-start text-[15px]">{t('Wróć do zestawów')}</button>
          <FiszkaStack>
            <Fiszka label={t('Gotowy do nauki?')}>
              <h1 className="font-slab text-[30px] font-bold leading-[34px] sm:text-[36px]">{deckTitle}</h1>
              {sessionData?.has_active_session ? (
                <p className="mt-[34px] flex flex-wrap items-center gap-x-4 gap-y-1 text-[16px] leading-[34px] text-card-muted">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{formatTime(sessionData.time_spent)}</span>
                  <span>{t('Zostało w kolejce: {n}', { n: sessionData.remaining })}</span>
                  <span>{t('Opanowane: {done} z {total}', { done: sessionData.mastered_questions || 0, total: sessionData.initial_questions || 0 })}</span>
                </p>
              ) : (
                <p className="mt-[34px] text-[16px] leading-[34px] text-card-muted">{t('Dwie poprawne odpowiedzi z rzędu i fiszka odpada ze stosu.')}</p>
              )}
            </Fiszka>
          </FiszkaStack>
          {startError && <Alert type="error">{t(startError)}</Alert>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {sessionData?.has_active_session ? (
              <>
                <Button size="lg" onClick={() => handleStart(false)}>{t('Kontynuuj naukę')}</Button>
                <Button variant="quiet" onClick={() => handleStart(true)}>{t('Zacznij od nowa')}</Button>
              </>
            ) : (
              <Button size="lg" onClick={() => handleStart(true)}>{t('Rozpocznij naukę')}</Button>
            )}
          </div>
        </main>
      )}

      {view === 'quiz' && (
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1180px] flex-col px-4 pb-[calc(170px+env(safe-area-inset-bottom))] pt-2 sm:px-6 lg:pb-12 lg:pt-6">
          <header className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={requestExit} className="link min-h-[44px] px-1 text-[15px]">{t('Zakończ')}</button>
              <div className="min-w-0 text-center">
                <p className="truncate font-slab text-lg font-bold">{deckTitle}</p>
                <p className="text-[15px] font-semibold tabular-nums text-muted" aria-label={t('Czas nauki')}>{formatTime(timer)}</p>
              </div>
              <button type="button" onClick={handlePauseToggle} className="link min-h-[44px] px-1 text-[15px]">{t('Pauza')}</button>
            </div>
            <MasteryStrip progress={progress} />
            <p className="flex flex-wrap justify-between gap-x-4 text-sm tabular-nums text-muted">
              <span>{t('{done} z {total} opanowanych', { done: progress.mastered_questions || 0, total })}</span>
              <span className="lg:hidden">{t('Poprawne {correct}, błędne {incorrect}', { correct: progress.correct_answers || 0, incorrect: progress.incorrect_answers || 0 })}</span>
            </p>
          </header>

          <div className="mt-5 flex flex-1 flex-col gap-8 lg:mt-8 lg:flex-row lg:items-start lg:justify-center">
            <section className="w-full min-w-0 lg:max-w-[760px] lg:flex-1" aria-live="polite">
              {questionError ? (
                <Fiszka label={t('Coś poszło nie tak')}>
                  <p className="font-slab text-[22px] font-semibold leading-[34px]">{t('Nie udało się pobrać pytania.')}</p>
                  <p className="text-[16px] leading-[34px] text-card-muted">{t('Sprawdź połączenie i spróbuj jeszcze raz.')}</p>
                  <Button className="mt-4" onClick={loadNextQuestion}>{t('Spróbuj ponownie')}</Button>
                </Fiszka>
              ) : (
                <FiszkaStack>
                  <AnimatePresence mode="wait" initial={false}>
                    {question ? (
                      <motion.div key={question.id} {...cardMotion}>
                        <Fiszka
                          className="relative"
                          label={t('W kolejce: {n}', { n: remaining })}
                          aside={<span className="truncate">{deckTitle}</span>}
                        >
                          <h1 className="font-slab text-[23px] font-semibold leading-[34px] sm:text-[26px]">{localized(question)}</h1>
                          <p className="text-[15px] leading-[34px] text-card-muted">{t('Zaznacz wszystkie poprawne odpowiedzi:')}</p>
                          <div className="flex flex-col">
                            {question.answers.map((answer, index) => (
                              <AnswerRow
                                key={answer.id}
                                letter={answerLetter(index)}
                                text={localized(answer)}
                                selected={selectedAnswerIds.has(answer.id)}
                                state={answerState(answer.id)}
                                locked={Boolean(feedback) || isSubmitting}
                                onToggle={() => toggleAnswer(answer.id)}
                                labels={answerLabels}
                              />
                            ))}
                          </div>
                          {feedback && (
                            <div className="pointer-events-none absolute right-4 top-14">
                              <Stamp>{t(feedback.isCorrect ? (feedback.mastered ? 'Opanowane' : 'Dobrze') : 'Jeszcze raz')}</Stamp>
                            </div>
                          )}
                        </Fiszka>
                      </motion.div>
                    ) : (
                      <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Fiszka label={t('Następna fiszka')}>
                          <p className="font-slab text-[22px] font-semibold leading-[34px] text-card-muted motion-safe:animate-pulse">{t('Wyciągamy fiszkę ze stosu…')}</p>
                          <div className="h-[204px]" />
                        </Fiszka>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </FiszkaStack>
              )}

              <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 bg-desk/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:static lg:mt-8 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                {actionError && <Alert type="error">{t(actionError)}</Alert>}
                <p className={`min-h-[22px] text-center text-[15px] leading-snug lg:text-left ${hintColor}`} role="status">{t(hintText)}</p>
                {!feedback ? (
                  <Button size="lg" block kbd={t('Spacja')} onClick={confirmSelection} disabled={!question || selectedAnswerIds.size === 0} loading={isSubmitting}>
                    {t(isSubmitting ? 'Sprawdzanie…' : 'Sprawdź')}
                  </Button>
                ) : (
                  <Button size="lg" block kbd={t('Spacja')} onClick={goNext}>
                    {t(feedback.finished ? 'Zobacz podsumowanie' : 'Następna fiszka')}
                  </Button>
                )}
              </div>
            </section>

            <aside className="hidden w-[300px] flex-none flex-col gap-7 lg:flex" aria-label={t('Postęp sesji')}>
              <section className="flex flex-col gap-3">
                <h2 className="font-slab text-xl font-bold">{t('Bilans odpowiedzi')}</h2>
                <div className="flex h-3 overflow-hidden rounded-sm bg-ink/10" aria-hidden="true">
                  {balanceTotal > 0 && <>
                    <span className="bg-ok transition-[width] duration-300" style={{ width: `${(progress.correct_answers / balanceTotal) * 100}%` }} />
                    <span className="bg-accent transition-[width] duration-300" style={{ width: `${(progress.incorrect_answers / balanceTotal) * 100}%` }} />
                  </>}
                </div>
                <p className="flex justify-between text-sm tabular-nums text-muted">
                  <span>{t('Poprawne: {n}', { n: progress.correct_answers || 0 })}</span>
                  <span>{t('Błędne: {n}', { n: progress.incorrect_answers || 0 })}</span>
                </p>
              </section>
              <dl className="flex flex-col border-t border-ink/15">
                <div className="flex min-h-[48px] items-center justify-between border-b border-ink/15"><dt className="text-muted">{t('Opanowane')}</dt><dd className="font-slab text-xl font-bold tabular-nums">{progress.mastered_questions || 0}/{total}</dd></div>
                <div className="flex min-h-[48px] items-center justify-between border-b border-ink/15"><dt className="text-muted">{t('W kolejce')}</dt><dd className="font-slab text-xl font-bold tabular-nums">{remaining}</dd></div>
                <div className="flex min-h-[48px] items-center justify-between border-b border-ink/15"><dt className="text-muted">{t('Czas')}</dt><dd className="font-slab text-xl font-bold tabular-nums">{formatTime(timer)}</dd></div>
              </dl>
              <p className="text-[15px] leading-relaxed text-muted"><strong className="text-ink">{t('Jak działa opanowanie?')}</strong> {t('Dwie poprawne odpowiedzi z rzędu kończą naukę pytania. Błąd zeruje serię i odkłada fiszkę pod spód stosu.')}</p>
              <ul className="grid grid-cols-1 gap-2.5 text-sm text-muted">
                <li className="flex items-center gap-2"><Kbd>A</Kbd><Kbd>1</Kbd>{t('zaznacz odpowiedź')}</li>
                <li className="flex items-center gap-2"><Kbd>{t('Spacja')}</Kbd>{t('sprawdź i dalej')}</li>
                <li className="flex items-center gap-2"><Kbd>P</Kbd>{t('pauza')}</li>
                <li className="flex items-center gap-2"><Kbd>Esc</Kbd>{t('zakończ')}</li>
              </ul>
            </aside>
          </div>
        </div>
      )}

      {view === 'end' && (
        <>
          {startError && <div className="mx-auto max-w-2xl px-4 pt-6"><Alert type="error">{t(startError)}</Alert></div>}
          <QuizSummary
            summary={summary}
            progress={progress}
            timer={timer}
            deckTitle={deckTitle}
            localized={localized}
            onBack={() => navigate('/decks')}
            onRepeat={() => handleStart(true)}
          />
        </>
      )}

      <AnimatePresence>
        {view === 'quiz' && isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-desk/90 px-4 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col gap-6">
              <Fiszka label={t('Sesja wstrzymana')}>
                <p className="font-slab text-[34px] font-bold leading-[68px]">{t('Pauza')}</p>
                <p className="text-[16px] leading-[34px] text-card-muted">{t('Czas stoi. Wróć, kiedy będziesz gotowy.')}</p>
              </Fiszka>
              {actionError && <Alert type="error">{t(actionError)}</Alert>}
              <Button size="lg" block kbd="P" onClick={handlePauseToggle}>{t('Wznów naukę')}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        title={t('Wyjść z quizu?')}
        description={t('Postęp zostanie zapisany, a sesja wstrzymana.')}
        size="sm"
        role="alertdialog"
        footer={(
          <>
            <Button variant="outline" onClick={() => setExitModalOpen(false)} onMouseEnter={() => setExitChoice('stay')} className={exitChoice === 'stay' ? 'ring-2 ring-accent' : ''}>{t('Zostań')}</Button>
            <Button onClick={exitQuiz} onMouseEnter={() => setExitChoice('exit')} className={exitChoice === 'exit' ? 'ring-2 ring-accent ring-offset-2 ring-offset-panel' : ''}>{t('Wyjdź')}</Button>
          </>
        )}
      >
        <p className="hidden text-sm text-muted lg:block">{t('Wybierz strzałkami i zatwierdź Enterem.')}</p>
      </Modal>
    </div>
  );
};

export default Quiz;
