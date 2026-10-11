import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout, { AuthCard, PaperLink, paperKey } from '../components/auth/AuthLayout';
import TurnstileWidget from '../components/TurnstileWidget';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Field, { PasswordField } from '../components/ui/Field';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../utils/errors';

function Login() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  // Komunikat z przekierowania (rejestracja, reset hasła, wylogowanie, usunięcie konta).
  const [notice] = useState(() => location.state?.notice || null);

  useEffect(() => {
    // Czyścimy stan historii, żeby odświeżenie strony nie pokazało komunikatu drugi raz.
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

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
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') setError('Brak połączenia z serwerem API.');
      else if (err.response?.status === 403) setError(getErrorMessage(err, 'Najpierw potwierdź adres e-mail.'));
      else if (err.response?.status === 401) setError('Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.');
      else setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title={t('Zaloguj się')}
        aside={<PaperLink to="/register">{t('Nie mam konta')}</PaperLink>}
        onSubmit={handleLogin}
      >
        {notice && !error && <Alert tone="paper" type={notice.type === 'error' ? 'error' : notice.type === 'info' ? 'info' : 'success'}>{t(notice.message)}</Alert>}
        <Alert tone="paper">{error && t(error)}</Alert>

        <Field
          tone="paper"
          label={t('E-mail')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder={t('ty@uczelnia.pl')}
          required
        />
        <PasswordField
          tone="paper"
          label={t('Hasło')}
          labelAside={<PaperLink to="/forgot-password" className="text-sm">{t('Nie pamiętam hasła')}</PaperLink>}
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder={t('Twoje hasło')}
          required
        />

        <TurnstileWidget onToken={setTurnstileToken} theme="light" />

        <Button type="submit" size="lg" block loading={isLoading} className={paperKey}>
          {isLoading ? t('Logowanie…') : t('Zaloguj się')}
        </Button>
      </AuthCard>
    </AuthLayout>
  );
}

export default Login;
