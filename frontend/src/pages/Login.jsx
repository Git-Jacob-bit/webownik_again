import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, BrainCircuit, CheckSquare, Eye, EyeOff,
  Layers3, Link as LinkIcon, Loader2, Lock, Mail, StickyNote,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api';
import AnimatedPage from '../components/AnimatedPage';
import InlineMessage from '../components/InlineMessage';
import TurnstileWidget from '../components/TurnstileWidget';


const knowledgeNodes = [
  { label: 'Fiszki', icon: Layers3, position: 'left-[8%] top-[18%]', delay: 0 },
  { label: 'Notatki', icon: StickyNote, position: 'right-[7%] top-[25%]', delay: 1.2 },
  { label: 'Zadania', icon: CheckSquare, position: 'left-[7%] top-[54%]', delay: 2.4 },
  { label: 'Linki', icon: LinkIcon, position: 'right-[12%] bottom-[13%]', delay: 3.6 },
];

const KnowledgeVisual = () => {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative hidden lg:flex min-h-[620px] flex-1 items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/40 p-10 shadow-2xl shadow-blue-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,0.18),transparent_42%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 700 620" aria-hidden="true">
        <motion.path d="M350 310 L115 130 M350 310 L590 165 M350 310 L95 355 M350 310 L570 525" fill="none" stroke="url(#line)" strokeWidth="1.5" strokeDasharray="6 9" animate={reduceMotion ? undefined : { strokeDashoffset: [0, -60] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} />
        <defs><linearGradient id="line"><stop stopColor="#60a5fa" /><stop offset="1" stopColor="#a78bfa" /></linearGradient></defs>
      </svg>

      {knowledgeNodes.map(({ label, icon: Icon, position, delay }) => (
        <motion.div key={label} className={`absolute ${position} z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/75 px-4 py-3 text-slate-200 shadow-xl backdrop-blur-xl`} animate={reduceMotion ? undefined : { y: [0, -7, 0], boxShadow: ['0 10px 30px rgba(2,6,23,.2)', '0 12px 38px rgba(59,130,246,.18)', '0 10px 30px rgba(2,6,23,.2)'] }} transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}>
          <span className="rounded-xl bg-blue-500/10 p-2 text-blue-300"><Icon className="h-5 w-5" /></span>
          <span className="text-sm font-medium">{label}</span>
        </motion.div>
      ))}

      <motion.div className="relative z-20 flex h-40 w-40 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 shadow-[0_0_80px_rgba(59,130,246,.25)] backdrop-blur-xl" animate={reduceMotion ? undefined : { scale: [1, 1.035, 1] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/30">
          <BrainCircuit className="h-12 w-12 text-white" />
        </div>
      </motion.div>

      <div className="absolute bottom-10 left-10 right-10 z-20">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Webownik</p>
        <h2 className="max-w-lg text-4xl font-bold leading-tight text-white">Twoja wiedza.<br />W jednym miejscu.</h2>
        <p className="mt-4 max-w-md text-slate-400">Zapisuj, porządkuj i utrwalaj informacje w swoim prywatnym centrum nauki.</p>
      </div>
    </div>
  );
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      if (turnstileToken) formData.append('turnstile_token', turnstileToken);
      await api.post('/auth/token', formData);
      toast.success('Zalogowano pomyślnie!');
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') setError('Brak połączenia z serwerem API.');
      else if (err.response?.status === 403) setError(err.response?.data?.detail || 'Najpierw potwierdź adres e-mail.');
      else if (err.response?.status === 401) setError('Błędny e-mail lub hasło.');
      else setError('Wystąpił nieoczekiwany błąd.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <main className="relative min-h-screen overflow-hidden bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-700/15 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-700/15 blur-[120px]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-8">
          <KnowledgeVisual />

          <section className="mx-auto w-full max-w-md lg:mx-0 lg:w-[430px] lg:flex-none">
            <div className="mb-7 lg:hidden">
              <div className="mb-4 inline-flex rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 p-3 shadow-lg shadow-blue-500/20"><BrainCircuit className="h-7 w-7" /></div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">Webownik</p>
              <h1 className="mt-2 text-3xl font-bold">Twoja wiedza. W jednym miejscu.</h1>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
              <div className="mb-6">
                <p className="mb-2 text-sm font-medium text-blue-300">Miło Cię znów widzieć</p>
                <h2 className="text-3xl font-bold">Zaloguj się</h2>
                <p className="mt-2 text-sm text-slate-400">Wróć do swoich notatek, zestawów i planów.</p>
              </div>

              <InlineMessage message={error} />

              <form onSubmit={handleLogin} className="space-y-5">
                <label className="block space-y-2">
                  <span className="ml-1 text-sm font-medium text-slate-300">Adres e-mail</span>
                  <span className="group relative block">
                    <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                    <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-11 pr-4 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="twoj@email.com" required />
                  </span>
                </label>

                <label className="block space-y-2">
                  <span className="ml-1 text-sm font-medium text-slate-300">Hasło</span>
                  <span className="group relative block">
                    <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-blue-400" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-11 pr-12 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="••••••••" required />
                    <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-slate-200" aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                  </span>
                </label>

                <div className="flex justify-end"><Link to="/forgot-password" className="text-sm text-blue-400 transition hover:text-blue-300">Nie pamiętasz hasła?</Link></div>

                <TurnstileWidget onToken={setTurnstileToken} />

                <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 font-semibold shadow-lg shadow-blue-950/30 transition hover:from-blue-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:opacity-60">
                  {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Logowanie...</> : <>Zaloguj się <ArrowRight className="h-5 w-5" /></>}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-400">Nie masz konta? <Link to="/register" className="font-medium text-blue-400 hover:text-blue-300">Zarejestruj się</Link></p>
            </div>
          </section>
        </div>
      </main>
    </AnimatedPage>
  );
}

export default Login;
