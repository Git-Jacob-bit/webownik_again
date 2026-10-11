import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Pencil, Search } from 'lucide-react';
import api from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import notify from '../../components/ui/notify';
import { getErrorMessage } from '../../utils/errors';
import { DeleteButton, SectionHeading } from './parts';
import { focusForm, useCreateRequest } from './shared';

const tilts = ['-0.4deg', '0.5deg', '-0.2deg', '0.3deg', '-0.5deg', '0.2deg'];

const NotesView = ({ onCountsChange }) => {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
      onCountsChange?.('notes', res.data.length);
    } catch {
      notify.error(t('Nie udało się pobrać notatek.'));
    }
  }, [onCountsChange, t]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);
  useCreateRequest(() => { setCreateOpen(true); focusForm('create-note'); });

  const resetForm = () => { setTitle(''); setContent(''); setEditingId(null); setError(''); };

  const handleSave = async event => {
    event.preventDefault();
    if (!title.trim()) { setError(t('Wpisz tytuł notatki.')); return; }
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/notes/${editingId}`, { title, content });
        notify.success(t('Notatka zapisana.'));
      } else {
        await api.post('/notes', { title, content });
        notify.success(t('Notatka dodana.'));
      }
      resetForm();
      setCreateOpen(false);
      fetchNotes();
    } catch (err) {
      setError(getErrorMessage(err, t('Nie udało się zapisać notatki.')));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = note => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content || '');
    setError('');
    setCreateOpen(true);
    focusForm('create-note');
  };

  const deleteNote = async note => {
    if (!await confirm({ title: 'Usunąć notatkę?', message: 'Tej operacji nie można cofnąć.' })) return;
    try {
      await api.delete(`/notes/${note.id}`);
      if (editingId === note.id) resetForm();
      notify.info(t('Notatka usunięta.'));
      fetchNotes();
    } catch (err) {
      notify.error(getErrorMessage(err, t('Nie udało się usunąć notatki.')));
    }
  };

  const query = searchTerm.toLowerCase();
  const filteredNotes = notes.filter(note => note.title.toLowerCase().includes(query) || (note.content || '').toLowerCase().includes(query));

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-10">
      <section id="create-note" className="flex w-full scroll-mt-28 flex-col gap-4 lg:max-w-[460px] lg:flex-[1_1_360px]">
        <button type="button" aria-expanded={createOpen} aria-controls="note-form" onClick={() => setCreateOpen(value => !value)} className="flex min-h-[52px] items-center justify-between rounded-md px-4 text-left font-slab text-2xl font-bold ring-[1.5px] ring-inset ring-ink/15 lg:hidden">
          {editingId ? t('Edytuj notatkę') : t('Nowa notatka')}<ChevronDown className={`h-5 w-5 transition ${createOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <form id="note-form" onSubmit={handleSave} noValidate className={`${createOpen ? 'flex' : 'hidden'} flex-col gap-4 lg:flex`}>
          <h2 className="hidden font-slab text-[40px] font-bold leading-none lg:block">{editingId ? t('Edytuj notatkę') : t('Nowa notatka')}</h2>
          <Alert>{error}</Alert>
          <div className="on-paper rounded-[4px] bg-card px-5 pb-5 text-card-ink shadow-[0_0_0_2px_rgb(var(--c-pen)),0_24px_40px_-22px_var(--shadow)]">
            <label className="sr-only" htmlFor="note-title">{t('Tytuł notatki')}</label>
            <input id="note-title" data-autofocus value={title} onChange={event => setTitle(event.target.value)} placeholder={t('Tytuł')} className="h-14 w-full bg-transparent font-slab text-2xl font-bold text-card-ink outline-none placeholder:text-card-muted/70 focus-visible:outline-none" />
            <div className="-mx-5 h-[3px] bg-pen" />
            <label className="sr-only" htmlFor="note-content">{t('Treść notatki')}</label>
            <textarea
              id="note-content"
              rows={8}
              value={content}
              onChange={event => setContent(event.target.value)}
              placeholder={t('Co chcesz zapamiętać?')}
              className="mt-0.5 w-full resize-y bg-transparent text-base leading-8 text-card-ink outline-none placeholder:text-card-muted/70 focus-visible:outline-none"
              style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 31px, rgb(70 100 150 / 0.15) 31px 32px)', backgroundAttachment: 'local' }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <Button type="submit" loading={saving}>{editingId ? t('Zapisz zmiany') : t('Zapisz notatkę')}</Button>
            {(editingId || title || content) && <Button variant="quiet" size="sm" onClick={resetForm}>{editingId ? t('Anuluj edycję') : t('Wyczyść')}</Button>}
          </div>
        </form>
      </section>

      <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
        <SectionHeading
          aside={(
            <label className="flex min-h-[50px] w-full items-center gap-2.5 rounded-md bg-field px-3.5 ring-[1.5px] ring-inset ring-ink/15 focus-within:ring-2 focus-within:ring-accent sm:w-[300px]">
              <Search className="h-[18px] w-[18px] flex-none text-faint" aria-hidden="true" />
              <input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={t('Szukaj w notatkach')} aria-label={t('Szukaj w notatkach')} className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint focus-visible:outline-none" />
            </label>
          )}
        >
          {t('Twoje notatki')} <span className="font-medium text-faint">{notes.length}</span>
        </SectionHeading>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] items-start gap-6">
          {filteredNotes.map((note, index) => {
            const expanded = expandedId === note.id;
            return (
              <article
                key={note.id}
                className={`on-paper flex flex-col rounded-[4px] bg-card px-5 pb-3 text-card-ink shadow-paper transition ${editingId === note.id ? 'ring-2 ring-pen' : ''}`}
                style={{ transform: `rotate(${tilts[index % tilts.length]})` }}
              >
                <h3 className="flex min-h-[46px] items-center break-words font-slab text-[19px] font-bold leading-tight">{note.title}</h3>
                <span className="-mx-5 h-[2px] bg-pen" />
                <p
                  className={`mt-1 whitespace-pre-wrap break-words text-[15px] leading-7 text-[#4A3A2E] ${expanded ? '' : 'line-clamp-4'}`}
                  style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 27px, rgb(70 100 150 / 0.14) 27px 28px)' }}
                >
                  {note.content || t('Pusta notatka')}
                </p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <button type="button" onClick={() => setExpandedId(expanded ? null : note.id)} aria-expanded={expanded} className="min-h-[44px] px-1 text-sm font-bold text-card-muted underline decoration-pen decoration-2 underline-offset-4">{expanded ? t('Zwiń') : t('Rozwiń')}</button>
                  <span className="flex">
                    <button type="button" onClick={() => startEdit(note)} aria-label={t('Edytuj notatkę {name}', { name: note.title })} title={t('Edytuj')} className="flex h-11 w-11 items-center justify-center rounded-md text-card-muted hover:bg-card-ink/10 hover:text-card-ink"><Pencil className="h-[18px] w-[18px]" aria-hidden="true" /></button>
                    <DeleteButton tone="paper" label={t('Usuń notatkę {name}', { name: note.title })} onClick={() => deleteNote(note)} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        {!notes.length && <p className="text-muted">{t('Nie masz jeszcze notatek. Zapisz pierwszą w formularzu obok.')}</p>}
        {notes.length > 0 && !filteredNotes.length && <p className="text-muted">{t('Żadna notatka nie pasuje do „{q}”.', { q: searchTerm })}</p>}
      </section>
    </div>
  );
};

export default NotesView;
