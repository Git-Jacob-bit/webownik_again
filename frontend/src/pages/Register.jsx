import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import AuthLayout, { AuthCard, PaperLink, paperKey } from '../components/auth/AuthLayout';
import TurnstileWidget from '../components/TurnstileWidget';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Field, { PasswordField } from '../components/ui/Field';
import { useLanguage } from '../context/LanguageContext';
import { getErrorMessage } from '../utils/errors';

function Register() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) return setError('Hasło musi mieć co najmniej 8 znaków.');
    if (password !== confirmPassword) return setError('Hasła nie są identyczne.');

    setIsLoading(true);
    try {
      await api.post('/auth/register', { email, password, turnstile_token: turnstileToken || null });
      navigate('/login', {
        state: { notice: { type: 'success', message: 'Konto utworzone. Kliknij link z e-maila, który właśnie wysłaliśmy, a potem zaloguj się.' } },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Nie udało się utworzyć konta. Spróbuj ponownie.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title={t('Załóż konto')}
        aside={<PaperLink to="/login">{t('Mam już konto')}</PaperLink>}
        onSubmit={handleRegister}
      >
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
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={event => setPassword(event.target.value)}
          hint={t('Co najmniej 8 znaków.')}
          required
        />
        <PasswordField
          tone="paper"
          label={t('Powtórz hasło')}
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          required
        />

        <TurnstileWidget onToken={setTurnstileToken} theme="light" />

        <Button type="submit" size="lg" block loading={isLoading} className={paperKey}>
          {t('Załóż konto')}
        </Button>
      </AuthCard>
    </AuthLayout>
  );
}

export default Register;
