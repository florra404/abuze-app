import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../supabaseClient';
import s from './Home.module.scss';
import newsData from '../../data/news.json';

const Home = () => {
  const navigate = useNavigate();
  const VERSION = "v1.0.1 STABLE";
  
  const [session, setSession] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAvatar(session.user.id);
    });
  }, []);

  const fetchAvatar = async (userId) => {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    if (data) setAvatarUrl(data.avatar_url);
  };

  const menuItems = [
    { id: 1, label: "Randomizer", path: '/randomizer', active: true },
    { id: 2, label: "Archives", path: '/builds', active: false },
    { id: 3, label: "Settings", path: '/settings', active: false },
    { id: 4, label: "Exit", action: () => alert("Use Alt+F4 to exit"), active: true }
  ];

  return (
    <div className={s.wrapper}>
      {/* 1. БРЕНД */}
      <div className={s.brand}>
        <h1>ABUZE<span>.APP</span></h1>
        <p>created by abcizee</p>
      </div>

      {/* 2. АВАТАРКА ПРОФИЛЯ (Верхний правый угол) */}
      <div 
        onClick={() => navigate(session ? '/profile' : '/login')}
        style={{
          position: 'absolute', top: '30px', right: '40px', zIndex: 100,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px'
        }}
      >
        {!session && <span style={{color: '#666', fontSize: '12px', fontWeight: 'bold'}}>LOGIN REQUIRED</span>}
        
        <motion.div 
          whileHover={{ scale: 1.1, borderColor: '#a70a0a' }}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', 
            border: '2px solid #333', background: '#000', overflow: 'hidden',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Me" style={{width:'100%', height:'100%', objectFit:'cover'}} />
          ) : (
            <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#444'}}>
              {session ? '👤' : '🔒'}
            </div>
          )}
        </motion.div>
      </div>

      {/* 3. МЕНЮ */}
      <div className={s.sidebar}>
        <div className={s.menuList}>
          {menuItems.map((item, i) => (
            <motion.div
              key={item.id}
              className={`${s.menuItem} ${!item.active ? s.disabled : ''}`}
              onClick={() => item.active && (item.action ? item.action() : navigate(item.path))}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
            >
              {item.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 4. ПОДВАЛ */}
      <div className={s.footer}>
        <div className={s.versionBadge}>{VERSION}</div>
        <div className={s.status}>SYSTEM ONLINE</div>
      </div>

      {/* 5. НОВОСТИ */}
      <div className={s.showcase}>
        <div className={s.newsContainer}>
          <div className={s.newsHeader}><span>System Logs</span><span>///</span></div>
          {newsData.map((news, index) => (
             <motion.div key={news.id} className={s.newsItem} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + (index * 0.1) }}>
              <div className={s.newsMeta}><span className={s.date}>[{news.date}]</span>{news.new && <span className={s.badge}>NEW</span>}</div>
              <div className={s.title}>{news.title}</div>
              <div className={s.text}>{news.text}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;