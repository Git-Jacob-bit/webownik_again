import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api';

// Zdarzenie wysyłane przez przycisk „Dodaj” w powłoce aplikacji.
export const CREATE_EVENT = 'webownik:create';

// Otwiera formularz tworzenia: po kliknięciu „Dodaj” albo po przejściu z flagą state.create.
export const useCreateRequest = onRequest => {
  const location = useLocation();
  const handler = useRef(onRequest);
  handler.current = onRequest;

  useEffect(() => {
    if (location.state?.create) {
      const timer = window.setTimeout(() => handler.current(), 60);
      window.history.replaceState({}, document.title);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [location.state]);

  useEffect(() => {
    const listener = () => handler.current();
    window.addEventListener(CREATE_EVENT, listener);
    return () => window.removeEventListener(CREATE_EVENT, listener);
  }, []);
};

// Przewija do formularza i ustawia fokus na pierwszym polu oznaczonym data-autofocus.
export const focusForm = id => {
  window.setTimeout(() => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.querySelector('[data-autofocus]')?.focus({ preventScroll: true });
  }, 80);
};



export const isTranslating = deck => ['queued', 'processing'].includes(deck?.translation_status);

export const translationLabel = (deck, t) => {
  if (deck.translation_status === 'ready') return t('Wersja angielska gotowa');
  if (deck.translation_status === 'failed') return t('Błąd tłumaczenia');
  if (deck.translation_status === 'processing') {
    const percentage = deck.translation_total > 0 ? Math.round((deck.translation_completed / deck.translation_total) * 100) : 0;
    return t('Tłumaczenie {p}%', { p: percentage });
  }
  if (deck.translation_status === 'queued') return t('W kolejce do tłumaczenia');
  return t('Bez tłumaczenia');
};

// Postęp nauki dla zestawów z /quiz/status/{id}: aktywna sesja albo ostatnie podsumowanie.
// Zwraca mapę id → { active, initial, mastered, struggling, remaining, totalAnswers, timeSpent }.
export const useDeckProgress = deckIds => {
  const [progress, setProgress] = useState({});
  const key = deckIds.join(',');

  useEffect(() => {
    if (!key) { setProgress({}); return undefined; }
    let alive = true;
    const ids = key.split(',');
    Promise.allSettled(ids.map(id => api.get(`/quiz/status/${id}`))).then(results => {
      if (!alive) return;
      const next = {};
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return;
        const data = result.value.data;
        const source = data.has_active_session ? data : data.last_summary;
        if (!source) return;
        next[ids[index]] = {
          active: Boolean(data.has_active_session),
          initial: source.initial_questions || 0,
          mastered: source.mastered_questions || 0,
          struggling: source.struggling_questions || 0,
          remaining: source.remaining || 0,
          totalAnswers: source.total_answers || 0,
          timeSpent: source.time_spent || 0,
        };
      });
      setProgress(next);
    });
    return () => { alive = false; };
  }, [key]);

  return progress;
};

