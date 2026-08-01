import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import api from '../api'; // <--- ZMIANA: Importujemy nasze api
import { Link } from 'react-router-dom';
import InlineMessage from '../components/InlineMessage';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // ZMIANA: Używamy api.post i krótkiej ścieżki.
      // Adres serwera (localhost lub IP) zostanie dodany automatycznie z api.js
      await api.post(`/auth/forgot-password?email=${email}`);
      
      setStatus({ 
        type: 'success', 
        message: 'Jeśli podany email istnieje, wysłaliśmy na niego link do resetu hasła.' 
      });
      
    } catch (err) {
      console.error(err);
      setStatus({ 
        type: 'error', 
        message: 'Wystąpił problem z wysyłką. Spróbuj ponownie później.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute -bottom-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          
          <div className="mb-8">
             <Link to="/login" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" /> Wróć do logowania
             </Link>
            <h1 className="text-2xl font-bold text-white mb-2">Reset hasła</h1>
            <p className="text-slate-400">Podaj email powiązany z Twoim kontem.</p>
          </div>

          <InlineMessage message={status.message} type={status.type} />

          <form onSubmit={handleReset} className="space-y-6">
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Wyślij link <ArrowRight className="h-5 w-5" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
