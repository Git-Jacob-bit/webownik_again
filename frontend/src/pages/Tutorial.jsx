import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Languages, Moon, Sun } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { Fiszka, FiszkaStack } from '../components/ui/Fiszka';
import { PenCheck, PenCircle, PenStrike, Stamp } from '../components/ui/PenMarks';

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
  { id: 'today', title: ['Pulpit dnia', 'Today dashboard'], text: ['Tutaj szybko sprawdzisz postęp, najbliższe zadania i ostatnie notatki.', 'Check your progress, upcoming tasks, and recent notes at a glance.'] },
  { id: 'decks', title: ['Zestawy pytań', 'Question decks'], text: ['Wgraj pliki, śledź tłumaczenie i rozpocznij naukę wybranego zestawu.', 'Upload files, track translation, and start studying a selected deck.'] },
  { id: 'preview', title: ['Podgląd zestawu', 'Deck preview'], text: ['Edytuj pytania i odpowiedzi albo ręcznie uruchom tłumaczenie PL → EN.', 'Edit questions and answers or manually start PL → EN translation.'] },
  { id: 'quiz', title: ['Tryb nauki', 'Study mode'], text: ['Postaw X przy odpowiedzi i sprawdź wynik. Demo nie zapisuje postępu.', 'Mark an answer with X and check it. The demo does not save progress.'] },
  { id: 'tasks', title: ['Zadania', 'Tasks'], text: ['Dodawaj codzienne zadania i oznaczaj wykonane.', 'Add daily tasks and mark them as completed.'] },
  { id: 'notes', title: ['Notatki', 'Notes'], text: ['Zapisuj krótkie informacje i wracaj do nich z pulpitu.', 'Save short notes and return to them from the dashboard.'] },
  { id: 'links', title: ['Przydatne linki', 'Useful links'], text: ['Przechowuj materiały zewnętrzne w jednym miejscu.', 'Keep external learning resources in one place.'] },
  { id: 'settings', title: ['Personalizacja', 'Personalization'], text: ['W ustawieniach zmienisz język, motyw, hasło oraz dane konta.', 'Change language, theme, password, and account options in settings.'] },
];

