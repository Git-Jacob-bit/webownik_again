import common from './common';
import auth from './auth';
import app from './app';
import decks from './decks';
import quiz from './quiz';
import settings from './settings';

// Każdy obszar aplikacji ma własny plik, żeby zmiany się nie nakładały.
const english = { ...common, ...auth, ...app, ...decks, ...quiz, ...settings };

export default english;
