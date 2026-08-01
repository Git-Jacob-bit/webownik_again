import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const EmailConfirmed = () => {
  const { language } = useLanguage();
  const [error] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const message = hash.get('error_description') || query.get('error_description');
    window.history.replaceState({}, document.title, window.location.pathname);
    return message;
  });
  const en = language === 'en';

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
      <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>{error ? <AlertCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}</span>
      <h1 className="mt-6 text-2xl font-bold">{error ? (en ? 'The link is invalid' : 'Link jest nieprawidłowy') : (en ? 'Email confirmed' : 'E-mail potwierdzony')}</h1>
      <p className="mt-3 leading-6 text-slate-400">{error || (en ? 'Your account is active. You can now sign in.' : 'Twoje konto jest aktywne. Możesz się teraz zalogować.')}</p>
      <Link to="/login" className="mt-7 block rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500">{en ? 'Go to sign in' : 'Przejdź do logowania'}</Link>
    </section>
  </main>;
};

export default EmailConfirmed;
