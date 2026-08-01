import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpenCheck, BrainCircuit, CalendarDays, Check,
  CheckSquare, Circle, Languages, Layers3, Link as LinkIcon, ListChecks,
  Moon, Play, RotateCcw, Settings, StickyNote, Sun, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const demo = {
  deck: { pl: 'Podstawy biologii', en: 'Biology basics' },
  question: { pl: 'Który organ odpowiada za pompowanie krwi?', en: 'Which organ pumps blood?' },
  answers: [
    { pl: 'Serce', en: 'Heart', correct: true }, { pl: 'Płuco', en: 'Lung' },
    { pl: 'Wątroba', en: 'Liver' }, { pl: 'Nerka', en: 'Kidney' },
  ],
  task: { pl: 'Powtórzyć rozdział o komórkach', en: 'Review the chapter about cells' },
  noteTitle: { pl: 'Oddychanie komórkowe', en: 'Cellular respiration' },
  note: { pl: 'Proces uwalniania energii z glukozy zachodzący głównie w mitochondriach.', en: 'The process of releasing energy from glucose, occurring mainly in mitochondria.' },
  link: { pl: 'Atlas anatomii', en: 'Anatomy atlas' },
};

const stepData = [
  { id: 'today', icon: CalendarDays, title: ['Pulpit dnia', 'Today dashboard'], text: ['Tutaj szybko sprawdzisz postęp, najbliższe zadania i ostatnie notatki.', 'Check your progress, upcoming tasks, and recent notes at a glance.'] },
  { id: 'decks', icon: Layers3, title: ['Zestawy pytań', 'Question decks'], text: ['Wgraj pliki, śledź tłumaczenie i rozpocznij naukę wybranego zestawu.', 'Upload files, track translation, and start studying a selected deck.'] },
  { id: 'preview', icon: BookOpenCheck, title: ['Podgląd zestawu', 'Deck preview'], text: ['Edytuj pytania i odpowiedzi albo ręcznie uruchom tłumaczenie PL → EN.', 'Edit questions and answers or manually start PL → EN translation.'] },
  { id: 'quiz', icon: Play, title: ['Tryb nauki', 'Study mode'], text: ['Zaznacz odpowiedź i sprawdź wynik. Demo nie zapisuje postępu.', 'Select an answer and check it. The demo does not save progress.'] },
  { id: 'tasks', icon: CheckSquare, title: ['Zadania', 'Tasks'], text: ['Dodawaj codzienne zadania i oznaczaj wykonane.', 'Add daily tasks and mark them as completed.'] },
  { id: 'notes', icon: StickyNote, title: ['Notatki', 'Notes'], text: ['Zapisuj krótkie informacje i wracaj do nich z pulpitu.', 'Save short notes and return to them from the dashboard.'] },
  { id: 'links', icon: LinkIcon, title: ['Przydatne linki', 'Useful links'], text: ['Przechowuj materiały zewnętrzne w jednym miejscu.', 'Keep external learning resources in one place.'] },
  { id: 'settings', icon: Settings, title: ['Personalizacja', 'Personalization'], text: ['W ustawieniach zmienisz język, motyw, hasło oraz dane konta.', 'Change language, theme, password, and account options in settings.'] },
];

