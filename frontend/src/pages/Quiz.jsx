import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, Play, CheckCircle, XCircle, AlertCircle, Home, RotateCcw, Coffee, X, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const Quiz = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // --- STANY ---
  const [view, setView] = useState('loading'); 
  const [deckTitle, setDeckTitle] = useState('');
  const [sessionData, setSessionData] = useState(null);
  
  const [question, setQuestion] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [initialCount, setInitialCount] = useState(0);
  
  const [selectedAnswerIds, setSelectedAnswerIds] = useState(new Set());
  const [feedback, setFeedback] = useState(null);
  
  // Zegar
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerIntervalRef = useRef(null);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/quiz/status/${deckId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setDeckTitle(`Zestaw #${deckId}`);
        if (res.data.has_active_session) {
          setSessionData(res.data);
          // Ustawiamy timer od razu, żeby wyświetlić go na ekranie startowym
          setTimer(res.data.time_spent || 0);
        }
        setView('start');
      } catch (err) {
        toast.error("Błąd ładowania quizu");
        navigate('/dashboard');
      }
    };
    fetchStatus();
    return () => stopTimer();
  }, [deckId, navigate, token]);

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

  // --- AKCJE ---
  const handleStart = async (forceNew) => {
    try {
      const res = await axios.post(`http://localhost:8000/quiz/start/${deckId}`, { force_new: forceNew }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newTime = res.data.time_spent || 0;
      setTimer(newTime);
      setRemaining(res.data.remaining || 10); 
      setInitialCount(res.data.remaining || 10);
      
      setView('quiz');
      startTimer(); // Startujemy zegar dopiero tutaj
      loadNextQuestion();
    } catch (err) {
      toast.error("Nie udało się rozpocząć quizu.");
    }
  };

  const loadNextQuestion = async () => {
    setSelectedAnswerIds(new Set());
    setFeedback(null);
    
    // Przewiń na górę przy nowym pytaniu (przydatne na mobile)
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const res = await axios.get(`http://localhost:8000/quiz/next/${deckId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.finished) {
        stopTimer(); // <--- WAŻNE: Zatrzymujemy zegar natychmiast
        setView('end');
        return;
      }
      setQuestion(res.data.question);
      setRemaining(res.data.remaining);
      if (initialCount === 0 || res.data.remaining > initialCount) {
         setInitialCount(res.data.remaining); 
      }
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
    stopTimer(); // Pauza na czas requestu
    try {
      const res = await axios.post(`http://localhost:8000/quiz/answer/${deckId}`, {
        answer_ids: Array.from(selectedAnswerIds)
      }, { headers: { Authorization: `Bearer ${token}` } });

      const result = res.data;
      
      // Aktualizujemy czas z serwera
      if (result.time_spent !== undefined) setTimer(result.time_spent);
      
      // Jeśli to nie koniec, wznawiamy zegar. Jeśli koniec - NIE wznawiamy.
      if (!result.finished) {
          startTimer();
      } else {
          stopTimer(); // Dla pewności
      }

      setFeedback({
        isCorrect: result.is_correct,
        correctIds: new Set(result.correct_ids),
        finished: result.finished
      });
    } catch (err) {
      toast.error("Błąd wysyłania odpowiedzi");
      startTimer();
    }
  };

  const handlePauseToggle = async () => {
    try {
      if (!isPaused) {
        await axios.post(`http://localhost:8000/quiz/pause/${deckId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsPaused(true);
        stopTimer();
      } else {
        await axios.post(`http://localhost:8000/quiz/resume/${deckId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setIsPaused(false);
        startTimer();
      }
    } catch (err) { toast.error("Błąd pauzy"); }
  };

  const progressPercent = initialCount > 0 ? ((initialCount - remaining) / initialCount) * 100 : 0;

  const getButtonClass = (ansId) => {
    const baseClass = "w-full p-4 text-left rounded-xl border-2 transition-all font-medium flex justify-between items-center group relative overflow-hidden ";
    if (!feedback) {
      return baseClass + (selectedAnswerIds.has(ansId) 
        ? "border-blue-500 bg-blue-500/20 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
        : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:border-slate-500");
    }
    const isSelected = selectedAnswerIds.has(ansId);
    const isActuallyCorrect = feedback.correctIds.has(ansId);

    if (isSelected && isActuallyCorrect) return baseClass + "border-green-500 bg-green-500/20 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.5)]";
    if (isSelected && !isActuallyCorrect) return baseClass + "border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)] opacity-80";
    if (!isSelected && isActuallyCorrect) return baseClass + "border-yellow-500 bg-yellow-500/10 text-yellow-300 border-dashed opacity-80";
    return baseClass + "border-slate-800 bg-slate-900/50 text-slate-600 opacity-50";
  };

  return (
    // ZMIANA: fixed zamiast absolute w tle + min-h-screen z paddingiem dla scrollowania
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center py-8 px-4 relative">
      
      {/* TŁO (FIXED - nie przewija się, zawsze wypełnia ekran) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20"></div>
        <div className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* PAUZA OVERLAY (FIXED) */}
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
            
            <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-400 text-sm mt-4 block mx-auto">
              Wróć do menu
            </button>
          </div>
        </motion.div>
      )}

      {/* --- QUIZ SCREEN --- */}
      {view === 'quiz' && (
        <div className="w-full max-w-2xl relative z-10 flex flex-col gap-6">
          
          {/* HUD GÓRNY (Sticky - przyklejony przy scrollowaniu, opcjonalnie) */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 backdrop-blur-md sticky top-2 z-20 shadow-xl">
             <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                    <div className="flex justify-between text-xs text-slate-400 uppercase font-bold mb-1">
                    <span>Postęp</span>
                    <span>{Math.max(0, initialCount - remaining)} / {initialCount}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                </div>
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <button onClick={handlePauseToggle} className="text-slate-400 hover:text-yellow-400 transition-colors" title="Pauza"><Pause className="w-5 h-5" /></button>
                    <div className="font-mono text-xl font-bold text-blue-400 tracking-wider w-16 text-right">{formatTime(timer)}</div>
                    <button onClick={() => navigate('/dashboard')} className="p-1 text-slate-400 hover:text-red-400 transition-colors ml-2" title="Wyjdź"><X className="w-6 h-6" /></button>
                </div>
             </div>
          </div>

          <AnimatePresence mode="wait">
            {question && (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl relative mb-20" // margin bottom żeby było miejsce na scroll
              >
                <h2 className="text-2xl font-bold mb-2 leading-tight">{question.content}</h2>
                <p className="text-slate-500 text-sm mb-6">Zaznacz poprawne odpowiedzi:</p>

                {/* Lista odpowiedzi - scrolluje się naturalnie z całą stroną */}
                <div className="space-y-3 mb-8">
                  {question.answers.map(ans => (
                    <button key={ans.id} onClick={() => toggleAnswer(ans.id)} disabled={feedback !== null} className={getButtonClass(ans.id)}>
                      <span className="relative z-10">{ans.content}</span>
                      {feedback && feedback.correctIds.has(ans.id) && <CheckCircle className="w-5 h-5 text-green-400 min-w-[20px] ml-2" />}
                      {feedback && !feedback.correctIds.has(ans.id) && selectedAnswerIds.has(ans.id) && <XCircle className="w-5 h-5 text-red-400 min-w-[20px] ml-2" />}
                    </button>
                  ))}
                </div>

                {/* Sekcja przycisków - zawsze na dole kontenera */}
                <div className="min-h-[120px] mt-4 pt-4 border-t border-white/5">
                  {!feedback ? (
                    <button
                      onClick={confirmSelection}
                      disabled={selectedAnswerIds.size === 0}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${selectedAnswerIds.size > 0 ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                      Zatwierdź odpowiedź
                    </button>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                      <div className={`text-center mb-4 font-bold text-lg flex items-center justify-center gap-2 ${feedback.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
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
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mt-10 relative z-10">
          <div className="inline-block p-6 rounded-full bg-green-500/10 border border-green-500/20 mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
             <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">Gratulacje!</h1>
          <p className="text-slate-400 text-lg mb-8">
            Ukończono w czasie: <span className="text-white font-mono font-bold text-2xl ml-2">{formatTime(timer)}</span>
          </p>
          <div className="flex flex-col gap-3 w-64 mx-auto">
             <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"><Home className="w-5 h-5" /> Wróć do bazy</button>
             <button onClick={() => window.location.reload()} className="w-full py-3 bg-transparent border border-slate-700 text-slate-400 hover:text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"><RotateCcw className="w-5 h-5" /> Powtórz</button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Quiz;