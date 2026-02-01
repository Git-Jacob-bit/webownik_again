// static/js/auth_helper.js

const token = localStorage.getItem('token');

// 1. Jeśli brak tokena, od razu wyrzucamy na login
if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('register')) {
    window.location.href = '/login';
}

// 2. Uniwersalna funkcja do zapytań API
async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        // Jeśli backend powie 401 (Unauthorized), sesja wygasła
        if (response.status === 401) {
            alert("Sesja wygasła. Zaloguj się ponownie.");
            localStorage.removeItem('token');
            window.location.href = '/login';
            return null;
        }

        return response;
    } catch (error) {
        console.error("Błąd sieci:", error);
        return null;
    }
}