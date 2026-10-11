import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout, { AuthCard, PaperLink, paperKey } from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { PasswordField } from '../components/ui/Field';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../utils/errors';

const INVALID_LINK = 'Link do zmiany hasła jest nieprawidłowy lub wygasł. Poproś o nowy.';

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Token przychodzi w hashu (Supabase) albo w query; od razu usuwamy go z paska adresu.
  const [link] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const result = {
      accessToken: hash.get('access_token') || query.get('access_token'),
      error: hash.get('error_description') || query.get('error_description'),
    };
    window.history.replaceState({}, document.title, window.location.pathname);
    return result;
  });

  const linkError = link.error || (!link.accessToken ? INVALID_LINK : '');

  const submit = async (event) => {
    event.preventDefault();
    if (!link.accessToken) return setError(link.error || INVALID_LINK);
    if (password.length < 8) return setError('Hasło musi mieć co najmniej 8 znaków.');
    if (password !== confirmation) return setError('Hasła nie są identyczne.');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password-confirm', { access_token: link.accessToken, new_password: password });
      navigate('/login', { state: { notice: { type: 'success', message: 'Hasło zmienione. Zaloguj się nowym hasłem.' } } });
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się zmienić hasła.'));
    } finally {
      setLoading(false);
    }
  };

  const message = error || linkError;

  return (
    <AuthLayout>
      <AuthCard
        title={t('Ustaw nowe hasło')}
        aside={<PaperLink to="/login">{t('Wróć do logowania')}</PaperLink>}
        onSubmit={submit}
      >
        <Alert tone="paper">
          {message && <>
            {t(message)}
            {!link.accessToken && <> <PaperLink to="/forgot-password">{t('Wyślij nowy link')}</PaperLink></>}
          </>}
        </Alert>

        <PasswordField
          tone="paper"
          label={t('Nowe hasło')}
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={event => setPassword(event.target.value)}
          hint={t('Co najmniej 8 znaków.')}
          required
        />
        <PasswordField
          tone="paper"
          label={t('Powtórz nowe hasło')}
          autoComplete="new-password"
          minLength={8}
          value={confirmation}
          onChange={event => setConfirmation(event.target.value)}
          required
        />

        <Button type="submit" size="lg" block loading={loading} disabled={!link.accessToken} className={paperKey}>
          {t('Zmień hasło')}
        </Button>
      </AuthCard>
    </AuthLayout>
  );
};

export default ResetPassword;
