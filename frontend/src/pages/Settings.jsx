import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowLeft, Lock, Save, Loader2, User, Mail, Trash2, ShieldAlert } from 'lucide-react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({ id: '', email: '' });
  
  // Stan do formularza hasła
  const [formData, setFormData] = useState({
    old_password: '',
    new_password: ''
  });

  // 1. Pobierz dane użytkownika przy wejściu na stronę
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserInfo({ id: res.data.id, email: res.data.email });
      } catch (err) {
        console.error("Błąd pobierania danych usera", err);
      }
    };
    fetchUserData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. Obsługa zmiany hasła
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/auth/change-password', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Hasło zostało zmienione!");
      setFormData({ old_password: '', new_password: '' });
    } catch (err) {
      const msg = err.response?.data?.detail || "Nie udało się zmienić hasła.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 3. Obsługa usuwania konta
  const handleDeleteAccount = async () => {
    if (!window.confirm("CZY JESTEŚ PEWIEN?\n\nTej operacji nie da się cofnąć. Wszystkie Twoje zestawy, pytania i notatki zostaną trwale usunięte.")) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:8000/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.info("Twoje konto zostało usunięte. Żegnaj! 👋");
      
      // Czyścimy token i wylogowujemy
      localStorage.removeItem('token');
      navigate('/');
      
    } catch (err) {
      console.error(err);
      toast.error("Wystąpił błąd podczas usuwania konta.");
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-lg space-y-6">
          
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" /> Powrót do dashboardu
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-600/20 rounded-xl text-blue-500">
              <SettingsIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ustawienia</h1>
              <p className="text-slate-500 text-sm">Zarządzaj swoim kontem</p>
            </div>
          </div>

          {/* --- SEKCJA 1: DANE KONTA (READ ONLY) --- */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-300">
              <User className="h-5 w-5" /> Twój Profil
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">Adres Email</label>
                <div className="relative opacity-60">
                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={userInfo.email || 'Ładowanie...'} 
                    disabled 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-400 cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-600" />
                </div>
              </div>
              
              <div>
                <label className="block text-slate-500 text-xs font-bold uppercase mb-1">ID Użytkownika</label>
                <div className="relative opacity-60">
                  <div className="absolute left-3 top-2.5 text-slate-400 font-mono">#</div>
                  <input 
                    type="text" 
                    value={userInfo.id || '...'} 
                    disabled 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-slate-400 cursor-not-allowed font-mono"
                  />
                  <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          {/* --- SEKCJA 2: ZMIANA HASŁA --- */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-300">
              <Lock className="h-5 w-5" /> Bezpieczeństwo
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Obecne hasło</label>
                <input 
                  type="password" 
                  name="old_password"
                  value={formData.old_password}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm font-medium mb-1">Nowe hasło</label>
                <input 
                  type="password" 
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 focus:border-blue-500 outline-none transition-all"
                  placeholder="Min. 4 znaki"
                  minLength={4}
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                Zmień hasło
              </button>
            </form>
          </div>

          {/* --- SEKCJA 3: STREFA NIEBEZPIECZNA --- */}
          <div className="border border-red-900/30 bg-red-950/10 p-6 rounded-2xl">
            <h3 className="text-red-500 font-bold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Strefa Niebezpieczna
            </h3>
            <p className="text-red-400/70 text-sm mb-4">
              Usunięcie konta jest nieodwracalne. Stracisz dostęp do wszystkich swoich zestawów i notatek.
            </p>
            <button 
              onClick={handleDeleteAccount}
              className="w-full border border-red-900 text-red-500 hover:bg-red-900/20 font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Trash2 className="h-5 w-5" />
              Usuń konto trwale
            </button>
          </div>

        </div>
      </div>
    </AnimatedPage>
  );
};

export default Settings;