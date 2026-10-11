import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import english from '../i18n';

const STORAGE_KEY = 'webownik-language';
const LanguageContext = createContext(null);

const pluralForm = (language, count, forms) => {
  const n = Math.abs(count);
  if (language === 'en') return n === 1 ? forms[0] : forms[forms.length - 1];
  if (n === 1) return forms[0];
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1] ?? forms[0];
  return forms[2] ?? forms[forms.length - 1];
};

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
    // {n|pytanie|pytania|pytań} wybiera formę dla liczby n (po angielsku: {n|question|questions}).
    t: (polish, vars) => {
      const text = language === 'en' ? (english[polish] || polish) : polish;
      if (!vars) return text;
      return text.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (match, key, forms) => {
        if (!(key in vars)) return match;
        return forms ? pluralForm(language, Number(vars[key]), forms.split('|')) : vars[key];
      });
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
