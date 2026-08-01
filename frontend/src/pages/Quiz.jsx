import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, CheckCircle, XCircle, AlertCircle, Home, RotateCcw, Coffee, X, Clock, Bot, Sparkles } from 'lucide-react';
import api from '../api'; // <--- UŻYWAMY NASZEGO NOWEGO PLIKU
import { toast } from 'react-toastify';
import { useLanguage } from '../context/LanguageContext';

const StudyMascot = ({ event }) => {
  const isCheering = event.mood === 'cheer';
  return (
    <div className="relative hidden min-h-32 flex-1 items-center justify-center overflow-hidden lg:flex">
      <AnimatePresence mode="wait">
        <motion.div key={event.serial} initial={{ opacity: 0, y: 10, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }} className="flex flex-col items-center">
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mb-3 max-w-52 rounded-2xl rounded-br-sm border px-3 py-2 text-center text-xs ${isCheering ? 'border-green-500/20 bg-green-500/10 text-green-300' : 'border-blue-500/15 bg-blue-500/[0.07] text-blue-200'}`}>{event.message}</motion.div>
          <motion.div animate={isCheering ? { y: [0, -12, 0], rotate: [0, -6, 6, 0] } : event.mood === 'encourage' ? { rotate: [0, -4, 4, 0], y: [0, -3, 0] } : { y: [0, -5, 0] }} transition={{ duration: isCheering ? 0.7 : 2.4, repeat: isCheering ? 1 : Infinity, ease: 'easeInOut' }} className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border ${isCheering ? 'border-green-400/30 bg-green-500/15 text-green-300' : 'border-blue-400/20 bg-blue-500/10 text-blue-300'}`}>
            <Bot className="h-9 w-9" />
            {isCheering && <><motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.4], x: -30, y: -24 }} className="absolute"><Sparkles className="h-4 w-4 text-yellow-300" /></motion.span><motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 1, 1.4], x: 32, y: -18 }} transition={{ delay: 0.15 }} className="absolute"><Sparkles className="h-4 w-4 text-green-300" /></motion.span></>}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const SummaryCelebration = () => {
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
        oscillator.type = index === notes.length - 1 ? 'triangle' : 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + (index === notes.length - 1 ? 0.65 : 0.3));
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + (index === notes.length - 1 ? 0.7 : 0.35));
      });
      closeTimer = window.setTimeout(() => audioContext?.close(), 1600);
    } catch (error) {
      console.debug('Przeglądarka zablokowała fanfarę.', error);
    }
    return () => {
      window.clearTimeout(closeTimer);
      if (audioContext?.state !== 'closed') audioContext?.close();
    };
  }, []);

  const confetti = Array.from({ length: 54 }, (_, index) => ({
    id: index,
    x: (index * 47) % 100,
    drift: ((index * 29) % 24) - 12,
    color: ['#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ef4444'][index % 5],
    delay: (index % 14) * 0.07,
  }));

  return (
    <div className="relative mx-auto mb-5 flex h-40 w-32 items-end justify-center overflow-visible">
      <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
        {confetti.map(piece => <motion.span key={piece.id} initial={{ opacity: 0, x: 0, y: -24, rotate: 0 }} animate={{ opacity: [0, 1, 1, 0], x: piece.drift, y: '105vh', rotate: 540 + piece.id * 21 }} transition={{ duration: 2.5 + (piece.id % 5) * 0.16, delay: piece.delay, ease: 'easeIn' }} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${piece.x}%`, backgroundColor: piece.color }} />)}
      </div>
      <div className="relative h-28 w-20">
        <div className="absolute bottom-0 left-0 h-24 w-16 overflow-hidden rounded-b-2xl rounded-t-lg border-4 border-slate-300/70 bg-white/5 shadow-lg">
          <motion.div initial={{ height: 0 }} animate={{ height: '72%' }} transition={{ duration: 1.3, delay: 0.25, ease: 'easeOut' }} className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-amber-600 via-amber-500 to-yellow-400">
            {[12, 28, 44].map((left, index) => <motion.span key={left} initial={{ y: 30, opacity: 0 }} animate={{ y: -42, opacity: [0, 0.8, 0] }} transition={{ duration: 1.5, delay: 0.7 + index * 0.22, repeat: 1 }} className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-yellow-100/70" style={{ left }} />)}
          </motion.div>
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 1.15, duration: 0.35 }} className="absolute inset-x-0 top-5 h-5 origin-bottom rounded-[50%] bg-amber-50 shadow-[0_3px_0_rgba(253,230,138,.7)]" />
        </div>
        <div className="absolute right-[-13px] top-10 h-12 w-7 rounded-r-2xl border-4 border-l-0 border-slate-300/70" />
      </div>
    </div>
  );
};

const Quiz = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { language, localized } = useLanguage();
  // const token = ... <--- USUNIĘTE (nie potrzebujesz tego tutaj, api.js to ogarnia)

  // --- STANY ---
  const [view, setView] = useState('loading'); 
  const [deckTitle, setDeckTitle] = useState('');
  const [sessionData, setSessionData] = useState(null);
  
  const [question, setQuestion] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [initialCount, setInitialCount] = useState(0);
  
  const [selectedAnswerIds, setSelectedAnswerIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitChoice, setExitChoice] = useState('stay');
  const [summary, setSummary] = useState(null);
  const [mascotEvent, setMascotEvent] = useState({ mood: 'idle', message: 'Jestem tu, gdybyś potrzebował wsparcia.', serial: 0 });
  const [progress, setProgress] = useState({ initial_questions: 0, mastered_questions: 0, learning_questions: 0, struggling_questions: 0, total_answers: 0, correct_answers: 0, incorrect_answers: 0 });
  
  // Zegar
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerIntervalRef = useRef(null);
  const quizStateRef = useRef({ view: 'loading', isPaused: false });
  quizStateRef.current = { view, isPaused };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        if (language === 'en') await api.post(`/decks/${deckId}/translate`);
        // ZMIANA: api.get i krótka ścieżka bez headerów
        const res = await api.get(`/quiz/status/${deckId}`);
        
        setDeckTitle((language === 'en' && res.data.deck_title_en) || res.data.deck_title || `Zestaw #${deckId}`);
        if (res.data.has_active_session) {
          setSessionData(res.data);
          setTimer(res.data.time_spent || 0);
          setProgress(res.data);
        } else if (res.data.last_summary) {
          setSummary(res.data.last_summary);
          setProgress(res.data.last_summary);
          setTimer(res.data.last_summary.time_spent || 0);
          setView('end');
          return;
        }
        setView('start');
      } catch (err) {
        console.error(err);
        toast.error("Błąd ładowania quizu");
        navigate('/decks');
      }
    };
    fetchStatus();
    return () => stopTimer();
  }, [deckId, navigate, language]);

  useEffect(() => {
    if (view !== 'quiz' || isPaused) return undefined;
    const messages = [
      'Małe kroki robią dużą różnicę.',
      'Spokojnie — nie liczy się tempo, tylko regularność.',
      'Pamiętaj: dwa razy dobrze i pytanie jest opanowane!',
      'Świetnie trzymasz rytm. Lecimy dalej?',
      'Mózg właśnie robi porządki w nowych informacjach.',
    ];
    let timeoutId;
    const scheduleMessage = () => {
      timeoutId = window.setTimeout(() => {
        const message = messages[Math.floor(Math.random() * messages.length)];
        setMascotEvent(previous => ({ mood: 'idle', message, serial: previous.serial + 1 }));
        scheduleMessage();
      }, 18000 + Math.random() * 18000);
    };
    scheduleMessage();
    return () => window.clearTimeout(timeoutId);
  }, [view, isPaused]);

  // --- LOGIKA ZEGARA ---
  const startTimer = () => {
    stopTimer();
    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const applyProgress = data => {
    setProgress(previous => ({ ...previous, ...data }));
    if (data.remaining !== undefined) setRemaining(data.remaining);
    if (data.initial_questions !== undefined) setInitialCount(data.initial_questions);
    if (data.time_spent !== undefined) setTimer(data.time_spent);
  };

  // --- AKCJE ---
  const handleStart = async (forceNew) => {
    try {
      // ZMIANA: api.post, bez pełnego URL i bez tokena w headerze
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
      toast.error("Nie udało się rozpocząć quizu.");
    }
  };

  const loadNextQuestion = async () => {
    setSelectedAnswerIds(new Set());
    setFeedback(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // ZMIANA: api.get
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
    } catch (err) { console.error(err); }
  };

  const toggleAnswer = (id) => {
    if (feedback) return;
    const newSet = new Set(selectedAnswerIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAnswerIds(newSet);
  };

  const confirmSelection = async () => {
    if (isSubmitting || selectedAnswerIds.size === 0) return;
    setIsSubmitting(true);
    stopTimer();
    try {
      // ZMIANA: api.post
      const res = await api.post(`/quiz/answer/${deckId}`, {
        answer_ids: Array.from(selectedAnswerIds)
      });

      const result = res.data;
      
      applyProgress(result);
      
      if (!result.finished) {
          startTimer();
      } else {
          stopTimer();
      }

      setFeedback({
        isCorrect: result.is_correct,
        correctIds: new Set(result.correct_ids),
        finished: result.finished
      });
      setMascotEvent(previous => ({
        mood: result.is_correct ? 'cheer' : 'encourage',
        message: result.is_correct
          ? (result.question_streak >= 2 ? 'Opanowane! To pytanie masz już w małym palcu.' : 'Dobra odpowiedź! Jeszcze raz i pytanie będzie opanowane.')
          : 'Nic nie szkodzi — to pytanie wróci później. Następnym razem będzie łatwiej.',
        serial: previous.serial + 1,
      }));
      if (result.finished) setSummary(result);
    } catch (err) {
      toast.error("Błąd wysyłania odpowiedzi");
      startTimer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (!isPaused) {
        // ZMIANA: api.post
        const res = await api.post(`/quiz/pause/${deckId}`);
        applyProgress(res.data);
        setIsPaused(true);
        stopTimer();
      } else {
        // ZMIANA: api.post
        const res = await api.post(`/quiz/resume/${deckId}`);
        applyProgress(res.data);
        setIsPaused(false);
        startTimer();
        if (!question) loadNextQuestion();
      }
    } catch (err) { toast.error("Błąd pauzy"); }
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

  useEffect(() => {
    const handleKeyboard = event => {
      if (!window.matchMedia('(min-width: 1024px)').matches || view !== 'quiz') return;
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

      if (exitModalOpen) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          setExitChoice(choice => choice === 'stay' ? 'exit' : 'stay');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (exitChoice === 'exit') exitQuiz();
          else setExitModalOpen(false);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setExitModalOpen(false);
        }
        return;
      }

      if (/^[1-9]$/.test(event.key) && !feedback && !isPaused) {
        const answer = question?.answers[Number(event.key) - 1];
        if (answer) {
          event.preventDefault();
          toggleAnswer(answer.id);
        }
      } else if (event.code === 'Space' && !isPaused && !isSubmitting) {
        if (!feedback && selectedAnswerIds.size > 0) {
          event.preventDefault();
          confirmSelection();
        } else if (feedback) {
          event.preventDefault();
          if (feedback.finished) setView('end');
          else loadNextQuestion();
        }
      } else if (event.key.toLowerCase() === 'p' && !isSubmitting) {
        event.preventDefault();
        handlePauseToggle();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        requestExit();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [view, exitModalOpen, exitChoice, feedback, isPaused, isSubmitting, selectedAnswerIds, question]);

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
  }, [view, isPaused, deckId]);

  const progressPercent = progress.initial_questions > 0 ? (progress.mastered_questions / progress.initial_questions) * 100 : 0;

  const getButtonClass = (ansId) => {
    const baseClass = "w-full p-4 text-left rounded-xl border-2 transition-colors font-medium flex justify-between items-center group relative overflow-hidden ";
    if (!feedback) {
      return baseClass + (selectedAnswerIds.has(ansId) 
        ? "border-blue-500 bg-blue-500/20 text-blue-200"
        : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:border-slate-500");
    }
    const isSelected = selectedAnswerIds.has(ansId);
    const isActuallyCorrect = feedback.correctIds.has(ansId);

    if (isSelected && isActuallyCorrect) return baseClass + "border-green-500 bg-green-500/20 text-green-300";
    if (isSelected && !isActuallyCorrect) return baseClass + "border-red-500 bg-red-500/20 text-red-300 opacity-80";
    if (!isSelected && isActuallyCorrect) return baseClass + "border-yellow-500 bg-yellow-500/10 text-yellow-300 border-dashed opacity-80";
    return baseClass + "border-slate-800 bg-slate-900/50 text-slate-600 opacity-50";
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-950 text-white font-sans flex flex-col items-center py-6 md:py-8 px-4 relative">
      
      {/* TŁO (FIXED) */}

      {/* PAUZA OVERLAY */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <Coffee className="w-16 h-16 text-yellow-400 mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold mb-6">Pauza ☕</h2>
            <button onClick={handlePauseToggle} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-full font-bold shadow-lg transition-all flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" /> Wznów naukę
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExitModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Zamknij potwierdzenie" />
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} role="dialog" aria-modal="true" aria-labelledby="exit-title" className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <div className="mb-6 text-center"><h2 id="exit-title" className="text-2xl font-bold">Wyjść z quizu?</h2><p className="mt-2 text-sm text-slate-400">Postęp zostanie zapisany, a sesja automatycznie wstrzymana.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setExitModalOpen(false)} onMouseEnter={() => setExitChoice('stay')} className={`rounded-xl border px-4 py-4 font-semibold transition ${exitChoice === 'stay' ? 'border-blue-500 bg-blue-500/15 text-blue-200' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>Zostań</button>
                <button onClick={exitQuiz} onMouseEnter={() => setExitChoice('exit')} className={`rounded-xl border px-4 py-4 font-semibold transition ${exitChoice === 'exit' ? 'border-red-500 bg-red-500/15 text-red-200' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>Wyjdź</button>
              </div>
              <p className="mt-4 hidden text-center text-xs text-slate-500 lg:block">Wybierz strzałkami ← → i zatwierdź Enterem</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LOADING */}
      {view === 'loading' && <div className="text-blue-400 animate-pulse font-mono text-xl relative z-10 mt-20">Inicjalizacja...</div>}

      {/* --- START SCREEN --- */}
      {view === 'start' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10 text-center mt-10">
          <h1 className="text-3xl font-bold mb-2">Gotowy?</h1>
          <p className="text-slate-400 mb-8">{deckTitle}</p>
          
          <div className="space-y-4">
            {sessionData && sessionData.has_active_session && (
              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl mb-6">
                <p className="text-blue-200 font-semibold mb-1">Znaleziono aktywną sesję</p>
                <div className="flex justify-center gap-4 text-sm text-blue-300/70 mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(sessionData.time_spent)}</span>
                    <span>•</span>
                    <span>Pozostało: {sessionData.remaining}</span>
                </div>
                <button onClick={() => handleStart(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all text-white">
                  Kontynuuj naukę
                </button>
              </div>
            )}
            
            <button onClick={() => handleStart(true)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition-all text-slate-300 hover:text-white">
              {sessionData?.has_active_session ? "Zignoruj i zacznij od nowa" : "Rozpocznij naukę"}
            </button>
            
            <button onClick={() => navigate('/decks')} className="text-slate-500 hover:text-slate-400 text-sm mt-4 block mx-auto">
              Wróć do zestawów
            </button>
          </div>
        </motion.div>
      )}

      {/* --- QUIZ SCREEN --- */}
      {view === 'quiz' && (
        <div className="relative z-10 flex w-full max-w-2xl flex-col gap-4 lg:grid lg:h-[calc(100dvh-4rem)] lg:max-w-7xl lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_19rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-5 lg:overflow-hidden">
          
          {/* HUD GÓRNY */}
          <div className="sticky top-2 z-20 rounded-2xl border border-white/5 bg-slate-900 p-3 shadow-lg lg:static lg:col-span-2 lg:row-start-1">
             <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                    <div className="flex justify-between text-xs text-slate-400 uppercase font-bold mb-1">
                    <span>Postęp</span>
                    <span>{progress.mastered_questions} / {progress.initial_questions}</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-green-500" />
                    </div>
                    <p className="mt-1 text-[10px] normal-case tracking-normal text-slate-500">Opanowane po 2 poprawnych odpowiedziach z rzędu</p>
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <button onClick={handlePauseToggle} className="text-slate-400 hover:text-yellow-400 transition-colors" title="Pauza"><Pause className="w-5 h-5" /></button>
                    <div className="font-mono text-xl font-bold text-blue-400 tracking-wider w-16 text-right">{formatTime(timer)}</div>
                    <button onClick={requestExit} className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-2" title="Wróć do zestawów"><X className="w-6 h-6" /></button>
                </div>
             </div>
          </div>

          <aside className="rounded-2xl border border-white/5 bg-slate-900 p-4 lg:col-start-2 lg:row-start-2 lg:flex lg:min-h-0 lg:flex-col lg:p-5">
            <div className="mb-3 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-200">Bilans odpowiedzi</span>
              <span className="text-xs text-slate-500">{progress.total_answers} prób</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
              {progress.total_answers > 0 && <>
                <motion.div initial={{ width: 0 }} animate={{ width: `${(progress.correct_answers / progress.total_answers) * 100}%` }} transition={{ duration: 0.35 }} className="h-full bg-green-500" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(progress.incorrect_answers / progress.total_answers) * 100}%` }} transition={{ duration: 0.35 }} className="h-full bg-red-500" />
              </>}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-green-400"><span className="h-2 w-2 rounded-full bg-green-500" /> Poprawne: {progress.correct_answers}</span>
              <span className="flex items-center gap-2 text-red-400">Błędne: {progress.incorrect_answers} <span className="h-2 w-2 rounded-full bg-red-500" /></span>
            </div>
            <div className="mt-5 hidden space-y-3 border-t border-white/5 pt-5 lg:block">
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3"><span className="text-sm text-slate-400">Opanowane</span><strong className="text-blue-400">{progress.mastered_questions}/{progress.initial_questions}</strong></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3"><span className="text-sm text-slate-400">W kolejce</span><strong>{remaining}</strong></div>
              <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3"><span className="text-sm text-slate-400">Czas</span><strong className="font-mono text-blue-400">{formatTime(timer)}</strong></div>
            </div>
            <StudyMascot event={mascotEvent} />
            <div className="mt-auto hidden rounded-xl border border-blue-500/10 bg-blue-500/5 p-4 text-xs leading-relaxed text-slate-400 lg:block"><strong className="mb-1 block text-blue-300">Jak działa opanowanie?</strong>Dwie poprawne odpowiedzi z rzędu kończą naukę pytania. Błąd zeruje serię i odkłada pytanie dalej.</div>
            <div className="mt-3 hidden grid-cols-2 gap-2 text-[11px] text-slate-500 lg:grid"><span><kbd className="text-slate-300">1–9</kbd> odpowiedzi</span><span><kbd className="text-slate-300">Spacja</kbd> zatwierdź</span><span><kbd className="text-slate-300">P</kbd> pauza</span><span><kbd className="text-slate-300">Esc</kbd> wyjście</span></div>
          </aside>

          <AnimatePresence mode="wait">
            {question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="relative mb-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl md:p-8 lg:col-start-1 lg:row-start-2 lg:mb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:p-7"
              >
                <h2 className="text-2xl font-bold mb-2 leading-tight">{localized(question)}</h2>
                <p className="text-slate-500 text-sm mb-6">Zaznacz poprawne odpowiedzi:</p>

                <div className="mb-6 space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                  {question.answers.map((ans, index) => (
                    <button key={ans.id} onClick={() => toggleAnswer(ans.id)} disabled={feedback !== null} className={getButtonClass(ans.id)}>
                      <span className="relative z-10 flex min-w-0 items-center gap-3"><span className="hidden h-7 w-7 flex-none items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-slate-500 lg:flex">{index + 1}</span><span>{localized(ans)}</span></span>
                      {feedback && feedback.correctIds.has(ans.id) && <CheckCircle className="w-5 h-5 text-green-400 min-w-[20px] ml-2" />}
                      {feedback && !feedback.correctIds.has(ans.id) && selectedAnswerIds.has(ans.id) && <XCircle className="w-5 h-5 text-red-400 min-w-[20px] ml-2" />}
                    </button>
                  ))}
                </div>

                <div className="mt-auto flex h-40 flex-none flex-col justify-end overflow-hidden border-t border-white/5 pt-4 lg:h-20">
                  {!feedback ? (
                    <button
                      onClick={confirmSelection}
                      disabled={selectedAnswerIds.size === 0 || isSubmitting}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedAnswerIds.size > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      {isSubmitting ? 'Sprawdzanie...' : 'Zatwierdź odpowiedź'}
                    </button>
                  ) : (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className={`mb-4 flex min-h-7 items-center justify-center gap-2 text-center text-lg font-bold lg:hidden ${feedback.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                         {feedback.isCorrect ? <><CheckCircle /> Świetnie! Tak trzymaj.</> : <><AlertCircle /> Błąd. Uczymy się dalej.</>}
                      </div>
                      <button
                        onClick={feedback.finished ? () => setView('end') : loadNextQuestion}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg text-white flex items-center justify-center gap-2 ${feedback.finished ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'}`}
                      >
                        {feedback.finished ? <>Zakończ sesję <Home className="w-5 h-5" /></> : <>Następne pytanie <Play className="w-5 h-5" /></>}
                      </button>
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --- END SCREEN --- */}
      {view === 'end' && (
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 mt-6 w-full max-w-3xl">
          <div className="mb-6 text-center"><SummaryCelebration /><h1 className="text-4xl font-bold text-green-400">Sesja ukończona ! Należy się PIWO !!!</h1><p className="mt-2 text-slate-400">Wszystkie pytania zostały opanowane dwa razy z rzędu.</p></div>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 text-center"><strong className="block text-2xl">{summary?.initial_questions ?? progress.initial_questions}</strong><span className="text-xs text-slate-500">Opanowane pytania</span></div>
            <div className="rounded-2xl border border-green-500/10 bg-green-500/5 p-4 text-center"><strong className="block text-2xl text-green-400">{summary?.correct_answers ?? progress.correct_answers}</strong><span className="text-xs text-slate-500">Poprawne próby</span></div>
            <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-center"><strong className="block text-2xl text-red-400">{summary?.incorrect_answers ?? progress.incorrect_answers}</strong><span className="text-xs text-slate-500">Błędne próby</span></div>
            <div className="rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4 text-center"><strong className="block font-mono text-2xl text-blue-400">{formatTime(summary?.time_spent ?? timer)}</strong><span className="text-xs text-slate-500">Czas nauki</span></div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/[0.07] bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold">Skuteczność odpowiedzi</span><span className="text-slate-400">{summary?.total_answers ? Math.round((summary.correct_answers / summary.total_answers) * 100) : 0}%</span></div>
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-800"><div className="bg-green-500 transition-all" style={{ width: `${summary?.total_answers ? (summary.correct_answers / summary.total_answers) * 100 : 0}%` }} /><div className="flex-1 bg-red-500/70" /></div>
            <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Poprawne: {summary?.correct_answers ?? 0}</span><span>Błędne: {summary?.incorrect_answers ?? 0}</span></div>
          </div>

          {summary?.difficult_questions?.length > 0 && <div className="mb-6 rounded-2xl border border-white/[0.07] bg-slate-900/80 p-5"><h2 className="mb-3 font-bold">Najtrudniejsze pytania</h2><div className="space-y-2">{summary.difficult_questions.map(item => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-950/60 p-3 text-sm"><span className="min-w-0 truncate text-slate-300">{localized(item)}</span><span className="flex-none text-red-400">{item.incorrect} bł.</span></div>)}</div></div>}

          <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"><button onClick={() => navigate('/decks')} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-bold hover:bg-blue-500"><Home className="h-5 w-5" /> Zestawy</button><button onClick={() => handleStart(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 py-3 font-bold text-slate-300 hover:bg-slate-800"><RotateCcw className="h-5 w-5" /> Powtórz</button></div>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;
