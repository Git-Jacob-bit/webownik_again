import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthCard, paperKey } from '../components/auth/AuthLayout';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

const EmailConfirmed = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  // Supabase odsyła błąd w hashu albo w query; po odczytaniu czyścimy adres.
  const [error] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const message = hash.get('error_description') || query.get('error_description');
    window.history.replaceState({}, document.title, window.location.pathname);
    return message;
  });

  return (
    <AuthLayout>
      <AuthCard as="section" title={t(error ? 'Link jest nieprawidłowy' : 'E-mail potwierdzony')}>
        <Alert tone="paper" type={error ? 'error' : 'success'}>
          {error ? t(error) : t('Twoje konto jest aktywne. Możesz się teraz zalogować.')}
        </Alert>
        <Button size="lg" block className={paperKey} onClick={() => navigate('/login')}>
          {t('Przejdź do logowania')}
        </Button>
      </AuthCard>
    </AuthLayout>
  );
};

export default EmailConfirmed;
