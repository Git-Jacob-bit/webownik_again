// Zamienia błąd z axiosa na tekst, który można bezpiecznie wyrenderować.
export const getErrorMessage = (err, fallback = 'Wystąpił nieoczekiwany błąd.') => {
  if (err?.code === 'ERR_NETWORK') return 'Brak połączenia z serwerem API.';
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    const message = detail.map(item => item?.msg).filter(Boolean).join(' ');
    if (message) return message;
  }
  return fallback;
};
