import axios from 'axios';

// Pobieramy adres z pliku .env. 
// Jeśli go nie ma, domyślnie użyje localhosta.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
});

// --- INTERCEPTORY (To co miałeś w Dashboardzie) ---

// 1. Dodawanie tokena do każdego zapytania
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Wyrzucanie użytkownika jak token wygaśnie (Błąd 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Opcjonalnie: czyścimy inne śmieci
      localStorage.removeItem('hasSeenIntro');
      window.location.href = '/'; // Przekieruj do logowania
    }
    return Promise.reject(error);
  }
);

export default api;