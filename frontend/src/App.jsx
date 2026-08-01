import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
// 1. Importujemy bibliotekę powiadomień i jej style CSS
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importujemy strony
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import DeckPreview from './pages/DeckPreview'; // <--- DODAJ IMPORT
import Settings from './pages/Settings'; // <--- 1. CZY MASZ TEN IMPORT?
import Quiz from './pages/Quiz';
import api from './api';

// --- BRAMKARZ (Private Route) ---
const PrivateRoute = ({ children }) => {
  const [state, setState] = useState('loading');
  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then(() => { if (active) setState('authenticated'); })
      .catch(() => { if (active) setState('anonymous'); });
    return () => { active = false; };
  }, []);
  if (state === 'loading') return <div className="min-h-screen bg-slate-950" aria-label="Sprawdzanie sesji" />;
  if (state === 'anonymous') return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const location = useLocation();

  return (
    <>
      {/* 2. Tutaj wrzucamy kontener. Dzięki temu powiadomienia działają wszędzie.
          theme="dark" pasuje do Twojego designu. */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/dashboard"
            element={<Navigate to="/today" replace />}
          />

          <Route
            path="/:section"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/decks/:id"
            element={
              <PrivateRoute>
                <DeckPreview />
              </PrivateRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />

          <Route
            path="/quiz/:deckId"
            element={
              <PrivateRoute>
                <Quiz />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
