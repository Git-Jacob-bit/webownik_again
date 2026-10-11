import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import english from '../i18n';

const STORAGE_KEY = 'webownik-language';
const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'pl');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({
    language,
    isEnglish: language === 'en',
    setLanguage,
    toggleLanguage: () => setLanguage(current => current === 'pl' ? 'en' : 'pl'),
    // t('Usunięto {name}.', { name }) – zmienne w klamrach działają w obu językach.
    t: (polish, vars) => {
      const text = language === 'en' ? (english[polish] || polish) : polish;
      return vars ? text.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? vars[key] : match)) : text;
    },
    localized: item => language === 'en' && item?.content_en ? item.content_en : item?.content,
    localizedTitle: item => language === 'en' && item?.title_en ? item.title_en : item?.title,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
};
