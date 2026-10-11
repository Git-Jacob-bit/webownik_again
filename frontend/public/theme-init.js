// Ustawia motyw przed pierwszym renderem, żeby nie było błysku złego koloru.
(() => {
  let saved = null;
  try {
    saved = localStorage.getItem('webownik-theme');
  } catch {
    // Prywatne okno lub zablokowany storage — motyw z ustawień systemu.
  }
  const theme = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
})();
