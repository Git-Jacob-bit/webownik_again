import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BrainCircuit, CalendarDays, CheckSquare, ChevronLeft, ChevronRight,
  Languages, Layers3, Link as LinkIcon, LogOut, Menu, Moon, Plus, Settings,
  StickyNote, Sun, X, GraduationCap, MessageSquareText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import HelpCenter from './HelpCenter';


export const sections = [
  { id: 'today', label: 'Dzisiaj', icon: CalendarDays, color: 'blue' },
  { id: 'decks', label: 'Zestawy', icon: Layers3, color: 'blue' },
  { id: 'tasks', label: 'Zadania', icon: CheckSquare, color: 'green' },
  { id: 'notes', label: 'Notatki', icon: StickyNote, color: 'violet' },
  { id: 'links', label: 'Linki', icon: LinkIcon, color: 'cyan' },
];

const primaryMobile = ['today', 'decks', 'notes'];
const createTargets = {
  decks: 'create-deck', tasks: 'create-task', notes: 'create-note', links: 'create-link',
};

const focusCreateForm = activeSection => {
  const target = document.getElementById(createTargets[activeSection]);
  if (!target) return;
  const toggle = target.querySelector('[data-create-toggle]');
  if (toggle?.getAttribute('aria-expanded') === 'false') toggle.click();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.setTimeout(() => target.querySelector('[data-autofocus]')?.focus(), 350);
};

