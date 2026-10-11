import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

// Powitanie przy pierwszej wizycie – proponuje interaktywny tutorial.
const IntroModal = ({ open, onClose, onStart }) => {
  const { t } = useLanguage();
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('Witaj w Webowniku')}
      description={t('Wgrywasz pytania, odpowiadasz na fiszkach, a Webownik pilnuje, które musisz powtórzyć. Tutorial pokaże wszystko w dwie minuty.')}
      footer={<>
        <Button variant="outline" onClick={onClose}>{t('Pomiń')}</Button>
        <Button onClick={onStart}>{t('Uruchom interaktywny tutorial')}</Button>
      </>}
    />
  );
};

export default IntroModal;
