import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import api from '../api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { getErrorMessage } from '../utils/errors';
import Button from '../components/ui/Button';
import { PasswordField } from '../components/ui/Field';
import Alert from '../components/ui/Alert';

const Section = ({ title, description, danger = false, children }) => (
  <section className="grid gap-4 border-t border-ink/15 py-8 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-12">
    <div>
      <h2 className={`font-slab text-[26px] font-bold leading-tight ${danger ? 'text-accent-text' : ''}`}>{title}</h2>
      {description && <p className="mt-1.5 leading-relaxed text-muted">{description}</p>}
    </div>
    <div className="min-w-0">{children}</div>
  </section>
);

// Miniatura biurka z fiszką – podgląd motywu.
const ThemePreview = ({ variant }) => {
  const dark = variant === 'dark';
  return (
    <span aria-hidden="true" className="flex h-[72px] items-end gap-1.5 rounded-[5px] p-2.5" style={{ background: dark ? '#120E0C' : '#E8DFD2' }}>
      <span
        className="h-[46px] w-2/5 rounded-[3px]"
        style={{
          background: dark ? '#F4EBDE' : '#FFFDF8',
          boxShadow: `inset 0 6px 0 ${dark ? '#F4EBDE' : '#FFFDF8'}, inset 0 8px 0 ${dark ? '#E2574C' : '#C23A30'}${dark ? '' : ', 0 0 0 1px rgba(36,25,21,.12)'}`,
        }}
      />
      <span className="h-2.5 flex-1 rounded-sm" style={{ background: dark ? '#3A2C24' : '#D3C6B5' }} />
    </span>
  );
};

