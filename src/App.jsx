import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Страницы
import Home from './pages/Home/Home';
import Randomizer from './pages/Randomizer/Randomizer';
import Builds from './pages/Builds/Builds';
import Login from './pages/Auth/Login';
import Profile from './pages/Profile/Profile';
import AccessGate from './pages/Auth/AccessGate';

import './styles/global.scss';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    // 1. Проверка Ключа Продукта (как и было)
    const hasAccess = localStorage.getItem('abuze_access_granted');
    if (hasAccess === 'true') setAccessGranted(true);

    // 2. Проверка Сессии (Залогинен ли?)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Слушаем изменения (вход/выход)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{background:'#000', height:'100vh', color:'#333', display:'flex', justifyContent:'center', alignItems:'center'}}>SYSTEM BOOT...</div>;

  // Уровень 1: Ключ Доступа
  if (!accessGranted) {
    return (
      <BrowserRouter>
         <Routes>
            <Route path="*" element={<AccessGate />} />
         </Routes>
      </BrowserRouter>
    );
  }

  // Уровень 2: Логин (Если нет сессии - показываем ТОЛЬКО логин)
  if (!session) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Уровень 3: Приложение (Только для своих)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/randomizer" element={<Randomizer />} />
        <Route path="/builds" element={<Builds />} />
        <Route path="/profile" element={<Profile />} />
        {/* Если введут бред в адресную строку - кидаем домой */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;