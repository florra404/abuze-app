import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { motion } from 'framer-motion'; // АНИМАЦИИ
import { Users, Newspaper, Zap, Search, ShieldAlert } from 'lucide-react'; // ИКОНКИ
import s from './Home.module.scss'; // Сейчас создадим

const VERSION = "v2.2.0 // COMMUNITY HUB";

const Home = () => {
  const navigate = useNavigate();
  const [betas, setBetas] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Грузим Бета-тестеров и Админов
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'beta'])
        .order('xp', { ascending: false });
      setBetas(data || []);
    };
    load();
  }, []);

  // Анимация появления
  const containerVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVars = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className={s.page}>
      {/* ФОНОВЫЙ ШУМ */}
      <div className="entity-fog"><div className="fog-layer"></div></div>

      {/* ШАПКА */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        className={s.header}
      >
        <div className={s.brand}>
          <h1>ABUZE<span className={s.accent}>.HUB</span></h1>
          <span className={s.badge}>{VERSION}</span>
        </div>
        
        {/* КНОПКА ПРОФИЛЯ (Справа) */}
        <div className={s.profileWidget} onClick={() => navigate('/profile')}>
           <div className={s.pInfo}>
             <span className={s.pName}>{user?.email?.split('@')[0]}</span>
             <span className={s.pRole}>{betas.find(u => u.id === user?.id)?.role || 'OPERATIVE'}</span>
           </div>
           <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" className={s.pAva} alt=""/>
        </div>
      </motion.header>

      <motion.main 
        variants={containerVars} 
        initial="hidden" 
        animate="visible"
        className={s.grid}
      >
        
        {/* ЛЕВАЯ КОЛОНКА: НОВОСТИ */}
        <div className={s.colLeft}>
          <motion.div variants={itemVars} className={s.newsCard}>
            <div className={s.cardHead}><Newspaper size={18} /> LATEST INTEL</div>
            <div className={s.newsItem}>
              <h3>Community Update Released</h3>
              <p className={s.date}>Jan 06, 2026</p>
              <p>We are shifting focus. The Randomizer is now just one tool in our arsenal. Welcome to the <b>Community Hub</b>.</p>
              <ul>
                <li>🔥 <b>Global Search:</b> Fixed visibility issues. Find any operative.</li>
                <li>💎 <b>Beta Program:</b> Verified testers now have special badges.</li>
                <li>🎨 <b>Visuals:</b> "Entity Fog" engine activated.</li>
              </ul>
            </div>
          </motion.div>

          {/* МЕНЮ НАВИГАЦИИ */}
          <div className={s.navGrid}>
            <MenuCard title="Randomizer" icon={<Zap />} onClick={() => navigate('/randomizer')} desc="Create Chaos" />
            <MenuCard title="Community" icon={<Users />} onClick={() => alert('Coming Soon: Global Feed')} desc="Clips & Art (WIP)" active={false} />
            <MenuCard title="Find Agents" icon={<Search />} onClick={() => navigate('/profile')} desc="Search Friends" />
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: BETA SQUAD (БЕТА ТЕСТЕРЫ) */}
        <motion.div variants={itemVars} className={s.betaSection}>
          <div className={s.sectionHeader}>
            <ShieldAlert size={18} className={s.accent} />
            <span>ELITE SQUAD / BETA TESTERS</span>
          </div>
          
          <div className={s.betaList}>
            {betas.map(b => (
              <div key={b.id} className={s.betaRow}>
                <img src={b.avatar_url || 'https://via.placeholder.com/40'} alt="" />
                <div className={s.betaInfo}>
                  <div className={s.bName}>{b.username}</div>
                  <div className={s.bRole} style={{color: b.role === 'admin' ? '#e11d48' : '#3b82f6'}}>
                    {b.role.toUpperCase()}
                  </div>
                </div>
                <div className={s.bLvl}>{Math.floor(Math.sqrt(b.xp/100)) + 1} LVL</div>
              </div>
            ))}
            {betas.length === 0 && <div className={s.empty}>Scanning for testers...</div>}
          </div>
        </motion.div>

      </motion.main>
    </div>
  );
};

// Компонент Карточки Меню
const MenuCard = ({ title, icon, desc, onClick, active = true }) => (
  <motion.div 
    whileHover={active ? { scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' } : {}}
    whileTap={active ? { scale: 0.98 } : {}}
    onClick={onClick}
    className={`${s.menuCard} ${!active ? s.locked : ''}`}
  >
    <div className={s.iconBox}>{icon}</div>
    <div>
      <div className={s.mTitle}>{title}</div>
      <div className={s.mDesc}>{desc}</div>
    </div>
  </motion.div>
);

export default Home;