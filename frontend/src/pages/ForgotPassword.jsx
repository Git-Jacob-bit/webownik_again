import React, { useState } from 'react';
import api from '../api';
import AuthLayout, { AuthCard, PaperLink, paperKey } from '../components/auth/AuthLayout';
import TurnstileWidget from '../components/TurnstileWidget';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import { useLanguage } from '../context/LanguageContext';

function ForgotPassword() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleReset = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.post('/auth/forgot-password', { email, turnstile_token: turnstileToken || null });
      setStatus({ type: 'success', message: 'Jeśli konto z tym adresem istnieje, wysłaliśmy na nie link do zmiany hasła.' });
    } catch (err) {
      setStatus({
        type: 'error',
        message: err.code === 'ERR_NETWORK' ? 'Brak połączenia z serwerem API.' : 'Nie udało się wysłać linku. Spróbuj ponownie za chwilę.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title={t('Nowe hasło')}
        aside={<PaperLink to="/login">{t('Wróć do logowania')}</PaperLink>}
        onSubmit={handleReset}
      >
        <p className="leading-relaxed text-card-muted">{t('Podaj e-mail konta, a wyślemy link do ustawienia nowego hasła.')}</p>
        <Alert tone="paper" type={status.type || 'error'}>{status.message && t(status.message)}</Alert>

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

        <TurnstileWidget onToken={setTurnstileToken} theme="light" />

        <Button type="submit" size="lg" block loading={isLoading} className={paperKey}>
          {t('Wyślij link')}
        </Button>
      </AuthCard>
    </AuthLayout>
  );
}

export default ForgotPassword;
