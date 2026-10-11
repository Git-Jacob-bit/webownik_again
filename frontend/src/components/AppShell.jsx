import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import HelpCenter from './HelpCenter';
import Logo from './ui/Logo';
import Modal from './ui/Modal';
import { CREATE_EVENT } from '../pages/dashboard/shared';

export const sections = [
  { id: 'today', label: 'Dzisiaj' },
  { id: 'decks', label: 'Zestawy' },
  { id: 'tasks', label: 'Zadania' },
  { id: 'notes', label: 'Notatki' },
  { id: 'links', label: 'Linki' },
];

const mobileTabs = ['today', 'decks', 'notes'];
const creatable = ['decks', 'tasks', 'notes', 'links'];

const sheetItem = 'flex min-h-[52px] w-full items-center justify-between rounded-md px-4 text-left text-base font-bold ring-[1.5px] ring-inset ring-ink/15 transition hover:bg-ink/5';

const AppShell = ({ activeSection, counts = {}, userEmail = '', onLogout, children }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const accountRef = useRef(null);

  const closeMore = useCallback(() => setMoreOpen(false), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onPointer = event => { if (!accountRef.current?.contains(event.target)) setAccountOpen(false); };
    const onKey = event => { if (event.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  const go = (id, state) => { setMoreOpen(false); setCreateOpen(false); navigate(`/${id}`, state ? { state } : undefined); };

  // „Dodaj”: na sekcji z formularzem otwiera formularz, na pulpicie pyta, co dodać.
  const requestCreate = () => {
    if (creatable.includes(activeSection)) window.dispatchEvent(new Event(CREATE_EVENT));
    else setCreateOpen(true);
  };

  const today = new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const dateLabel = today.charAt(0).toUpperCase() + today.slice(1);
  const name = userEmail.split('@')[0] || t('Twoje konto');
  const moreActive = ['tasks', 'links'].includes(activeSection);

  const tab = id => {
    const item = sections.find(section => section.id === id);
    const active = id === activeSection;
    return (
      <button
        key={id}
        type="button"
        onClick={() => go(id)}
        aria-current={active ? 'page' : undefined}
        className={`mr-1 flex-none rounded-t-xl px-[22px] text-[15px] font-bold transition ${active ? 'min-h-[52px] bg-panel text-ink' : 'min-h-[46px] bg-tab text-muted hover:text-ink'}`}
      >
        {t(item.label)}
        {counts[id] !== undefined && id !== 'today' && <span className="ml-2 font-medium tabular-nums text-faint">{counts[id]}</span>}
      </button>
    );
  };

  return (
    <div className="desk relative z-[1] min-h-[100dvh] px-3 pb-[calc(104px+env(safe-area-inset-bottom))] pt-4 text-ink sm:px-6 lg:px-11 lg:pb-11 lg:pt-7">
      <div className="mx-auto flex max-w-[1320px] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-1.5 pb-4 lg:pb-[22px]">
          <button type="button" onClick={() => go('today')} className="rounded-md" aria-label={t('Webownik, przejdź do pulpitu')}><Logo /></button>
          <div className="hidden items-center gap-6 text-sm text-muted lg:flex">
            <span>{dateLabel}</span>
            <button type="button" className="link" onClick={() => setHelpOpen(true)}>{t('Pomoc')}</button>
            <button type="button" className="link" onClick={() => navigate('/settings')}>{t('Ustawienia')}</button>
            <div ref={accountRef} className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)} className="flex min-h-[44px] items-center gap-1.5 rounded-md px-2 font-bold text-ink hover:bg-ink/5">
                {name}<ChevronDown className={`h-4 w-4 transition ${accountOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {accountOpen && (
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg bg-panel p-2 text-[15px] text-ink shadow-lift ring-1 ring-ink/10">
                  <button role="menuitem" type="button" onClick={() => { setAccountOpen(false); navigate('/tutorial'); }} className="min-h-[44px] rounded-md px-3 text-left font-semibold hover:bg-ink/5">{t('Tutorial')}</button>
                  <button role="menuitem" type="button" onClick={toggleLanguage} className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-left font-semibold hover:bg-ink/5">{t('Język')}<span className="text-sm text-muted">{language === 'pl' ? 'Polski' : 'English'}</span></button>
                  <button role="menuitem" type="button" onClick={toggleTheme} className="flex min-h-[44px] items-center justify-between rounded-md px-3 text-left font-semibold hover:bg-ink/5">{t('Motyw')}<span className="text-sm text-muted">{t(isDark ? 'Ciemny' : 'Jasny')}</span></button>
                  <div className="my-1 h-px bg-ink/10" />
                  <button role="menuitem" type="button" onClick={onLogout} className="min-h-[44px] rounded-md px-3 text-left font-semibold text-accent-text hover:bg-accent/10">{t('Wyloguj się')}</button>
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setMoreOpen(true)} aria-label={t('Konto i ustawienia')} className="flex h-11 w-11 items-center justify-center rounded-full bg-panel font-bold uppercase text-ink ring-[1.5px] ring-inset ring-ink/15 lg:hidden">{name.charAt(0)}</button>
        </header>

        <nav aria-label={t('Sekcje')} className="hidden items-end overflow-x-auto pl-7 lg:flex">
          {sections.map(section => tab(section.id))}
        </nav>

        <main className="relative rounded-2xl bg-panel p-4 shadow-lift sm:p-8 lg:rounded-tl-[4px] lg:p-14">
          {children}
        </main>
      </div>

      <nav aria-label={t('Sekcje')} className="fixed inset-x-0 bottom-0 z-40 flex items-end gap-1 border-t border-ink/15 bg-desk/95 px-2.5 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
        {mobileTabs.slice(0, 2).map(id => (
          <button key={id} type="button" onClick={() => go(id)} aria-current={activeSection === id ? 'page' : undefined} className={`flex-1 rounded-t-xl text-sm font-bold transition ${activeSection === id ? 'min-h-[62px] bg-panel text-ink' : 'min-h-[56px] bg-tab text-muted'}`}>{t(sections.find(s => s.id === id).label)}</button>
        ))}
        <button type="button" onClick={requestCreate} aria-label={t('Dodaj')} className="mb-2 flex h-14 w-14 flex-none items-center justify-center self-center rounded-lg bg-accent text-accent-ink shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)]"><Plus className="h-7 w-7" aria-hidden="true" /></button>
        <button type="button" onClick={() => go('notes')} aria-current={activeSection === 'notes' ? 'page' : undefined} className={`flex-1 rounded-t-xl text-sm font-bold transition ${activeSection === 'notes' ? 'min-h-[62px] bg-panel text-ink' : 'min-h-[56px] bg-tab text-muted'}`}>{t('Notatki')}</button>
        <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className={`flex-1 rounded-t-xl text-sm font-bold transition ${moreActive ? 'min-h-[62px] bg-panel text-ink' : 'min-h-[56px] bg-tab text-muted'}`}>{t('Więcej')}</button>
      </nav>

      <Modal open={moreOpen} onClose={closeMore} size="sm" title={t('Więcej')} description={userEmail}>
        <div className="flex flex-col gap-2">
          <button type="button" className={sheetItem} onClick={() => go('tasks')}>{t('Zadania')}{counts.tasks !== undefined && <span className="text-muted">{counts.tasks}</span>}</button>
          <button type="button" className={sheetItem} onClick={() => go('links')}>{t('Linki')}{counts.links !== undefined && <span className="text-muted">{counts.links}</span>}</button>
          <button type="button" className={sheetItem} onClick={() => { setMoreOpen(false); navigate('/settings'); }}>{t('Ustawienia')}</button>
          <button type="button" className={sheetItem} onClick={() => { setMoreOpen(false); navigate('/tutorial'); }}>{t('Tutorial')}</button>
          <button type="button" className={sheetItem} onClick={() => { setMoreOpen(false); setHelpOpen(true); }}>{t('Pomoc i aktualizacje')}</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={sheetItem} onClick={toggleLanguage}>{language === 'pl' ? 'English' : 'Polski'}</button>
            <button type="button" className={sheetItem} onClick={toggleTheme}>{t(isDark ? 'Motyw jasny' : 'Motyw ciemny')}</button>
          </div>
          <button type="button" className={`${sheetItem} text-accent-text ring-accent/60`} onClick={onLogout}>{t('Wyloguj się')}</button>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={closeCreate} size="sm" title={t('Co chcesz dodać?')}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={sheetItem} onClick={() => go('decks', { create: true })}>{t('Zestaw')}</button>
          <button type="button" className={sheetItem} onClick={() => go('tasks', { create: true })}>{t('Zadanie')}</button>
          <button type="button" className={sheetItem} onClick={() => go('notes', { create: true })}>{t('Notatkę')}</button>
          <button type="button" className={sheetItem} onClick={() => go('links', { create: true })}>{t('Link')}</button>
        </div>
      </Modal>

      <HelpCenter open={helpOpen} onClose={closeHelp} />
    </div>
  );
};

export default AppShell;