const Tutorial = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [taskDone, setTaskDone] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [checked, setChecked] = useState(false);
  const current = stepData[step];
  const pick = value => Array.isArray(value) ? value[language === 'en' ? 1 : 0] : value[language];
  const progress = ((step + 1) / stepData.length) * 100;
  const nav = useMemo(() => [stepData[0], stepData[1], stepData[4], stepData[5], stepData[6]], []);
  const goTo = id => setStep(stepData.findIndex(item => item.id === id));

  const panel = () => {
    if (current.id === 'today') return <div className="grid gap-4 sm:grid-cols-3"><DemoStat value="1" label={pick(['Zestaw', 'Deck'])} /><DemoStat value={taskDone ? '0' : '1'} label={pick(['Do zrobienia', 'To do'])} /><DemoStat value="1" label={pick(['Notatka', 'Note'])} /><DemoCard className="sm:col-span-3"><p className="text-sm text-slate-500">{pick(['Najbliższe zadanie', 'Upcoming task'])}</p><p className="mt-2 font-semibold">{pick(demo.task)}</p></DemoCard></div>;
    if (current.id === 'decks') return <DemoCard><div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">{pick(['Tłumaczenie gotowe', 'Translation ready'])}</span><h3 className="mt-4 text-xl font-bold">{pick(demo.deck)}</h3><p className="mt-1 text-sm text-slate-500">5 {pick(['pytań', 'questions'])}</p></div><button onClick={() => goTo('preview')} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{pick(['Podgląd', 'Preview'])}</button></div></DemoCard>;
    if (current.id === 'preview') return <DemoCard><p className="text-xs font-semibold uppercase tracking-widest text-blue-400">PL → EN</p><h3 className="mt-3 text-xl font-bold">{pick(demo.question)}</h3><div className="mt-4 grid gap-2 sm:grid-cols-2">{demo.answers.map((item, index) => <div key={index} className={`rounded-xl border p-3 text-sm ${item.correct ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/[0.03]'}`}>{pick(item)}</div>)}</div><button onClick={() => goTo('quiz')} className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white"><Play className="h-4 w-4" />{pick(['Rozpocznij demo quizu', 'Start demo quiz'])}</button></DemoCard>;
    if (current.id === 'quiz') return <DemoCard><h3 className="text-xl font-bold">{pick(demo.question)}</h3><div className="mt-5 space-y-2">{demo.answers.map((item, index) => { const selected = answer === index; const correct = checked && item.correct; const wrong = checked && selected && !item.correct; return <button key={index} disabled={checked} onClick={() => setAnswer(index)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${correct ? 'border-green-500 bg-green-500/10' : wrong ? 'border-red-500 bg-red-500/10' : selected ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/40'}`}><span className="flex h-6 w-6 items-center justify-center">{correct ? <Check className="text-green-400" /> : <Circle className="h-5 w-5 text-slate-500" />}</span>{pick(item)}</button>; })}</div>{checked ? <button onClick={() => { setChecked(false); setAnswer(null); }} className="mt-5 flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5"><RotateCcw className="h-4 w-4" />{pick(['Spróbuj ponownie', 'Try again'])}</button> : <button disabled={answer === null} onClick={() => setChecked(true)} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-40">{pick(['Sprawdź', 'Check'])}</button>}</DemoCard>;
    if (current.id === 'tasks') return <DemoCard><button onClick={() => setTaskDone(value => !value)} className="flex w-full items-center gap-3 text-left"><span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${taskDone ? 'border-green-500 bg-green-500 text-white' : 'border-slate-600'}`}>{taskDone && <Check className="h-4 w-4" />}</span><span className={taskDone ? 'text-slate-500 line-through' : ''}>{pick(demo.task)}</span></button></DemoCard>;
    if (current.id === 'notes') return <DemoCard><StickyNote className="h-7 w-7 text-violet-400" /><h3 className="mt-4 text-lg font-bold">{pick(demo.noteTitle)}</h3><p className="mt-2 leading-7 text-slate-400">{pick(demo.note)}</p></DemoCard>;
    if (current.id === 'links') return <DemoCard><LinkIcon className="h-7 w-7 text-cyan-400" /><h3 className="mt-4 text-lg font-bold">{pick(demo.link)}</h3><p className="mt-1 text-sm text-slate-500">https://example.com/anatomy</p></DemoCard>;
    return <div className="grid gap-4 sm:grid-cols-2"><button onClick={toggleLanguage} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left"><Languages className="h-6 w-6 text-cyan-400" /><p className="mt-4 font-bold">{pick(['Język', 'Language'])}</p><p className="mt-1 text-sm text-slate-500">{language === 'pl' ? 'Polski → English' : 'English → Polski'}</p></button><button onClick={toggleTheme} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left">{isDark ? <Sun className="h-6 w-6 text-amber-400" /> : <Moon className="h-6 w-6 text-blue-500" />}<p className="mt-4 font-bold">{pick(['Motyw', 'Theme'])}</p><p className="mt-1 text-sm text-slate-500">{pick(isDark ? ['Włącz jasny', 'Enable light'] : ['Włącz ciemny', 'Enable dark'])}</p></button></div>;
  };

  return <div className="min-h-screen bg-slate-950 text-white lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-900/80 p-4 lg:block"><div className="flex items-center gap-3 px-2 py-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white"><BrainCircuit /></span><div><p className="font-bold">Webownik</p><p className="text-xs text-blue-400">DEMO</p></div></div><nav className="mt-6 space-y-1.5">{nav.map(item => <button key={item.id} onClick={() => goTo(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${current.id === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><item.icon className="h-5 w-5" />{pick(item.title)}</button>)}</nav></aside>
    <main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-400">{pick(['Interaktywny tutorial', 'Interactive tutorial'])}</p><h1 className="text-xl font-bold">{pick(current.title)}</h1></div><button onClick={() => navigate('/today')} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 hover:text-white"><X className="h-4 w-4" />{pick(['Wyjdź', 'Exit'])}</button></header>
      <div className="mx-auto max-w-5xl p-4 pb-40 sm:p-8"><div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">{stepData.map((item, index) => <button key={item.id} onClick={() => setStep(index)} className={`h-2.5 min-w-8 rounded-full ${index === step ? 'bg-blue-500' : 'bg-slate-700'}`} aria-label={pick(item.title)} />)}</div><AnimatePresence mode="wait"><motion.section key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><div className="mb-6"><p className="text-sm text-slate-500">{step + 1} / {stepData.length}</p><h2 className="mt-1 text-3xl font-bold">{pick(current.title)}</h2><p className="mt-2 max-w-2xl text-slate-400">{pick(current.text)}</p></div>{panel()}</motion.section></AnimatePresence></div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-900/95 p-4 backdrop-blur-xl lg:left-64"><div className="mx-auto max-w-5xl"><div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} /></div><div className="flex justify-between"><button disabled={step === 0} onClick={() => setStep(value => value - 1)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 disabled:opacity-30"><ArrowLeft className="h-4 w-4" />{pick(['Wstecz', 'Back'])}</button>{step === stepData.length - 1 ? <button onClick={() => navigate('/today')} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white"><Check className="h-4 w-4" />{pick(['Zakończ tutorial', 'Finish tutorial'])}</button> : <button onClick={() => setStep(value => value + 1)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">{pick(['Dalej', 'Next'])}<ArrowRight className="h-4 w-4" /></button>}</div></div></div>
    </main>
  </div>;
};

const DemoCard = ({ children, className = '' }) => <div className={`rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl ${className}`}>{children}</div>;
const DemoStat = ({ value, label }) => <DemoCard><p className="text-3xl font-bold">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></DemoCard>;

export default Tutorial;
