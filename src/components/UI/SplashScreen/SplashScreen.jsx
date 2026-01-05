import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';
import s from './SplashScreen.module.scss';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loadingText, setLoadingText] = useState('INITIALIZING...');

  // 1. Грузим данные пользователя
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserData(data);
      }
    };
    fetchUser();
  }, []);

  // 2. Анимация загрузки
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500); // Небольшая пауза перед скрытием
          return 100;
        }
        
        // Меняем текст в зависимости от процентов
        if (old === 20) setLoadingText('LOADING ASSETS...');
        if (old === 50) setLoadingText('CONNECTING TO ENTITY...');
        if (old === 80) setLoadingText('DECRYPTING USER DATA...');
        
        // Случайный шаг загрузки для реалистичности
        return old + Math.floor(Math.random() * 10) + 1;
      });
    }, 150); // Скорость обновления

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      className={s.wrapper}
      exit={{ opacity: 0, y: -50 }} // Анимация исчезновения вверх
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <div className={s.content}>
        
        {/* Логотип */}
        <h1 className={s.logo}>ABUZE<span>.APP</span></h1>

        {/* Аватарка (появится, если юзер залогинен) */}
        {userData && (
          <motion.div 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={s.userBlock}
          >
            <div className={s.avatar}>
              <img src={userData.avatar_url || 'https://via.placeholder.com/150'} alt="" />
            </div>
            <h2>WELCOME BACK, <span className={s.red}>{userData.username}</span></h2>
          </motion.div>
        )}

        {/* Прогресс бар */}
        <div className={s.loaderContainer}>
          <div className={s.textInfo}>
            <span>{loadingText}</span>
            <span>{Math.min(progress, 100)}%</span>
          </div>
          <div className={s.track}>
            <motion.div 
              className={s.bar} 
              style={{ width: `${Math.min(progress, 100)}%` }} 
            />
          </div>
        </div>

      </div>
    </motion.div>
  );
};

export default SplashScreen;