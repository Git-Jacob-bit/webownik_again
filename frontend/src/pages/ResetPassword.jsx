import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import api from '../api';
import { toast } from 'react-toastify';
import InlineMessage from '../components/InlineMessage';


const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [link] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const result = {
      accessToken: hash.get('access_token') || query.get('access_token'),
      error: hash.get('error_description') || query.get('error_description'),
    };
    window.history.replaceState({}, document.title, window.location.pathname);
    return result;
  });

  const submit = async (event) => {
    event.preventDefault();
    if (!link.accessToken) return setError(link.error || 'Link resetujący jest nieprawidłowy lub wygasł.');
    if (password !== confirmation) return setError('Hasła nie są identyczne.');
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password-confirm', {
        access_token: link.accessToken,
        new_password: password,
      });
      toast.success('Hasło zostało zmienione.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Nie udało się zmienić hasła.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <Link to="/login" className="inline-flex items-center text-sm text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Wróć do logowania
        </Link>
        <h1 className="text-2xl font-bold mb-2">Ustaw nowe hasło</h1>
        <p className="text-slate-400 mb-6">Hasło musi mieć co najmniej 8 znaków.</p>
        <InlineMessage message={error || link.error || (!link.accessToken ? 'Link resetujący jest nieprawidłowy lub wygasł.' : '')} />
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
            <input type="password" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Nowe hasło" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500" />
          </div>
          <input type="password" minLength="8" required value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Powtórz nowe hasło" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 outline-none focus:border-blue-500" />
          <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 rounded-xl py-3 font-semibold flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
