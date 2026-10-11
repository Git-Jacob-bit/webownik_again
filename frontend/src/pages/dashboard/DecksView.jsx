import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search } from 'lucide-react';
import api from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import notify from '../../components/ui/notify';
import { getErrorMessage } from '../../utils/errors';
import { DeleteButton, MasteryBar, SectionHeading } from './parts';
import { focusForm, isTranslating, translationLabel, useCreateRequest, useDeckProgress } from './shared';

const chipLook = deck => {
  if (deck.translation_status === 'ready') return 'bg-[#4E7A42]/15 text-[#2F5A26]';
  if (deck.translation_status === 'failed') return 'bg-pen/15 text-[#8E2A22]';
  if (isTranslating(deck)) return 'bg-pen/10 text-[#9E2F27]';
  return 'bg-card-ink/10 text-card-muted';
};

const FormatHelp = ({ open, onClose, t }) => (
  <Modal open={open} onClose={onClose} title={t('Format pliku z pytaniami')} description={t('Każdy plik musi mieć rozszerzenie .txt. Jedno pytanie składa się z maski poprawnych odpowiedzi, treści pytania i listy odpowiedzi.')} size="lg">
    <pre className="overflow-x-auto rounded-md bg-card p-4 font-mono text-sm leading-7 text-card-ink shadow-paper"><code>{`X1000
Która planeta jest najbliżej Słońca?
a) Merkury
b) Wenus
c) Ziemia
d) Mars

X1010
Które liczby są parzyste?
a) 2
b) 3
c) 4
d) 5`}</code></pre>
    <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed">
      <li><strong className="font-bold">X1000</strong> — {t('Każda cyfra odpowiada kolejnej odpowiedzi. 1 oznacza odpowiedź poprawną, a 0 błędną.')}</li>
      <li><strong className="font-bold">X1010</strong> — {t('Pytanie ma dwie poprawne odpowiedzi: pierwszą i trzecią. Liczba cyfr powinna odpowiadać liczbie odpowiedzi.')}</li>
      <li>{t('Pierwsza linia po masce to treść pytania. Następne linie są odpowiedziami aż do kolejnej maski zaczynającej się od X.')}</li>
      <li>{t('Import: możesz wybrać wiele plików TXT, folder albo jeden ZIP. W folderze i ZIP-ie pozostałe typy plików są pomijane.')}</li>
    </ul>
  </Modal>
);

