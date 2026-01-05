import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { getFrameClass, getLevelInfo } from '../../utils/levelSystem';
import s from './Home.module.scss';

const VERSION = "v2.1.0";

const Home = () => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const [user, setUser] = useState(null);

  // Новое меню: Карточки с описанием
  const modules = [
    { id: 1, label: "RANDOMIZER", sub: "Generate Builds", path: '/randomizer', active: true, icon: "🎲" },
    { id: 2, label: "ARCHIVES", sub: "Saved Loadouts", path: '/builds', active: false, icon: "💾" }, // Locked
    { id: 3, label: "SETTINGS", sub: "System Config", path: '/settings', active: true, icon: "⚙️" },
  ];

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      const { data } = await supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(10);
      setTopUsers(data || []);
    };
    load();
  }, []);

  return (
    <div className={s.wrapper}>
      {/* ФОНОВЫЕ ЭЛЕМЕНТЫ (Декор) */}
      <div className={s.bgGlow}></div>

      {/* ШАПКА */}
      <header className={s.header}>
        <div className={s.logoBlock}>
          <h1>ABUZE<span className={s.red}>.APP</span></h1>
          <div className={s.badge}>{VERSION}</div>
        </div>
        <div className={s.profileBtn} onClick={() => navigate('/profile')}>
          <div className={s.pText}>
            <span className={s.pName}>{user?.email?.split('@')[0] || 'OPERATIVE'}</span>
            <span className={s.pStatus}>ONLINE</span>
          </div>
          <div className={s.pAva}>
            <img src={topUsers.find(u => u.id === user?.id)?.avatar_url || 'https://via.placeholder.com/50'} alt="" />
          </div>
        </div>
      </header>

      <main className={s.grid}>
        
        {/* ЛЕВАЯ КОЛОНКА: МОДУЛИ (МЕНЮ) */}
        <section className={s.modulesSection}>
          <h2 className={s.sectionTitle}>// MODULES</h2>
          <div className={s.cards}>
            {modules.map(m => (
              <div 
                key={m.id} 
                className={`${s.card} ${!m.active ? s.locked : ''}`}
                onClick={() => m.active && navigate(m.path)}
              >
                <div className={s.cardIcon}>{m.icon}</div>
                <div className={s.cardContent}>
                  <h3>{m.label}</h3>
                  <p>{m.active ? m.sub : "ACCESS DENIED"}</p>
                </div>
                <div className={s.cardArrow}>→</div>
              </div>
            ))}
          </div>

          {/* Блок новостей встроен сюда же */}
          <div className={s.newsMini}>
            <div className={s.newsHeader}>SYSTEM FEED</div>
            <div className={s.newsText}>
              <span className={s.red}>NEW:</span> Leaderboards & Chat are now live. Secure your connection.
            </div>
          </div>
        </section>

        {/* ПРАВАЯ КОЛОНКА: ЛИДЕРБОРД */}
        <section className={s.rankSection}>
          <h2 className={s.sectionTitle}>// TOP OPERATIVES</h2>
          <div className={s.tableHeader}>
            <span>#</span>
            <span>AGENT</span>
            <span>LVL</span>
          </div>
          <div className={s.rankList}>
            {topUsers.map((u, i) => {
              const { level } = getLevelInfo(u.xp || 0);
              const isMe = user?.id === u.id;
              return (
                <div key={u.id} className={`${s.rankRow} ${isMe ? s.me : ''}`}>
                  <div className={s.rNum}>{i + 1}</div>
                  <div className={s.rUser}>
                    <img src={u.avatar_url || 'https://via.placeholder.com/30'} className={s.rAva} alt=""/>
                    <span>{u.username}</span>
                  </div>
                  <div className={s.rLvl}>{level}</div>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Home;