const AppShell = ({ activeSection, userInitial, onLogout, children }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const accountTriggerRef = useRef(null);
  const current = sections.find(item => item.id === activeSection) || sections[0];
  const hasCreateAction = Boolean(createTargets[activeSection]);

  useEffect(() => {
    if (!accountOpen) return undefined;

    const closeOnOutsideClick = event => {
      if (accountMenuRef.current?.contains(event.target) || accountTriggerRef.current?.contains(event.target)) return;
      setAccountOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountTriggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  const go = id => {
    setMoreOpen(false);
    navigate(`/${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.07] bg-slate-900/80 backdrop-blur-xl transition-[width] duration-300 lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className={`flex h-20 items-center border-b border-white/[0.06] ${collapsed ? 'justify-center' : 'px-6'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-950/40"><BrainCircuit className="h-6 w-6" /></span>
            {!collapsed && <span className="text-xl font-bold tracking-tight">Webownik</span>}
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-6">
          {sections.map(item => {
            const Icon = item.icon;
            const active = item.id === activeSection;
            return (
              <button key={item.id} onClick={() => go(item.id)} title={collapsed ? item.label : undefined} className={`group flex w-full items-center rounded-xl py-3 transition ${collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'} ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                <Icon className="h-5 w-5 flex-none" />
                {!collapsed && <span className="font-medium">{t(item.label)}</span>}
              </button>
            );
          })}
        </nav>

        <div className="relative space-y-1 border-t border-white/[0.06] p-3">
          <AnimatePresence>
            {accountOpen && <motion.div ref={accountMenuRef} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className={`absolute bottom-[6rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-800 p-2 shadow-2xl shadow-black/40 ${collapsed ? 'left-3 w-56' : 'inset-x-3'}`}>
              <button onClick={() => { setAccountOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.07]"><Settings className="h-5 w-5 text-slate-400" /><span className="font-medium">{t('Ustawienia')}</span></button>
              <button onClick={() => { setAccountOpen(false); navigate('/tutorial'); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.07]"><GraduationCap className="h-5 w-5 text-violet-400" /><span className="font-medium">{t('Tutorial')}</span></button>
              <button onClick={() => { setAccountOpen(false); setHelpOpen(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.07]"><MessageSquareText className="h-5 w-5 text-blue-400" /><span className="font-medium">{t('Pomoc i aktualizacje')}</span></button>
              <button onClick={toggleLanguage} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.07]"><Languages className="h-5 w-5 text-cyan-500" /><span className="flex-1 font-medium">{t('Język')}</span><span className="text-xs font-semibold uppercase text-slate-500">{language === 'pl' ? 'EN' : 'PL'}</span></button>
              <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-slate-200 transition hover:bg-white/[0.07]"><span className="relative h-5 w-5">{isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-blue-500" />}</span><span className="flex-1 font-medium">{t('Motyw')}</span><span className="text-xs text-slate-500">{t(isDark ? 'Jasny' : 'Ciemny')}</span></button>
              <div className="my-1 border-t border-white/[0.07]" />
              <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-300 transition hover:bg-red-500/10"><LogOut className="h-5 w-5" /><span className="font-medium">Wyloguj się</span></button>
            </motion.div>}
          </AnimatePresence>
          <button ref={accountTriggerRef} onClick={() => setAccountOpen(value => !value)} aria-expanded={accountOpen} aria-haspopup="menu" className={`flex w-full items-center rounded-xl py-2.5 transition hover:bg-white/[0.06] ${collapsed ? 'justify-center px-2' : 'gap-3 px-2.5'}`}>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white shadow-lg shadow-blue-500/20">{userInitial}</span>
            {!collapsed && <><span className="min-w-0 flex-1 text-left"><span className="block text-sm font-semibold text-white">{t('Twoje konto')}</span><span className="block text-xs text-slate-500">{t('Profil i preferencje')}</span></span><Settings className="h-5 w-5 text-slate-500" /></>}
          </button>
          <button onClick={() => setCollapsed(value => !value)} className={`group mt-2 flex w-full items-center rounded-xl border border-white/[0.06] py-2 text-slate-400 transition hover:border-white/10 hover:bg-white/[0.04] hover:text-white ${collapsed ? 'justify-center px-2' : 'justify-between pl-3.5 pr-2'}`} aria-label={collapsed ? 'Rozwiń menu' : 'Zwiń menu'}>
            {!collapsed && <span className="text-sm font-medium">{t('Zwiń menu')}</span>}
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/[0.05] transition group-hover:bg-white/[0.09]">
              {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </span>
          </button>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 transition-[margin] duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-slate-950/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 lg:py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="hidden text-xs font-medium uppercase tracking-[0.2em] text-slate-500 sm:block">{t('Centrum wiedzy')}</p>
              <h1 className="truncate text-2xl font-bold tracking-tight lg:text-3xl">{t(current.label)}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {hasCreateAction && <button onClick={() => focusCreateForm(activeSection)} className="hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 sm:flex"><Plus className="h-4 w-4" /> {t('Dodaj')}</button>}
            </div>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-73px)] max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-10">{children}</main>
      </div>

      {hasCreateAction && <button onClick={() => focusCreateForm(activeSection)} className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-xl shadow-blue-950/50 sm:hidden" aria-label="Dodaj nowy element"><Plus className="h-6 w-6" /></button>}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-900/95 px-4 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {primaryMobile.map(id => {
            const item = sections.find(section => section.id === id);
            const Icon = item.icon;
            const active = activeSection === id;
            return <button key={id} onClick={() => go(id)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${active ? 'text-blue-400' : 'text-slate-500'}`}><Icon className="h-5 w-5" />{t(item.label)}</button>;
          })}
          <button onClick={() => setMoreOpen(true)} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${['tasks', 'links'].includes(activeSection) ? 'text-blue-400' : 'text-slate-500'}`}><Menu className="h-5 w-5" />{t('Więcej')}</button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen && <>
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" aria-label="Zamknij menu" />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl lg:hidden">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-bold">{t('Więcej')}</p><p className="text-sm text-slate-500">{t('Pozostałe sekcje i konto')}</p></div><button onClick={() => setMoreOpen(false)} className="rounded-xl bg-white/5 p-2 text-slate-400"><X className="h-5 w-5" /></button></div>
            <div className="grid grid-cols-2 gap-3">
              {[sections[2], sections[4]].map(item => <button key={item.id} onClick={() => go(item.id)} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><item.icon className="h-5 w-5 text-blue-400" /><span className="font-medium">{t(item.label)}</span></button>)}
              <button onClick={() => navigate('/settings')} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><Settings className="h-5 w-5 text-slate-400" /><span className="font-medium">Ustawienia</span></button>
              <button onClick={() => navigate('/tutorial')} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><GraduationCap className="h-5 w-5 text-violet-400" /><span className="font-medium">{t('Tutorial')}</span></button>
              <button onClick={() => { setMoreOpen(false); setHelpOpen(true); }} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><MessageSquareText className="h-5 w-5 text-blue-400" /><span className="font-medium">{t('Pomoc')}</span></button>
              <button onClick={onLogout} className="flex items-center gap-3 rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-left text-red-300"><LogOut className="h-5 w-5" /><span className="font-medium">Wyloguj się</span></button>
              <button onClick={() => { toggleLanguage(); setMoreOpen(false); }} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><Languages className="h-5 w-5 text-cyan-500" /><span className="font-medium">{language === 'pl' ? 'English' : 'Polski'}</span></button>
              <button onClick={() => { toggleTheme(); setMoreOpen(false); }} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 text-left"><span className="h-5 w-5">{isDark ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-blue-500" />}</span><span className="font-medium">Motyw {isDark ? 'jasny' : 'ciemny'}</span></button>
            </div>
          </motion.div>
        </>}
      </AnimatePresence>
      <HelpCenter open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default AppShell;
