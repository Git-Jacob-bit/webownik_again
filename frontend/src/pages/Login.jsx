import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api'; // <--- ZMIANA: Importujemy nasze api
import { Link, useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import { toast } from 'react-toastify';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Tworzymy form-data (wymagane przez FastAPI OAuth2)
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      // ZMIANA: Używamy api.post i krótkiej ścieżki
      // Axios automatycznie wykryje FormData i ustawi nagłówki
      const response = await api.post('/auth/token', formData);

      console.log("SUKCES! Token:", response.data);

      // Zapisujemy token w przeglądarce
      localStorage.setItem('token', response.data.access_token);

      toast.success("Zalogowano pomyślnie!");
      
      // Przekierowanie na pulpit
      navigate('/dashboard');

    } catch (err) {
      console.error("Błąd logowania:", err);

      if (err.code === "ERR_NETWORK") {
        setError("Brak połączenia z serwerem API.");
      } else if (err.response && err.response.status === 401) {
        setError("Błędny email lub hasło.");
      } else {
        setError("Wystąpił nieoczekiwany błąd.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        {/* Tło z gradientami */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px]" />
          <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px]" />
        </div>

        {/* Główna karta logowania */}
        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">

            {/* Nagłówek */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">Witaj ponownie!</h1>
              <p className="text-slate-400">Zaloguj się do Webownika</p>
            </div>

            {/* Wyświetlanie błędów */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            {/* Formularz */}
            <form onSubmit={handleLogin} className="space-y-6">

              {/* Pole Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="twoj@email.com"
                    required
                  />
                </div>
              </div>

              {/* Pole Hasło */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">Hasło</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* Link: Zapomniałeś hasła? */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Nie pamiętasz hasła?
                </Link>
              </div>

              {/* Przycisk Logowania */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Logowanie...
                  </>
                ) : (
                  <>
                    Zaloguj się
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

            </form>

            {/* Stopka: Rejestracja */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm">
                Nie masz konta?{' '}
                <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Zarejestruj się
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}

export default Login;