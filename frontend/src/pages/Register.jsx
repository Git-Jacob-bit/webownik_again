import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne.");
      setIsLoading(false);
      return;
    }

    try {
      // Uderzamy do Twojego backendu
      await axios.post('http://localhost:8000/auth/register', {
        email: email,
        password: password
      });
      
      alert("Konto utworzone! Możesz się zalogować.");
      navigate('/login'); // Przekierowanie do logowania
      
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail); // Np. "Ten email jest już zajęty"
      } else {
        setError("Wystąpił błąd rejestracji.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Tło */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Dołącz do nas</h1>
            <p className="text-slate-400">Utwórz darmowe konto w Webowniku</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            
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

             <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Powtórz hasło</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><UserPlus className="h-5 w-5" /> Zarejestruj się</>}
            </button>

          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Masz już konto?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;