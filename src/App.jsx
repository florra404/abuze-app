import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AnimatePresence } from 'framer-motion'; // Для плавного исчезновения

// Страницы
import Home from './pages/Home/Home';
import Randomizer from './pages/Randomizer/Randomizer';
import Builds from './pages/Builds/Builds';
import Login from './pages/Auth/Login';
import Profile from './pages/Profile/Profile';
import AccessGate from './pages/Auth/AccessGate';
import Settings from './pages/Settings/Settings';

// UI
import TitleBar from './components/UI/TitleBar/TitleBar';
import UpdateBar from './components/UI/UpdateBar/UpdateBar';
import SplashScreen from './components/UI/SplashScreen/SplashScreen'; // <-- ИМПОРТ

import './styles/global.scss';

function App() {
  const [session, setSession] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  
  // Состояние: Показываем ли приветствие?
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasAccess = localStorage.getItem('abuze_access_granted');
    if (hasAccess === 'true') setAccessGranted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Функция, которую вызовет SplashScreen, когда полоска дойдет до 100%
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const Layout = ({ children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
        <UpdateBar />
      </div>
    </div>
  );

  return (
    <>
      {/* ЭКРАН ПРИВЕТСТВИЯ (Поверх всего) */}
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      {/* ОСНОВНОЕ ПРИЛОЖЕНИЕ (Рендерится сзади, пока идет загрузка) */}
      <Layout>
        <Routes>
          {/* Если ключа нет - Gate */}
          {!accessGranted && <Route path="*" element={<AccessGate />} />}

          {/* Если ключа есть, но нет аккаунта - Login */}
          {accessGranted && !session && <Route path="*" element={<Login />} />}

          {/* Полный доступ */}
          {accessGranted && session && (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/randomizer" element={<Randomizer />} />
              <Route path="/builds" element={<Builds />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" />} />
              <Route path="/settings" element={<Settings />} />
            </>
          )}
        </Routes>
      </Layout>
    </>
  );
}

export default App;