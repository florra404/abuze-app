import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AnimatePresence } from 'framer-motion';

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
import UpdateBar from './components/UI/UpdateBar/UpdateBar'; // Это наш Overlay
import SplashScreen from './components/UI/SplashScreen/SplashScreen';

import './styles/global.scss';

// Импортируем IPC для общения с Electron
const { ipcRenderer } = window.require('electron');

function App() {
  const [session, setSession] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  // 🔥 НОВОЕ СОСТОЯНИЕ: Идет ли обновление?
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // 1. Слушаем: Если Electron нашел обнову - СРАЗУ блокируем всё
    const handleUpdateAvailable = () => {
      console.log("CRITICAL UPDATE FOUND. BLOCKING UI.");
      setIsUpdating(true); // Включаем режим обновления
      setShowSplash(false); // Убиваем заставку, если она еще идет
    };

    ipcRenderer.on('update_available', handleUpdateAvailable);

    // 2. Стандартные проверки (Ключ, Сессия)
    const hasAccess = localStorage.getItem('abuze_access_granted');
    if (hasAccess === 'true') setAccessGranted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      ipcRenderer.removeListener('update_available', handleUpdateAvailable);
    };
  }, []);

  const handleSplashComplete = () => {
    // Если идет обновление, мы игнорируем завершение заставки
    if (!isUpdating) {
      setShowSplash(false);
    }
  };

  // Обертка Layout
  const Layout = ({ children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar />
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
        {/* Апдейтер оставляем тут для фоновых проверок, но ниже будет главная блокировка */}
        {!isUpdating && <UpdateBar />} 
      </div>
    </div>
  );

  // 🔴 РЕЖИМ 1: КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ
  // Если качается обнова - показываем ТОЛЬКО её на черном фоне
  if (isUpdating) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
        <TitleBar /> {/* Оставляем шапку, чтобы можно было закрыть окно */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Принудительно рендерим UpdateBar поверх всего */}
          <UpdateBar /> 
        </div>
      </div>
    );
  }

  // 🟡 РЕЖИМ 2: ЗАСТАВКА (SPLASH)
  // Показываем заставку только если НЕ идет обновление
  if (showSplash) {
    return (
      <>
        <AnimatePresence>
          <SplashScreen onComplete={handleSplashComplete} />
        </AnimatePresence>
        {/* Рендерим пустоту на фоне, чтобы не мелькало */}
        <div style={{background: '#000', height: '100vh'}}></div> 
      </>
    );
  }

  // 🟢 РЕЖИМ 3: ОСНОВНОЕ ПРИЛОЖЕНИЕ
  return (
    <Layout>
      <Routes>
        {!accessGranted && <Route path="*" element={<AccessGate />} />}
        {accessGranted && !session && <Route path="*" element={<Login />} />}
        
        {accessGranted && session && (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/randomizer" element={<Randomizer />} />
            <Route path="/builds" element={<Builds />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

export default App;