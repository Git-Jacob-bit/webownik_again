import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../api';
import AppShell, { sections } from '../components/AppShell';
import TodayView from './dashboard/TodayView';
import DecksView from './dashboard/DecksView';
import TasksView from './dashboard/TasksView';
import NotesView from './dashboard/NotesView';
import LinksView from './dashboard/LinksView';
import IntroModal from './dashboard/IntroModal';

const views = { today: TodayView, decks: DecksView, tasks: TasksView, notes: NotesView, links: LinksView };

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.slice(1);
  const [showIntro, setShowIntro] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!localStorage.getItem('hasSeenIntro')) setShowIntro(true);
    api.get('/auth/me').then(({ data }) => setUserEmail(data.email || '')).catch(() => {});
    // Liczby w zakładkach; sekcje aktualizują je same po zmianach.
    Promise.allSettled([api.get('/decks/mine'), api.get('/todos'), api.get('/notes'), api.get('/links')]).then(([decks, tasks, notes, links]) => {
      const value = result => (result.status === 'fulfilled' ? result.value.data : null);
      setCounts(current => ({
        decks: value(decks)?.length ?? current.decks,
        tasks: value(tasks)?.filter(task => !task.done).length ?? current.tasks,
        notes: value(notes)?.length ?? current.notes,
        links: value(links)?.length ?? current.links,
      }));
    });
  }, []);

  const handleCountsChange = useCallback((section, count) => {
    setCounts(current => (current[section] === count ? current : { ...current, [section]: count }));
  }, []);

  const closeIntro = useCallback(() => { setShowIntro(false); localStorage.setItem('hasSeenIntro', 'true'); }, []);
  const startTutorial = () => { closeIntro(); navigate('/tutorial'); };
  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* Sesja może być już wygasła. */ }
    localStorage.removeItem('hasSeenIntro');
    navigate('/login', { state: { notice: { type: 'info', message: 'Wylogowano.' } } });
  };

  if (!sections.some(section => section.id === activeTab)) return <Navigate to="/today" replace />;
  const View = views[activeTab];

  return (
    <AppShell activeSection={activeTab} counts={counts} userEmail={userEmail} onLogout={handleLogout}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
          <View onCountsChange={handleCountsChange} />
        </motion.div>
      </AnimatePresence>
      <IntroModal open={showIntro} onClose={closeIntro} onStart={startTutorial} />
    </AppShell>
  );
};

export default Dashboard;
