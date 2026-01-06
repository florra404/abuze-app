import React from 'react';
import { useNavigate } from 'react-router-dom';
import MagicButton from '../../components/UI/MagicButton/MagicButton';
// Можно использовать те же стили, что и в Profile, или создать простые inline
import { supabase } from '../../supabaseClient';

const Settings = () => {
  const navigate = useNavigate();
  const VERSION = "v2.2.0"; // Текущая версия (для отображения)

  const handleClearCache = () => {
    localStorage.clear();
    alert("SYSTEM CACHE CLEARED. RESTARTING...");
    window.location.reload();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '50px', height: '100%', background: '#050505', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Кнопка Назад */}
      <button onClick={() => navigate('/')} style={{position:'absolute', top:30, left:30, background:'transparent', border:'none', color:'#666', cursor:'pointer'}}>← BACK</button>

      <h1 style={{ fontSize: '3rem', marginBottom: '50px', letterSpacing: '5px', color: '#fff' }}>SETTINGS</h1>

      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Блок 1: Приложение */}
        <div style={{ background: '#111', padding: '30px', borderRadius: '10px', border: '1px solid #333' }}>
          <h3 style={{ color: '#666', marginBottom: '20px', textTransform: 'uppercase', fontSize: '12px' }}>Application</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <span>Current Version</span>
             <span style={{ color: '#a70a0a', fontWeight: 'bold' }}>{VERSION}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span>Auto-Updates</span>
             <span style={{ color: '#00ff00' }}>ACTIVE ●</span>
          </div>
        </div>

        {/* Блок 2: Данные */}
        <div style={{ background: '#111', padding: '30px', borderRadius: '10px', border: '1px solid #333' }}>
          <h3 style={{ color: '#666', marginBottom: '20px', textTransform: 'uppercase', fontSize: '12px' }}>Data Management</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
             <div>
               <div style={{marginBottom: '5px'}}>Clear Cache</div>
               <div style={{fontSize: '10px', color: '#555'}}>Resets local settings and stored keys</div>
             </div>
             <button onClick={handleClearCache} style={{background: '#333', border: 'none', color: 'white', padding: '8px 15px', cursor: 'pointer'}}>RESET</button>
          </div>
        </div>

        {/* Блок 3: Аккаунт */}
        <div style={{ background: '#111', padding: '30px', borderRadius: '10px', border: '1px solid #333' }}>
           <h3 style={{ color: '#666', marginBottom: '20px', textTransform: 'uppercase', fontSize: '12px' }}>Session</h3>
           <MagicButton onClick={handleSignOut} text="LOGOUT" />
        </div>

      </div>

      <div style={{ marginTop: 'auto', color: '#333', fontSize: '10px' }}>
        UID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
      </div>
    </div>
  );
};

export default Settings;