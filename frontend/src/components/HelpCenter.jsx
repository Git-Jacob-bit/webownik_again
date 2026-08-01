import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ExternalLink, History, Loader2, MessageSquareText, Send, X } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';

const HelpCenter = ({ open, onClose }) => {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState('feedback');
  const [form, setForm] = useState({ category: 'bug', title: '', description: '', includeTechnical: true });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [releases, setReleases] = useState([]);
  const [releaseState, setReleaseState] = useState('idle');

  useEffect(() => {
    if (!open || tab !== 'changelog' || releaseState !== 'idle') return;
    setReleaseState('loading');
    api.get('/integrations/github/releases')
      .then(({ data }) => { setReleases(data.releases || []); setReleaseState('ready'); })
      .catch(() => setReleaseState('error'));
  }, [open, tab, releaseState]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = event => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  const submit = async event => {
    event.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const technical = form.includeTechnical ? { page: window.location.pathname, browser: navigator.userAgent } : {};
      const { data } = await api.post('/integrations/github/feedback', { category: form.category, title: form.title, description: form.description, ...technical });
      setResult(data);
      setForm({ category: 'bug', title: '', description: '', includeTechnical: true });
      toast.success(t('Feedback został wysłany. Dziękujemy!'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('Nie udało się wysłać feedbacku.'));
    } finally {
      setSending(false);
    }
  };

  return <AnimatePresence>{open && <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" aria-label={t('Zamknij')} />
    <motion.section initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }} role="dialog" aria-modal="true" aria-labelledby="help-center-title" className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/10 p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Webownik</p><h2 id="help-center-title" className="mt-1 text-2xl font-bold">{t('Pomoc i aktualizacje')}</h2></div><button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white"><X /></button></header>
      <div className="grid grid-cols-2 border-b border-white/10 p-2"><button onClick={() => setTab('feedback')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${tab === 'feedback' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><MessageSquareText className="h-4 w-4" />{t('Wyślij feedback')}</button><button onClick={() => setTab('changelog')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${tab === 'changelog' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}><History className="h-4 w-4" />{t('Co nowego')}</button></div>
      <div className="overflow-y-auto p-5 sm:p-6">
        {tab === 'feedback' ? <form onSubmit={submit} className="space-y-4">
          <div><label className="mb-2 block text-sm font-medium text-slate-300">{t('Rodzaj zgłoszenia')}</label><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"><option value="bug">{t('Błąd')}</option><option value="feature">{t('Pomysł')}</option><option value="other">{t('Inne')}</option></select></div>
          <div><label className="mb-2 block text-sm font-medium text-slate-300">{t('Tytuł')}</label><input required minLength={5} maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder={t('Krótko opisz temat...')} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none placeholder:text-slate-600 focus:border-blue-500" /></div>
          <div><div className="mb-2 flex justify-between text-sm"><label className="font-medium text-slate-300">{t('Opis')}</label><span className="text-slate-600">{form.description.length}/5000</span></div><textarea required minLength={10} maxLength={5000} rows={7} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('Opisz, co się wydarzyło albo co warto dodać...')} className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none placeholder:text-slate-600 focus:border-blue-500" /></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400"><input type="checkbox" checked={form.includeTechnical} onChange={event => setForm({ ...form, includeTechnical: event.target.checked })} className="mt-0.5 h-4 w-4 accent-blue-600" /><span>{t('Dołącz aktualną podstronę i informacje o przeglądarce. Adres e-mail nie będzie publikowany.')}</span></label>
          {result && <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300"><CheckCircle2 className="h-5 w-5" /><span className="flex-1">{t('Utworzono zgłoszenie')} #{result.number}</span><a href={result.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold">GitHub <ExternalLink className="h-4 w-4" /></a></div>}
          <button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}{t('Wyślij feedback')}</button>
        </form> : <div className="space-y-4">
          {releaseState === 'loading' && <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}
          {releaseState === 'error' && <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"><AlertCircle /><span>{t('Nie udało się pobrać changelogu.')}</span></div>}
          {releaseState === 'ready' && releases.length === 0 && <div className="py-14 text-center"><History className="mx-auto h-9 w-9 text-slate-600" /><p className="mt-3 text-slate-400">{t('Nie opublikowano jeszcze żadnego wydania.')}</p></div>}
          {releases.map(release => <article key={release.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-start justify-between gap-4"><div><span className="text-xs font-bold text-blue-400">{release.tag}</span><h3 className="mt-1 text-lg font-bold">{release.name}</h3>{release.published_at && <time className="text-xs text-slate-500">{new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', { dateStyle: 'long' }).format(new Date(release.published_at))}</time>}</div><a href={release.url} target="_blank" rel="noreferrer" aria-label="GitHub" className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"><ExternalLink className="h-4 w-4" /></a></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-400">{release.body || t('Brak dodatkowego opisu.')}</p></article>)}
        </div>}
      </div>
    </motion.section>
  </div>}</AnimatePresence>;
};

export default HelpCenter;