const DecksView = ({ onCountsChange }) => {
  const navigate = useNavigate();
  const { language, localizedTitle, t } = useLanguage();
  const confirm = useConfirm();
  const [decks, setDecks] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [files, setFiles] = useState(null);
  const [fileNotice, setFileNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const fetchDecks = useCallback(async () => {
    try {
      const res = await api.get('/decks/mine');
      setDecks(res.data);
      onCountsChange?.('decks', res.data.length);
    } catch {
      notify.error(t('Nie udało się pobrać zestawów.'));
    }
  }, [onCountsChange, t]);

  useEffect(() => { fetchDecks(); }, [fetchDecks, language]);
  useEffect(() => {
    if (!decks.some(isTranslating)) return undefined;
    const timer = window.setTimeout(fetchDecks, 2000);
    return () => window.clearTimeout(timer);
  }, [decks, fetchDecks]);

  useCreateRequest(() => { setCreateOpen(true); focusForm('create-deck'); });

  // Postęp nauki pobieramy raz na listę zestawów (nie przy każdym odpytywaniu tłumaczenia).
  const ids = useMemo(() => decks.map(deck => deck.id), [decks.length, progressKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const progress = useDeckProgress(ids);

  const selectQuestionFiles = (selected, folderMode = false) => {
    setFormError('');
    setFileNotice('');
    let chosen = Array.from(selected || []);
    if (folderMode) {
      const textFiles = chosen.filter(file => file.name.toLowerCase().endsWith('.txt'));
      const ignoredCount = chosen.length - textFiles.length;
      chosen = textFiles;
      if (!chosen.length) {
        setFiles(null);
        setFormError(t('Wybrany folder nie zawiera plików .txt.'));
        return;
      }
      if (ignoredCount) setFileNotice(t('Pominięto {n} {n|plik inny|pliki inne|plików innych} niż .txt.', { n: ignoredCount }));
    }
    const extensions = chosen.map(file => file.name.toLowerCase().split('.').pop());
    if (extensions.some(extension => !['txt', 'zip'].includes(extension))) {
      setFiles(null);
      setFormError(t('Dozwolone są tylko pliki .txt lub archiwum .zip.'));
      return;
    }
    if (extensions.includes('zip') && (chosen.length !== 1 || extensions[0] !== 'zip')) {
      setFiles(null);
      setFormError(t('Archiwum ZIP wybierz osobno, bez dodatkowych plików.'));
      return;
    }
    setFiles(chosen);
  };

  const handleUpload = async event => {
    event.preventDefault();
    setFormError('');
    if (!deckName.trim()) { setFormError(t('Podaj nazwę zestawu.')); return; }
    if (!files?.length) { setFormError(t('Wybierz pliki .txt, folder z pytaniami albo archiwum ZIP.')); return; }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('deck_name', deckName);
    files.forEach(file => formData.append('files', file));
    try {
      await api.post('/decks/upload-form', formData);
      notify.success(t('Zestaw „{name}” utworzony.', { name: deckName.trim() }));
      setDeckName(''); setFiles(null); setFileNotice(''); setCreateOpen(false);
      await fetchDecks();
      setProgressKey(value => value + 1);
    } catch (err) {
      setFormError(getErrorMessage(err, t('Nie udało się wgrać zestawu.')));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDeck = async deck => {
    if (!await confirm({ title: 'Usunąć zestaw?', message: 'Zestaw wraz ze wszystkimi pytaniami zostanie trwale usunięty.' })) return;
    try {
      await api.delete(`/decks/${deck.id}`);
      notify.info(t('Zestaw usunięty.'));
      fetchDecks();
    } catch (err) {
      notify.error(getErrorMessage(err, t('Nie udało się usunąć zestawu.')));
    }
  };

  const filteredDecks = decks.filter(deck => localizedTitle(deck).toLowerCase().includes(searchTerm.toLowerCase()));
  const pickLabel = files?.length ? t('Wybrano plików: {n}', { n: files.length }) : '';

  return (
    <div className="flex flex-wrap gap-x-12 gap-y-10">
      <aside id="create-deck" className="flex w-full scroll-mt-28 flex-col gap-4 lg:max-w-[380px] lg:flex-[1_1_320px]">
        <button type="button" aria-expanded={createOpen} aria-controls="create-deck-form" onClick={() => setCreateOpen(value => !value)} className="flex min-h-[52px] items-center justify-between rounded-md px-4 text-left font-slab text-2xl font-bold ring-[1.5px] ring-inset ring-ink/15 lg:hidden">
          {t('Nowy zestaw')}<ChevronDown className={`h-5 w-5 transition ${createOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <form id="create-deck-form" onSubmit={handleUpload} noValidate className={`${createOpen ? 'flex' : 'hidden'} flex-col gap-4 lg:flex`}>
          <h2 className="hidden font-slab text-[40px] font-bold leading-none lg:block">{t('Nowy zestaw')}</h2>
          <p className="leading-relaxed text-muted">{t('Pytania w formacie Testownika: maska X1010, pod nią treść pytania, a niżej odpowiedzi.')}</p>
          <Alert>{formError}</Alert>
          <Field data-autofocus label={t('Nazwa zestawu')} value={deckName} onChange={event => setDeckName(event.target.value)} placeholder={t('np. Sieci komputerowe, kolokwium 2')} />
          <label className="flex cursor-pointer flex-col gap-1 rounded-md border-2 border-dashed border-ink/25 p-4 text-base font-bold transition focus-within:border-accent hover:border-accent">
            <input type="file" multiple accept=".txt,.zip,text/plain,application/zip" onChange={event => selectQuestionFiles(event.target.files)} className="sr-only" />
            {t('Wybierz pliki')}
            <span className="text-sm font-normal text-muted">{t('Wiele plików .txt albo jedno archiwum .zip')}</span>
          </label>
          <label className="flex cursor-pointer flex-col gap-1 rounded-md border-2 border-dashed border-ink/25 p-4 text-base font-bold transition focus-within:border-accent hover:border-accent">
            <input type="file" multiple accept=".txt,text/plain" webkitdirectory="" directory="" onChange={event => selectQuestionFiles(event.target.files, true)} className="sr-only" />
            {t('Wybierz cały folder')}
            <span className="text-sm font-normal text-muted">{t('Wczytamy tylko pliki .txt, resztę pominiemy')}</span>
          </label>
          {pickLabel && (
            <div className="flex items-center gap-2.5 rounded-md bg-raise px-3.5 py-3 text-sm" role="status">
              <span className="h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
              <span>{pickLabel}{fileNotice && ` ${fileNotice}`}</span>
            </div>
          )}
          <Button type="submit" block loading={isUploading}>{t('Utwórz zestaw')}</Button>
          <button type="button" className="link self-start text-sm" onClick={() => setHelpOpen(true)}>{t('Jak przygotować pliki?')}</button>
        </form>
      </aside>

      <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
        <SectionHeading
          aside={(
            <label className="flex min-h-[50px] w-full items-center gap-2.5 rounded-md bg-field px-3.5 ring-[1.5px] ring-inset ring-ink/15 focus-within:ring-2 focus-within:ring-accent sm:w-[300px]">
              <Search className="h-[18px] w-[18px] flex-none text-faint" aria-hidden="true" />
              <input type="search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={t('Szukaj zestawu')} aria-label={t('Szukaj zestawu')} className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint focus-visible:outline-none" />
            </label>
          )}
        >
          {t('Twoje zestawy')} <span className="font-medium text-faint">{decks.length}</span>
        </SectionHeading>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-6 gap-y-8">
          {filteredDecks.map(deck => {
            const p = progress[deck.id];
            return (
              <article key={deck.id} className="on-paper flex flex-col gap-3 rounded-[4px] bg-card px-5 pb-[18px] text-card-ink shadow-stack">
                <span className="-mx-5 mb-1.5 h-[3px] bg-pen" />
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-slab text-[23px] font-bold leading-tight">{localizedTitle(deck)}</h3>
                  <DeleteButton tone="paper" label={t('Usuń zestaw {name}', { name: localizedTitle(deck) })} onClick={() => deleteDeck(deck)} className="-mr-3 -mt-1" />
                </div>
                <span className="text-sm text-card-muted">{p ? t('{total} {total|pytanie|pytania|pytań}, opanowane: {m}', { total: p.initial, m: p.mastered }) : t('Jeszcze nie zaczęty')}</span>
                <MasteryBar mastered={p?.mastered || 0} total={p?.initial || 1} />
                <span className={`inline-flex min-h-[26px] items-center self-start rounded-full px-2.5 text-[13px] font-bold ${chipLook(deck)}`}>{translationLabel(deck, t)}</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => navigate(`/decks/${deck.id}`)} className="min-h-[44px] rounded-md text-[15px] font-bold text-card-ink ring-[1.5px] ring-inset ring-card-ink/25 hover:bg-card-ink/5">{t('Podgląd')}</button>
                  <button type="button" onClick={() => navigate(`/quiz/${deck.id}`)} className="min-h-[44px] rounded-md bg-card-ink text-[15px] font-bold text-card shadow-[inset_0_-3px_0_rgb(0_0_0/0.35)]">{t('Ucz się')}</button>
                </div>
              </article>
            );
          })}
        </div>
        {!decks.length && (
          <p className="text-muted">{t('Nie masz jeszcze zestawów. Wgraj pierwszy w formularzu obok.')}</p>
        )}
        {decks.length > 0 && !filteredDecks.length && <p className="text-muted">{t('Żaden zestaw nie pasuje do „{q}”.', { q: searchTerm })}</p>}
      </section>

      <FormatHelp open={helpOpen} onClose={closeHelp} t={t} />
    </div>
  );
};

export default DecksView;
