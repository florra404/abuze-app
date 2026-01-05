import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import MagicButton from '../../components/UI/MagicButton/MagicButton';
import { getFrameClass, getLevelInfo } from '../../utils/levelSystem'; // Импортируем утилиты уровня
import s from './Home.module.scss';

// Версия приложения
const VERSION = "v2.0.1 ELITE";

const Home = () => {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Меню
  const menuItems = [
    { id: 1, label: "Randomizer", path: '/randomizer', active: true },
    { id: 2, label: "Builds Archive", path: '/builds', active: false }, // Пока закрыто
    { id: 3, label: "Settings", path: '/settings', active: true },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Кто я?
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Грузим ТОП-10 игроков по XP
    const { data } = await supabase
      .from('profiles')
      .select('username, xp, avatar_url, id')
      .order('xp', { ascending: false })
      .limit(10);
    
    setTopUsers(data || []);
  };

  return (
    <div className={s.container}>
      
      {/* ЛЕВАЯ КОЛОНКА: МЕНЮ */}
      <div className={s.menuColumn}>
        <h1 className={s.logo}>ABUZE<span style={{color:'#a70a0a'}}>.APP</span></h1>
        <div className={s.version}>{VERSION}</div>

        <div className={s.menuList}>
          {menuItems.map(item => (
            <div key={item.id} className={s.menuItemWrapper}>
              {item.active ? (
                <MagicButton 
                  text={item.label} 
                  onClick={() => navigate(item.path)} 
                />
              ) : (
                <div className={s.lockedItem}>
                  {item.label} <span style={{fontSize:'10px', color:'#666'}}>// LOCKED</span>
                </div>
              )}
            </div>
          ))}
          
          {/* Кнопка Профиля отдельно */}
          <div style={{marginTop: '40px'}}>
             <MagicButton text="MY PROFILE" onClick={() => navigate('/profile')} />
          </div>
        </div>
      </div>

      {/* ЦЕНТР: НОВОСТИ */}
      <div className={s.newsColumn}>
        <div className={s.newsCard}>
          <h2>SYSTEM UPDATE: <span style={{color:'#a70a0a'}}>v2.0.1</span></h2>
          <p className={s.date}>JANUARY 05, 2026</p>
          <div className={s.divider}></div>
          <div className={s.content}>
            <p><strong>// CHAT SYSTEM ONLINE</strong></p>
            <p>Secure connection established. You can now communicate with other operatives in real-time.</p>
            <br/>
            <p><strong>// STEAM LINK INTEGRATED</strong></p>
            <p>Link your Steam ID64 in profile settings to display your verifiable hours.</p>
            <br/>
            <p><strong>// RANKING SYSTEM</strong></p>
            <p>Global leaderboard is now active. Earn XP to compete for the top spot.</p>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ КОЛОНКА: ЛИДЕРБОРД */}
      <div className={s.rankColumn}>
        <div className={s.rankHeader}>TOP OPERATIVES</div>
        <div className={s.rankList}>
          {topUsers.map((u, index) => {
             const { level } = getLevelInfo(u.xp || 0);
             const frame = getFrameClass(level);
             const isMe = currentUser?.id === u.id;

             return (
               <div key={u.id} className={`${s.rankItem} ${isMe ? s.me : ''}`}>
                 <div className={s.rankNum}>#{index + 1}</div>
                 
                 {/* Маленькая аватарка с рамкой */}
                 <div className={`${s.miniAvatar} ${s[frame]}`}>
                   <img src={u.avatar_url || 'https://via.placeholder.com/50'} alt="" />
                 </div>

                 <div className={s.rankInfo}>
                   <div className={s.rankName}>{u.username}</div>
                   <div className={s.rankLvl}>LVL {level} <span style={{color:'#666'}}>({u.xp} XP)</span></div>
                 </div>
               </div>
             );
          })}
        </div>
      </div>

    </div>
  );
};

export default Home;