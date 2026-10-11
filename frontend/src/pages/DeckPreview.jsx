import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import notify from '../components/ui/notify';
import { NewQuestionCard, QuestionCard, QuestionEditor } from '../components/deck/QuestionCards';
import { getErrorMessage } from '../utils/errors';

const sortDeck = deckData => {
  const questions = [...(deckData.questions || [])].sort((a, b) => a.id - b.id);
  questions.forEach(question => question.answers?.sort((a, b) => a.id - b.id));
  return questions;
};

const DeckPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, localized, localizedTitle, t } = useLanguage();
  const confirm = useConfirm();

  const [deck, setDeck] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [translationStarting, setTranslationStarting] = useState(false);
  const [translationError, setTranslationError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ content: '', answers: [] });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [isAdding, setIsAdding] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [addError, setAddError] = useState('');

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    try {
      const res = await api.get(`/decks/${id}`);
      const sorted = sortDeck(res.data);
      setDeck(res.data);
      setQuestions(sorted);
      setLoadError('');
      return sorted;
    } catch (err) {
      console.error(err);
      // Przy cichym odświeżaniu (postęp tłumaczenia) nie zasypujemy ekranu błędami.
      if (!silent) setLoadError(getErrorMessage(err, 'Zestaw nie istnieje albo wystąpił problem z połączeniem.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData, language]);

  useEffect(() => {
    if (!['queued', 'processing'].includes(deck?.translation_status)) return undefined;
    const timer = window.setInterval(() => fetchData({ silent: true }), 1500);
    return () => window.clearInterval(timer);
  }, [deck?.translation_status, fetchData]);

  const startTranslation = async () => {
    setTranslationStarting(true);
    setTranslationError('');
    try {
      await api.post(`/decks/${id}/translate`);
      await fetchData({ silent: true });
    } catch (err) {
      setTranslationError(getErrorMessage(err, 'Nie udało się uruchomić tłumaczenia.'));
    } finally {
      setTranslationStarting(false);
    }
  };

  const startEdit = question => {
    setEditError('');
    setEditingId(question.id);
    setEditForm({ content: question.content, answers: question.answers.map(answer => ({ ...answer })) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError('');
    setEditForm({ content: '', answers: [] });
  };

  const handleAnswerChange = (index, field, value) => {
    setEditForm(prev => ({ ...prev, answers: prev.answers.map((answer, i) => i === index ? { ...answer, [field]: value } : answer) }));
  };

  const addAnswer = () => {
    setEditForm(prev => ({ ...prev, answers: [...prev.answers, { id: null, key: `new-${Date.now()}`, content: '', is_correct: false }] }));
  };

  const removeAnswer = index => {
    setEditForm(prev => ({ ...prev, answers: prev.answers.filter((_, i) => i !== index) }));
  };

  const saveQuestion = async questionId => {
    setSaving(true);
    setEditError('');
    try {
      await api.put(`/decks/question/${questionId}/full`, {
        content: editForm.content,
        answers: editForm.answers.map(({ id: answerId, content, is_correct }) => ({ id: answerId, content, is_correct })),
      });
      notify.success(t('Zmiany zapisane.'));
      setEditingId(null);
      fetchData({ silent: true });
    } catch (err) {
      setEditError(getErrorMessage(err, 'Nie udało się zapisać pytania.'));
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async questionId => {
    if (!await confirm({ title: 'Usunąć pytanie?', message: 'Pytanie wraz ze wszystkimi odpowiedziami zostanie trwale usunięte.' })) return;
    try {
      await api.delete(`/decks/question/${questionId}`);
      setQuestions(prev => prev.filter(question => question.id !== questionId));
      if (editingId === questionId) cancelEdit();
      notify.success(t('Pytanie usunięte.'));
    } catch (err) {
      notify.error(t(getErrorMessage(err, 'Nie udało się usunąć pytania.')));
    }
  };

  const addNewQuestion = async event => {
    event.preventDefault();
    if (!newQuestionContent.trim()) return;
    setSaving(true);
    setAddError('');
    try {
      const res = await api.post(`/decks/${id}/question`, { content: newQuestionContent });
      notify.success(t('Pytanie dodane. Uzupełnij odpowiedzi.'));
      setNewQuestionContent('');
      setIsAdding(false);
      const created = (await fetchData({ silent: true }))?.find(question => question.id === res.data.id);
      if (created) startEdit(created);
    } catch (err) {
      setAddError(getErrorMessage(err, 'Nie udało się dodać pytania.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="desk flex min-h-[100dvh] items-center justify-center px-4" role="status">
      <p className="font-slab text-2xl font-bold text-muted motion-safe:animate-pulse">{t('Wczytujemy fiszki…')}</p>
    </div>
  );

  if (!deck) return (
    <main className="desk flex min-h-[100dvh] items-center justify-center px-4 py-10 text-ink">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <h1 className="font-slab text-4xl font-bold">{t('Nie udało się załadować zestawu')}</h1>
        <Alert type="error">{t(loadError || 'Zestaw nie istnieje albo wystąpił problem z połączeniem.')}</Alert>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <Button onClick={() => { setLoading(true); fetchData(); }}>{t('Spróbuj ponownie')}</Button>
          <Button variant="quiet" onClick={() => navigate('/decks')}>{t('Wróć do zestawów')}</Button>
        </div>
      </div>
    </main>
  );

  const status = deck.translation_status;
  const percent = deck.translation_total ? Math.round((deck.translation_completed / deck.translation_total) * 100) : 0;
  const translationLabel = status === 'ready'
    ? t('Gotowa, {done} z {total} {total|pytania|pytań|pytań}', { done: deck.translation_completed || 0, total: deck.translation_total || 0 })
    : status === 'failed' ? t('Błąd tłumaczenia')
      : status === 'processing' ? t('Tłumaczymy… {percent}%', { percent })
        : status === 'queued' ? t('W kolejce do tłumaczenia')
          : t('Jeszcze nie przetłumaczona');
  const barWidth = status === 'ready' ? 100 : status === 'processing' ? Math.max(2, percent) : status === 'queued' ? 4 : 0;

  return (
    <div className="desk min-h-[100dvh] text-ink">
      <main className="mx-auto flex max-w-[980px] flex-col gap-7 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <button type="button" onClick={() => navigate('/decks')} className="link self-start text-[15px]">{t('Wróć do zestawów')}</button>

        <header className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="break-words font-slab text-[40px] font-bold leading-none sm:text-[56px]">{localizedTitle(deck)}</h1>
            <p className="text-base text-muted">{t('Pytań: {n}. Kliknij „Edytuj”, żeby poprawić fiszkę.', { n: questions.length })}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Button variant="quiet" onClick={() => { setAddError(''); setIsAdding(value => !value); }} aria-expanded={isAdding}>{t(isAdding ? 'Anuluj dodawanie' : 'Dodaj pytanie')}</Button>
            <Button onClick={() => navigate(`/quiz/${deck.id}`)} disabled={!questions.length}>{t('Ucz się')}</Button>
          </div>
        </header>

        <section className="flex flex-col gap-3 rounded-lg bg-panel px-5 py-4 ring-1 ring-inset ring-ink/15" aria-label={t('Wersja angielska')}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="font-bold">{t('Wersja angielska')}</span>
            <span className="h-2 min-w-[140px] flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
              <span className={`block h-full rounded-full bg-accent transition-[width] duration-500 ${status === 'queued' ? 'motion-safe:animate-pulse' : ''}`} style={{ width: `${barWidth}%` }} />
            </span>
            <span className="tabular-nums text-muted" role="status">{translationLabel}</span>
            {!['ready', 'queued', 'processing'].includes(status) && (
              <Button size="sm" variant="outline" onClick={startTranslation} loading={translationStarting}>
                {t(status === 'failed' ? 'Ponów tłumaczenie' : 'Uruchom tłumaczenie')}
              </Button>
            )}
          </div>
          {translationError && <Alert type="error">{t(translationError)}</Alert>}
        </section>

        <div className="flex flex-col gap-6">
          {isAdding && (
            <div className="flex flex-col gap-3">
              <NewQuestionCard
                value={newQuestionContent}
                onChange={setNewQuestionContent}
                onSubmit={addNewQuestion}
                onCancel={() => setIsAdding(false)}
                saving={saving}
              />
              {addError && <Alert type="error">{t(addError)}</Alert>}
            </div>
          )}

          {questions.map((question, index) => (
            editingId === question.id ? (
              <div key={question.id} className="flex flex-col gap-3">
                <QuestionEditor
                  number={index + 1}
                  form={editForm}
                  saving={saving}
                  onContent={value => setEditForm(prev => ({ ...prev, content: value }))}
                  onAnswer={handleAnswerChange}
                  onAddAnswer={addAnswer}
                  onRemoveAnswer={removeAnswer}
                  onSave={() => saveQuestion(question.id)}
                  onCancel={cancelEdit}
                  onDelete={() => deleteQuestion(question.id)}
                />
                {editError && <Alert type="error">{t(editError)}</Alert>}
              </div>
            ) : (
              <QuestionCard key={question.id} question={question} number={index + 1} localized={localized} onEdit={() => startEdit(question)} />
            )
          ))}

          {questions.length === 0 && !isAdding && (
            <div className="flex flex-col items-start gap-4 rounded-lg border-2 border-dashed border-ink/20 px-6 py-10">
              <p className="font-slab text-2xl font-bold">{t('Ten zestaw jest pusty.')}</p>
              <p className="text-muted">{t('Dodaj pierwsze pytanie, a potem uzupełnij odpowiedzi.')}</p>
              <Button onClick={() => setIsAdding(true)}>{t('Dodaj pierwsze pytanie')}</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DeckPreview;
