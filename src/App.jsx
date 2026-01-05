import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Убрали BrowserRouter
import { supabase } from './supabaseClient';

// Страницы
import Home from './pages/Home/Home';
import Randomizer from './pages/Randomizer/Randomizer';
import Builds from './pages/Builds/Builds';
import Login from './pages/Auth/Login';
import Profile from './pages/Profile/Profile';
import AccessGate from './pages/Auth/AccessGate';
import TitleBar from './components/UI/TitleBar/TitleBar'; // Скоро создадим

import './styles/global.scss';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    const hasAccess = localStorage.getItem('abuze_access_granted');
    if (hasAccess === 'true') setAccessGranted(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{background:'#000', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', color:'#666'}}>SYSTEM BOOT...</div>;

  // Обертка для контента, чтобы TitleBar был везде
  const Layout = ({ children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <TitleBar /> {/* Наша новая шапка */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );

  if (!accessGranted) {
    return (
      <Layout>
        <Routes>
           <Route path="*" element={<AccessGate />} />
        </Routes>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/randomizer" element={<Randomizer />} />
        <Route path="/builds" element={<Builds />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default App;