(function() {
    // 1. Sprawdzamy czy jest token
    const token = localStorage.getItem('token');

    // 2. Jeśli nie ma tokena, natychmiast wyrzucamy do logowania
    if (!token) {
        // Opcjonalnie: Zapisz gdzie użytkownik chciał wejść, żeby wrócić tam po zalogowaniu
        sessionStorage.setItem('redirect_after_login', window.location.pathname);
        
        // Przekierowanie
        window.location.href = '/login';
    }
})();