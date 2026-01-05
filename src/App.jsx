import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Страницы
import Home from './pages/Home/Home';
import Randomizer from './pages/Randomizer/Randomizer';
import Builds from './pages/Builds/Builds';
import Login from './pages/Auth/Login';
import Profile from './pages/Profile/Profile';
import AccessGate from './pages/Auth/AccessGate';

// UI Компоненты
import TitleBar from './components/UI/TitleBar/TitleBar';
import UpdateBar from './components/UI/UpdateBar/UpdateBar';

// Глобальные стили
import './styles/global.scss';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    // 1. Проверяем, вводил ли юзер Ключ Продукта
    const hasAccess = localStorage.getItem('abuze_access_granted');
    if (hasAccess === 'true') setAccessGranted(true);

    // 2. Проверяем сессию Supabase (вошел ли в аккаунт)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Слушаем изменения входа/выхода
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Экран загрузки (пока проверяем ключи)
  if (loading) {
    return (
      <div style={{
        background:'#050505', 
        height:'100vh', 
        display:'flex', 
        justifyContent:'center', 
        alignItems:'center', 
        color:'#666',
        letterSpacing: '5px'
      }}>
        SYSTEM BOOT...
      </div>
    );
  }

  // --- LAYOUT (Обертка) ---
  // Добавляет шапку и апдейтер на ВСЕ страницы
  const Layout = ({ children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* 1. Наша черная шапка (вместо Windows рамки) */}
      <TitleBar />
      
      {/* 2. Контент страницы */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
        
        {/* 3. Виджет обновления (всегда поверх контента внизу) */}
        <UpdateBar />
      </div>
    </div>
  );

  // УРОВЕНЬ 1: Если нет Ключа Доступа -> Показываем Gate
  if (!accessGranted) {
    return (
      <Layout>
        <Routes>
           <Route path="*" element={<AccessGate />} />
        </Routes>
      </Layout>
    );
  }

  // УРОВЕНЬ 2: Если нет Аккаунта -> Показываем Логин
  if (!session) {
    return (
      <Layout>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Layout>
    );
  }

  // УРОВЕНЬ 3: Полный доступ
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/randomizer" element={<Randomizer />} />
        <Route path="/builds" element={<Builds />} />
        <Route path="/profile" element={<Profile />} />
        
        {/* Если страница не найдена - кидаем на главную */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;