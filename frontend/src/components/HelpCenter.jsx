import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../utils/errors';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Field from './ui/Field';
import Alert from './ui/Alert';

const emptyForm = { category: 'bug', title: '', description: '', includeTechnical: true };

const HelpCenter = ({ open, onClose }) => {
  const { language, t } = useLanguage();
  const [tab, setTab] = useState('feedback');
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [releases, setReleases] = useState([]);
  const [releaseState, setReleaseState] = useState('idle');

  useEffect(() => {
    if (!open || tab !== 'changelog' || releaseState !== 'idle') return;
    setReleaseState('loading');
    api.get('/integrations/github/releases')
      .then(({ data }) => { setReleases(data.releases || []); setReleaseState('ready'); })
      .catch(() => setReleaseState('error'));
  }, [open, tab, releaseState]);

  const submit = async event => {
    event.preventDefault();
    setSending(true);
    setResult(null);
    setError('');
    try {
      const technical = form.includeTechnical ? { page: window.location.pathname, browser: navigator.userAgent } : {};
      const { data } = await api.post('/integrations/github/feedback', { category: form.category, title: form.title, description: form.description, ...technical });
      setResult(data);
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage(err, t('Nie udało się wysłać feedbacku.')));
    } finally {
      setSending(false);
    }
  };

  const tabClass = active => `min-h-[44px] flex-1 rounded-md px-3 text-[15px] font-bold transition ${active ? 'bg-key text-key-ink' : 'text-muted hover:text-ink'}`;

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('Pomoc i aktualizacje')}>
      <div className="mb-5 flex gap-1 rounded-lg p-1 ring-[1.5px] ring-inset ring-ink/15" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'feedback'} className={tabClass(tab === 'feedback')} onClick={() => setTab('feedback')}>{t('Wyślij feedback')}</button>
        <button type="button" role="tab" aria-selected={tab === 'changelog'} className={tabClass(tab === 'changelog')} onClick={() => setTab('changelog')}>{t('Co nowego')}</button>
      </div>

      {tab === 'feedback' ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Alert>{error}</Alert>
          {result && (
            <Alert type="success">
              {t('Utworzono zgłoszenie')} #{result.number}.{' '}
              <a href={result.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1">GitHub <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
            </Alert>
          )}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[15px] font-bold">{t('Rodzaj zgłoszenia')}</legend>
            <div className="flex flex-wrap gap-2">
              {[['bug', 'Błąd'], ['feature', 'Pomysł'], ['other', 'Inne']].map(([value, label]) => (
                <label key={value} className={`flex min-h-[44px] cursor-pointer items-center rounded-md px-4 font-bold ring-inset transition ${form.category === value ? 'ring-[2.5px] ring-accent' : 'ring-[1.5px] ring-ink/15 text-muted hover:text-ink'}`}>
                  <input type="radio" name="category" value={value} checked={form.category === value} onChange={() => setForm({ ...form, category: value })} className="sr-only" />
                  {t(label)}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={t('Tytuł')} required minLength={5} maxLength={120} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder={t('Krótko opisz temat...')} />
          <Field
            multiline
            rows={6}
            label={t('Opis')}
            labelAside={<span className="text-sm text-faint">{form.description.length}/5000</span>}
            required
            minLength={10}
            maxLength={5000}
            value={form.description}
            onChange={event => setForm({ ...form, description: event.target.value })}
            placeholder={t('Opisz, co się wydarzyło albo co warto dodać...')}
          />
          <Alert type="info">{t('Zgłoszenie trafi do publicznego repozytorium na GitHubie. Nie wpisuj danych osobowych, haseł ani treści, których nie chcesz publikować.')}</Alert>
          <label className="flex cursor-pointer items-start gap-3 text-[15px] text-muted">
            <input type="checkbox" className="xbox mt-0.5" checked={form.includeTechnical} onChange={event => setForm({ ...form, includeTechnical: event.target.checked })} />
            <span>{t('Dołącz aktualną podstronę i informacje o przeglądarce. Adres e-mail nie będzie publikowany.')}</span>
          </label>
          <Button type="submit" block loading={sending}>{t('Wyślij feedback')}</Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          {releaseState === 'loading' && <div className="flex justify-center py-14"><Loader2 className="h-7 w-7 animate-spin text-muted" aria-label={t('Ładowanie')} /></div>}
          {releaseState === 'error' && <Alert>{t('Nie udało się pobrać changelogu.')}</Alert>}
          {releaseState === 'ready' && releases.length === 0 && <p className="py-10 text-center text-muted">{t('Nie opublikowano jeszcze żadnego wydania.')}</p>}
          {releases.map(release => (
            <article key={release.id} className="on-paper rounded-[4px] bg-card px-5 pb-5 text-card-ink shadow-paper">
              <div className="flex min-h-[46px] items-center justify-between gap-3 text-[13px] font-semibold text-card-muted">
                <span>{release.tag}{release.published_at && ` · ${new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-US', { dateStyle: 'long' }).format(new Date(release.published_at))}`}</span>
                <a href={release.url} target="_blank" rel="noreferrer" aria-label={t('Otwórz wydanie {name} na GitHubie', { name: release.name || release.tag })} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md hover:bg-card-ink/10"><ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <div className="-mx-5 h-[3px] bg-pen" />
              <h3 className="mt-3 font-slab text-xl font-bold">{release.name}</h3>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-7">{release.body || t('Brak dodatkowego opisu.')}</p>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default HelpCenter;