const LETTERS = ['A', 'B', 'C', 'D'];

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
  const nav = useMemo(() => [stepData[0], stepData[1], stepData[3], stepData[4], stepData[5], stepData[6], stepData[7]], []);
  const goTo = id => setStep(stepData.findIndex(item => item.id === id));
  const right = checked && demo.answers[answer]?.correct;

  const panel = () => {
    if (current.id === 'today') return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[['1', ['Zestaw', 'Deck']], [taskDone ? '0' : '1', ['Do zrobienia', 'To do']], ['1', ['Notatka', 'Note']]].map(([value, label]) => (
          <div key={label[0]} className="rounded-xl bg-raise p-5 ring-1 ring-inset ring-ink/10">
            <p className="font-slab text-4xl font-bold">{value}</p>
            <p className="mt-1 text-muted">{pick(label)}</p>
          </div>
        ))}
        <div className="flex items-center gap-4 rounded-xl bg-raise p-5 ring-1 ring-inset ring-ink/10 sm:col-span-3">
          <span className="xbox" aria-pressed={taskDone} />
          <div><p className="text-sm text-muted">{pick(['Najbliższe zadanie', 'Upcoming task'])}</p><p className="mt-1 font-semibold">{pick(demo.task)}</p></div>
        </div>
      </div>
    );
    if (current.id === 'decks') return (
      <FiszkaStack className="max-w-md">
        <Fiszka label={pick(['5 pytań', '5 questions'])} aside={<span className="rounded-full bg-[#4E7A42]/15 px-2.5 py-0.5 text-xs font-bold text-[#2F5A26]">{pick(['Tłumaczenie gotowe', 'Translation ready'])}</span>}>
          <h3 className="mt-3 font-slab text-2xl font-bold">{pick(demo.deck)}</h3>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => goTo('preview')} className="min-h-[44px] rounded-md font-bold text-card-ink ring-[1.5px] ring-inset ring-card-ink/25">{pick(['Podgląd', 'Preview'])}</button>
            <button type="button" onClick={() => goTo('quiz')} className="min-h-[44px] rounded-md bg-card-ink font-bold text-card">{pick(['Ucz się', 'Study'])}</button>
          </div>
        </Fiszka>
      </FiszkaStack>
    );
    if (current.id === 'preview') return (
      <Fiszka className="max-w-2xl" label={pick(['Pytanie 1', 'Question 1'])} aside={<span className="text-xs font-bold text-pen">PL → EN</span>}>
        <p className="mt-3 font-slab text-[22px] font-semibold leading-[34px]">{pick(demo.question)}</p>
        <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
          {demo.answers.map((item, index) => (
            <div key={index} className="flex min-h-[44px] items-center gap-3 text-[17px]">
              {item.correct ? <PenCheck className="-mr-1 h-6 w-6 flex-none" label={pick(['Poprawna', 'Correct'])} /> : <span className="-mr-1 w-6 flex-none" />}
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[4px] border-2 border-[#4A3A2E] bg-[#FBF6EE] text-sm font-bold text-[#4A3A2E]">{LETTERS[index]}</span>
              {pick(item)}
            </div>
          ))}
        </div>
        <Button className="mt-5" onClick={() => goTo('quiz')}>{pick(['Rozpocznij demo quizu', 'Start demo quiz'])}</Button>
      </Fiszka>
    );
    if (current.id === 'quiz') return (
      <div className="flex max-w-xl flex-col gap-5">
        <Fiszka label={pick(['Pytanie 1 z 1', 'Question 1 of 1'])} aside={<span>{pick(demo.deck)}</span>} rule={56} className="relative">
          <p className="mb-3 mt-3 font-slab text-[23px] font-semibold leading-[32px]">{pick(demo.question)}</p>
          <div className="flex flex-col">
            {demo.answers.map((item, index) => {
              const picked = answer === index;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={checked}
                  onClick={() => setAnswer(picked ? null : index)}
                  aria-pressed={picked}
                  className="relative flex min-h-[56px] items-center gap-4 text-left text-lg font-semibold text-card-ink"
                >
                  <span className="relative flex h-8 w-8 flex-none items-center justify-center rounded-[4px] border-2 border-[#4A3A2E] bg-[#FBF6EE] text-[15px] font-bold text-[#4A3A2E]">
                    {LETTERS[index]}
                    {picked && <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute -inset-1"><path d="M8 9 L32 31" stroke="rgb(var(--c-card-ink))" strokeWidth="3.6" strokeLinecap="round" /><path d="M31 8 L9 32" stroke="rgb(var(--c-card-ink))" strokeWidth="3.6" strokeLinecap="round" /></svg>}
                  </span>
                  <span className="relative">
                    {pick(item)}
                    {checked && picked && !item.correct && <PenStrike className="-left-1 -right-1" />}
                  </span>
                  {checked && item.correct && picked && <PenCheck className="ml-auto h-7 w-7" label={pick(['Dobrze', 'Correct'])} />}
                  {checked && item.correct && !picked && <PenCircle className="-left-4 top-1.5 h-11 w-16" />}
                </button>
              );
            })}
          </div>
          {checked && <span className="absolute right-4 top-14"><Stamp>{right ? pick(['Opanowane', 'Mastered']) : pick(['Jeszcze raz', 'Again'])}</Stamp></span>}
        </Fiszka>
        <div className="flex flex-wrap items-center gap-4">
          {checked
            ? <Button variant="outline" onClick={() => { setChecked(false); setAnswer(null); }}>{pick(['Spróbuj ponownie', 'Try again'])}</Button>
            : <Button disabled={answer === null} onClick={() => setChecked(true)}>{pick(['Sprawdź', 'Check'])}</Button>}
          <p className="text-muted">{checked ? (right ? pick(['Tak trzymaj – dwie dobre odpowiedzi z rzędu i fiszka odpada.', 'Keep going – two right answers in a row and the card is done.']) : pick(['Fiszka wraca na stos i pojawi się jeszcze raz.', 'The card goes back on the stack and will come again.'])) : pick(['Postaw X przy poprawnej odpowiedzi.', 'Put an X next to the correct answer.'])}</p>
        </div>
      </div>
    );
    if (current.id === 'tasks') return (
      <Fiszka className="max-w-xl" label={pick(['Do zrobienia', 'To do'])} rule={56}>
        <label className="flex min-h-[56px] cursor-pointer items-center gap-4 text-[17px]">
          <input type="checkbox" className="xbox" checked={taskDone} onChange={() => setTaskDone(value => !value)} />
          <span className={taskDone ? 'text-card-muted line-through decoration-pen decoration-2' : ''}>{pick(demo.task)}</span>
        </label>
      </Fiszka>
    );
    if (current.id === 'notes') return (
      <Fiszka className="max-w-md -rotate-[0.6deg]" label={pick(['Wczoraj', 'Yesterday'])} rule={30}>
        <h3 className="mt-2 font-slab text-xl font-bold leading-[30px]">{pick(demo.noteTitle)}</h3>
        <p className="leading-[30px] text-card-muted">{pick(demo.note)}</p>
      </Fiszka>
    );
    if (current.id === 'links') return (
      <div className="flex max-w-xl items-center gap-4 border-y border-ink/15 py-4">
        <span aria-hidden="true" className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[4px] bg-card font-slab text-2xl font-bold text-card-ink" style={{ boxShadow: 'inset 0 4px 0 rgb(var(--c-card)), inset 0 6px 0 rgb(var(--c-pen)), 0 0 0 1px var(--card-edge)' }}>E</span>
        <div className="min-w-0"><p className="text-[17px] font-bold">{pick(demo.link)}</p><p className="truncate text-sm text-muted">example.com/anatomy</p></div>
      </div>
    );
    return (
      <div className="grid max-w-xl gap-4 sm:grid-cols-2">
        <button type="button" onClick={toggleLanguage} className="flex flex-col items-start gap-3 rounded-xl p-5 text-left ring-[1.5px] ring-inset ring-ink/15 hover:ring-ink/30">
          <Languages className="h-6 w-6 text-accent-text" aria-hidden="true" />
          <span className="text-lg font-bold">{pick(['Język', 'Language'])}</span>
          <span className="text-muted">{language === 'pl' ? 'Polski → English' : 'English → Polski'}</span>
        </button>
        <button type="button" onClick={toggleTheme} className="flex flex-col items-start gap-3 rounded-xl p-5 text-left ring-[1.5px] ring-inset ring-ink/15 hover:ring-ink/30">
          {isDark ? <Sun className="h-6 w-6 text-warn" aria-hidden="true" /> : <Moon className="h-6 w-6 text-accent-text" aria-hidden="true" />}
          <span className="text-lg font-bold">{pick(['Motyw', 'Theme'])}</span>
          <span className="text-muted">{pick(isDark ? ['Włącz jasny', 'Enable light'] : ['Włącz ciemny', 'Enable dark'])}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="desk relative min-h-[100dvh] text-ink">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-ink/10 bg-desk/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent-text">{pick(['Demo', 'Demo'])}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/today')}>{pick(['Wyjdź z tutorialu', 'Exit tutorial'])}</Button>
      </header>

      <div className="relative mx-auto flex max-w-6xl gap-10 px-4 pb-44 pt-8 sm:px-8 lg:pb-36">
        <nav aria-label={pick(['Kroki tutorialu', 'Tutorial steps'])} className="hidden w-56 flex-none flex-col gap-1 lg:flex">
          {nav.map(item => {
            const active = current.id === item.id || (item.id === 'decks' && current.id === 'preview');
            return (
              <button key={item.id} type="button" onClick={() => goTo(item.id)} aria-current={active ? 'step' : undefined} className={`min-h-[44px] rounded-md px-3 text-left font-semibold transition ${active ? 'bg-panel text-ink shadow-[inset_3px_0_0_rgb(var(--c-accent))]' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}>
                {pick(item.title)}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.section key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <p className="text-sm font-semibold text-muted">{pick(['Krok', 'Step'])} {step + 1} / {stepData.length}</p>
              <h1 className="mt-1 font-slab text-[38px] font-bold leading-tight sm:text-5xl">{pick(current.title)}</h1>
              <p className="mb-8 mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{pick(current.text)}</p>
              {panel()}
            </motion.section>
          </AnimatePresence>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-panel/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={stepData.length} aria-valuenow={step + 1} aria-label={pick(['Postęp tutorialu', 'Tutorial progress'])}>
            {stepData.map((item, index) => (
              <button key={item.id} type="button" onClick={() => setStep(index)} aria-label={pick(item.title)} className="flex h-6 flex-1 items-center">
                <span className={`h-2 w-full rounded-sm ${index <= step ? 'bg-accent' : 'bg-ink/15'}`} style={{ opacity: index < step ? 0.55 : 1 }} />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Button variant="quiet" size="sm" disabled={step === 0} onClick={() => setStep(value => value - 1)}>{pick(['Wstecz', 'Back'])}</Button>
            <span className="sr-only" aria-live="polite">{Math.round(progress)}%</span>
            {step === stepData.length - 1
              ? <Button onClick={() => navigate('/today')}>{pick(['Zakończ tutorial', 'Finish tutorial'])}</Button>
              : <Button onClick={() => setStep(value => value + 1)}>{pick(['Dalej', 'Next'])}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
