import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'webownik-language';
const LanguageContext = createContext(null);

const english = {
  'Dzisiaj': 'Today', 'Zestawy': 'Decks', 'Zadania': 'Tasks', 'Notatki': 'Notes', 'Linki': 'Links',
  'Centrum wiedzy': 'Knowledge hub', 'Dodaj': 'Add', 'Więcej': 'More', 'Pozostałe sekcje i konto': 'Other sections and account',
  'Ustawienia': 'Settings', 'Język': 'Language', 'Motyw': 'Theme', 'Jasny': 'Light', 'Ciemny': 'Dark',
  'Wyloguj się': 'Sign out', 'Twoje konto': 'Your account', 'Profil i preferencje': 'Profile and preferences',
  'Zwiń menu': 'Collapse menu', 'Rozwiń menu': 'Expand menu', 'Polski': 'Polish', 'Angielski': 'English',
  'Wróć do tego, co ważne.': 'Get back to what matters.',
  'Twój dzień w Webowniku': 'Your day in Webownik',
  'Kontynuuj naukę, uporządkuj zadania albo zapisz nową myśl.': 'Continue learning, organize tasks, or save a new thought.',
  'Przejdź do zestawów': 'Go to decks', 'Do zrobienia': 'To do', 'Najbliższe zadania': 'Upcoming tasks',
  'To, co jeszcze czeka': 'What is still waiting', 'Wszystkie': 'All', 'Wszystko zrobione — dobra robota.': 'Everything is done — great job.',
  'Ostatnie notatki': 'Recent notes', 'Szybki powrót do myśli': 'Quick access to your thoughts',
  'Nie masz jeszcze żadnych notatek.': 'You do not have any notes yet.', 'Pusta notatka': 'Empty note',
  'Lista Zadań': 'Task list', 'Dodaj zadanie': 'Add task', 'Co masz do zrobienia?': 'What do you need to do?',
  'Nowy zestaw': 'New deck', 'Nazwa zestawu...': 'Deck name...', 'Jak przygotować pliki?': 'How to prepare files?',
  'Wybierz pytania lub ZIP': 'Choose questions or ZIP', 'Wiele plików .txt albo jeden .zip': 'Multiple .txt files or one .zip',
  'Wybierz folder': 'Choose folder', 'Wczytane zostaną pliki .txt': '.txt files will be imported', 'Stwórz zestaw': 'Create deck',
  'Instrukcja importu': 'Import guide', 'Format pliku z pytaniami': 'Question file format',
  'Każdy plik musi mieć rozszerzenie .txt. Jedno pytanie składa się z maski poprawnych odpowiedzi, treści pytania i listy odpowiedzi.': 'Each file must have the .txt extension. A question consists of a correct-answer mask, the question text, and a list of answers.',
  'Każda cyfra odpowiada kolejnej odpowiedzi. 1 oznacza odpowiedź poprawną, a 0 błędną.': 'Each digit represents the next answer. 1 means correct and 0 means incorrect.',
  'Pytanie ma dwie poprawne odpowiedzi: pierwszą i trzecią. Liczba cyfr powinna odpowiadać liczbie odpowiedzi.': 'The question has two correct answers: the first and third. The number of digits must match the number of answers.',
  'Pierwsza linia po masce to treść pytania. Następne linie są odpowiedziami aż do kolejnej maski zaczynającej się od X.': 'The first line after the mask is the question. The following lines are answers until the next mask starting with X.',
  'Import: możesz wybrać wiele plików TXT, folder albo jeden ZIP. W folderze i ZIP-ie pozostałe typy plików są pomijane.': 'Import: you can select multiple TXT files, a folder, or one ZIP file. Other file types inside folders and ZIP files are ignored.',
  'Szukaj zestawu...': 'Search decks...', 'Brak zestawów.': 'No decks.', 'Podgląd': 'Preview', 'Rozpocznij': 'Start',
  'Nieprzetłumaczony': 'Not translated', 'W kolejce do tłumaczenia': 'Queued for translation', 'Uruchom tłumaczenie': 'Start translation', 'Ponów tłumaczenie': 'Retry translation', 'Tłumaczenie...': 'Translating...', 'Tłumaczenie gotowe': 'Translation ready', 'Błąd tłumaczenia': 'Translation failed',
  'Nowa notatka': 'New note', 'Edytuj notatkę': 'Edit note', 'Tytuł...': 'Title...', 'Treść...': 'Content...',
  'Zapisz': 'Save', 'Anuluj': 'Cancel', 'Szukaj notatek...': 'Search notes...', 'Brak notatek.': 'No notes.',
  'Dodaj link': 'Add link', 'Adres URL...': 'URL address...', 'Brak linków.': 'No links.',
  'Wygląd': 'Appearance', 'Bezpieczeństwo': 'Security', 'Twój Profil': 'Your profile', 'Adres Email': 'Email address',
  'Obecne hasło': 'Current password', 'Nowe hasło': 'New password', 'Zmień hasło': 'Change password',
  'Strefa Niebezpieczna': 'Danger zone', 'Usuń konto trwale': 'Delete account permanently',
  'Powrót do dashboardu': 'Back to dashboard', 'Zarządzaj swoim kontem': 'Manage your account',
  'Wybierz język interfejsu. Polski pozostaje językiem źródłowym pytań.': 'Choose the interface language. Polish remains the source language for questions.',
  'Pauza': 'Pause', 'Wznów': 'Resume', 'Wyjdź': 'Exit', 'Zostań': 'Stay', 'Wyjść z quizu?': 'Exit the quiz?',
  'Zaznacz poprawne odpowiedzi:': 'Select the correct answers:', 'Sprawdź': 'Check', 'Dalej': 'Next',
  'Bilans odpowiedzi': 'Answer summary', 'Opanowane': 'Mastered', 'W kolejce': 'In queue', 'Czas': 'Time',
  'Powtórz': 'Repeat', 'Sesja ukończona!': 'Session completed!',
  'Potwierdź operację': 'Confirm action', 'Zamknij': 'Close', 'Usuń': 'Delete',
  'Tutorial': 'Tutorial',
  'Witaj w Webowniku!': 'Welcome to Webownik!', 'Twoje nowe centrum dowodzenia nauką. Wszystko w jednym miejscu.': 'Your new learning command center. Everything in one place.',
  'Pomiń': 'Skip', 'Uruchom interaktywny tutorial': 'Start interactive tutorial',
  'Pomoc i aktualizacje': 'Help and updates', 'Pomoc': 'Help', 'Wyślij feedback': 'Send feedback', 'Co nowego': "What's new",
  'Rodzaj zgłoszenia': 'Feedback type', 'Błąd': 'Bug', 'Pomysł': 'Idea', 'Inne': 'Other', 'Tytuł': 'Title', 'Opis': 'Description',
  'Krótko opisz temat...': 'Briefly describe the topic...', 'Opisz, co się wydarzyło albo co warto dodać...': 'Describe what happened or what would be worth adding...',
  'Dołącz aktualną podstronę i informacje o przeglądarce. Adres e-mail nie będzie publikowany.': 'Include the current page and browser information. Your email address will not be published.',
  'Feedback został wysłany. Dziękujemy!': 'Feedback sent. Thank you!', 'Nie udało się wysłać feedbacku.': 'Could not send feedback.',
  'Utworzono zgłoszenie': 'Issue created', 'Nie udało się pobrać changelogu.': 'Could not load the changelog.',
  'Nie opublikowano jeszcze żadnego wydania.': 'No releases have been published yet.', 'Brak dodatkowego opisu.': 'No additional description.',
  'Usunąć zestaw?': 'Delete deck?', 'Zestaw wraz ze wszystkimi pytaniami zostanie trwale usunięty.': 'The deck and all its questions will be permanently deleted.',
  'Usunąć notatkę?': 'Delete note?', 'Usunąć link?': 'Delete link?', 'Tej operacji nie można cofnąć.': 'This action cannot be undone.',
  'Usunąć pytanie?': 'Delete question?', 'Pytanie wraz ze wszystkimi odpowiedziami zostanie trwale usunięte.': 'The question and all its answers will be permanently deleted.',
  'Usunąć konto?': 'Delete account?', 'Tej operacji nie da się cofnąć. Wszystkie Twoje zestawy, pytania i notatki zostaną trwale usunięte.': 'This action cannot be undone. All your decks, questions, and notes will be permanently deleted.',
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
    t: polish => language === 'en' ? (english[polish] || polish) : polish,
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
