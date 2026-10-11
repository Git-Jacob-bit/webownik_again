import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useConfirm } from '../../context/ConfirmDialogContext';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import Alert from '../../components/ui/Alert';
import notify from '../../components/ui/notify';
import { getErrorMessage } from '../../utils/errors';
import { DeleteButton } from './parts';
import { focusForm, useCreateRequest } from './shared';

// Lokalna ikona zamiast zewnętrznego serwisu faviconów — domeny linków nie wychodzą poza aplikację.
const getInitial = linkUrl => {
  try { return new URL(linkUrl).hostname.replace(/^www\./, '').charAt(0).toUpperCase(); } catch { return '?'; }
};
const displayUrl = linkUrl => linkUrl.replace(/^https?:\/\/(www\.)?/, '');

const LinksView = ({ onCountsChange }) => {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [links, setLinks] = useState([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await api.get('/links');
      setLinks(res.data);
      onCountsChange?.('links', res.data.length);
    } catch {
      notify.error(t('Nie udało się pobrać linków.'));
    }
  }, [onCountsChange, t]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);
  useCreateRequest(() => focusForm('create-link'));

  const handleAddLink = async event => {
    event.preventDefault();
    if (!title.trim() || !url.trim()) { setError(t('Podaj nazwę i adres linku.')); return; }
    setError('');
    setSaving(true);
    const finalUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    try {
      await api.post('/links', { title: title.trim(), url: finalUrl, category: 'Ogólne' });
      setTitle(''); setUrl('');
      notify.success(t('Link dodany.'));
      fetchLinks();
    } catch (err) {
      setError(getErrorMessage(err, t('Nie udało się dodać linku. Sprawdź adres.')));
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async link => {
    if (!await confirm({ title: 'Usunąć link?', message: 'Tej operacji nie można cofnąć.' })) return;
    try {
      await api.delete(`/links/${link.id}`);
      notify.info(t('Link usunięty.'));
      fetchLinks();
    } catch (err) {
      notify.error(getErrorMessage(err, t('Nie udało się usunąć linku.')));
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-slab text-[38px] font-bold leading-none sm:text-[46px]">{t('Linki')}</h1>
        <p className="text-base text-muted">{t('Materiały spoza aplikacji: wykłady, dokumentacje, nagrania.')}</p>
      </div>
      <form id="create-link" onSubmit={handleAddLink} noValidate className="flex scroll-mt-28 flex-col gap-3">
        <Alert>{error}</Alert>
        <div className="flex flex-wrap items-end gap-3">
          <Field data-autofocus className="min-w-0 flex-[1_1_220px]" label={t('Nazwa')} value={title} onChange={event => setTitle(event.target.value)} placeholder={t('np. Slajdy z wykładu 4')} />
          <Field className="min-w-0 flex-[2_1_320px]" label={t('Adres')} value={url} onChange={event => setUrl(event.target.value)} placeholder="eportal.pwr.edu.pl/…" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          <Button type="submit" loading={saving} className="w-full sm:w-auto">{t('Dodaj link')}</Button>
        </div>
      </form>
      <ul className="flex flex-col border-t-[3px] border-accent">
        {links.map(link => (
          <li key={link.id} className="grid min-h-[76px] grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-ink/15 px-1 py-2 transition hover:bg-raise sm:grid-cols-[52px_minmax(0,1fr)_auto]">
            <span aria-hidden="true" className="flex aspect-square items-center justify-center rounded-[4px] bg-card font-slab text-2xl font-bold text-card-ink" style={{ boxShadow: '0 0 0 1px var(--card-edge), inset 0 4px 0 rgb(var(--c-card)), inset 0 6px 0 rgb(var(--c-pen))' }}>{getInitial(link.url)}</span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="link break-words text-[17px] decoration-[1.5px]">{link.title}</a>
              <span className="truncate text-sm text-muted">{displayUrl(link.url)}</span>
            </div>
            <DeleteButton label={t('Usuń link {name}', { name: link.title })} onClick={() => deleteLink(link)} />
          </li>
        ))}
      </ul>
      {!links.length && <p className="text-muted">{t('Nie masz jeszcze linków. Dodaj pierwszy powyżej.')}</p>}
    </div>
  );
};

export default LinksView;