const Choice = ({ selected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={`flex min-h-[52px] flex-col justify-center gap-2.5 rounded-lg p-3 text-left text-[15px] font-bold transition ${selected ? 'ring-[2.5px] ring-inset ring-accent' : 'ring-[1.5px] ring-inset ring-ink/15 hover:ring-ink/30'}`}
  >
    {children}
  </button>
);

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const confirm = useConfirm();
  const [userInfo, setUserInfo] = useState({ id: '', email: '' });
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, type: '', message: '' });
  const [exportState, setExportState] = useState({ loading: false, error: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteState, setDeleteState] = useState({ loading: false, error: '' });

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUserInfo({ id: res.data.id, email: res.data.email }))
      .catch(err => console.error('Błąd pobierania danych użytkownika', err));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordState({ loading: true, type: '', message: '' });
    try {
      await api.post('/auth/change-password', passwords);
      setPasswords({ old_password: '', new_password: '' });
      setPasswordState({ loading: false, type: 'success', message: t('Hasło zmienione.') });
    } catch (err) {
      setPasswordState({ loading: false, type: 'error', message: getErrorMessage(err, t('Nie udało się zmienić hasła.')) });
    }
  };

  const handleExport = async () => {
    setExportState({ loading: true, error: '' });
    try {
      const res = await api.get('/account/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'webownik-export.json';
      link.click();
      URL.revokeObjectURL(url);
      setExportState({ loading: false, error: '' });
    } catch (err) {
      setExportState({ loading: false, error: getErrorMessage(err, t('Nie udało się pobrać danych.')) });
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteState({ loading: false, error: '' });
    const ok = await confirm({
      title: 'Usunąć konto?',
      message: 'Tej operacji nie da się cofnąć. Wszystkie Twoje zestawy, pytania i notatki zostaną trwale usunięte.',
      confirmLabel: 'Usuń konto trwale',
    });
    if (!ok) return;
    setDeleteState({ loading: true, error: '' });
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      navigate('/login', { state: { notice: { type: 'info', message: 'Konto zostało usunięte.' } } });
    } catch (err) {
      setDeleteState({ loading: false, error: getErrorMessage(err, t('Nie udało się usunąć konta.')) });
    }
  };

  return (
    <AnimatedPage>
      <div className="desk relative min-h-[100dvh] px-4 py-6 text-ink sm:px-8 sm:py-8">
        <div className="relative mx-auto flex max-w-[1080px] flex-col gap-5">
          <Link to="/today" className="link self-start py-2 text-[15px]">{t('Wróć do pulpitu')}</Link>
          <main className="rounded-2xl bg-panel px-5 py-7 shadow-lift sm:px-10 sm:py-12 lg:px-14">
            <h1 className="mb-6 font-slab text-[40px] font-bold leading-none sm:text-[52px]">{t('Ustawienia')}</h1>

            <Section title={t('Wygląd')} description={t('Zapamiętamy wybór na tym urządzeniu.')}>
              <div className="grid max-w-[520px] grid-cols-2 gap-3.5">
                <Choice selected={theme === 'dark'} onClick={() => setTheme('dark')}><ThemePreview variant="dark" />{t('Ciemny')}</Choice>
                <Choice selected={theme === 'light'} onClick={() => setTheme('light')}><ThemePreview variant="light" />{t('Jasny')}</Choice>
              </div>
            </Section>

            <Section title={t('Język')} description={t('Pytania zostają po polsku, a wersję angielską tłumaczymy osobno.')}>
              <div className="grid max-w-[520px] grid-cols-2 gap-3.5">
                <Choice selected={language === 'pl'} onClick={() => setLanguage('pl')}><span className="text-center">Polski</span></Choice>
                <Choice selected={language === 'en'} onClick={() => setLanguage('en')}><span className="text-center">English</span></Choice>
              </div>
            </Section>

            <Section title={t('Konto')} description={t('Tych danych nie możesz zmienić.')}>
              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-3 text-base">
                <dt className="text-muted">{t('E-mail')}</dt>
                <dd className="m-0 break-all font-semibold">{userInfo.email || t('Ładowanie…')}</dd>
                <dt className="text-muted">{t('Identyfikator')}</dt>
                <dd className="m-0 break-all font-mono text-sm text-muted">{userInfo.id || '…'}</dd>
              </dl>
            </Section>

            <Section title={t('Hasło')} description={t('Co najmniej 8 znaków.')}>
              <form onSubmit={handleChangePassword} className="flex max-w-[520px] flex-col gap-4">
                <Alert type={passwordState.type || 'error'}>{passwordState.message}</Alert>
                <PasswordField
                  label={t('Obecne hasło')}
                  name="old_password"
                  autoComplete="current-password"
                  value={passwords.old_password}
                  onChange={e => setPasswords({ ...passwords, old_password: e.target.value })}
                  required
                />
                <PasswordField
                  label={t('Nowe hasło')}
                  name="new_password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={passwords.new_password}
                  onChange={e => setPasswords({ ...passwords, new_password: e.target.value })}
                  required
                />
                <Button type="submit" loading={passwordState.loading} className="self-start">{t('Zmień hasło')}</Button>
              </form>
            </Section>

            <Section title={t('Twoje dane')} description={t('Zestawy, notatki, zadania, linki i historia nauki w pliku JSON.')}>
              <div className="flex max-w-[520px] flex-col items-start gap-4">
                <Alert>{exportState.error}</Alert>
                <Button variant="outline" onClick={handleExport} loading={exportState.loading}>{t('Pobierz kopię danych')}</Button>
              </div>
            </Section>

            <Section danger title={t('Usuń konto')} description={t('Usuniemy wszystko na zawsze. Tego nie da się cofnąć.')}>
              <form onSubmit={handleDeleteAccount} className="flex max-w-[520px] flex-col gap-4">
                <Alert>{deleteState.error}</Alert>
                <div className="flex flex-wrap items-end gap-3">
                  <PasswordField
                    className="min-w-[220px] flex-1"
                    label={t('Potwierdź hasłem')}
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="danger" loading={deleteState.loading}>{t('Usuń konto')}</Button>
                </div>
              </form>
            </Section>
          </main>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default Settings;
