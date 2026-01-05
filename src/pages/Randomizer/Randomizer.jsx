import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Компоненты
import PerkSlot from "../../components/UI/Randomizer/PerkSlot/PerkSlot";
import MagicButton from "../../components/UI/MagicButton/MagicButton";

// Данные
import killersData from '../../data/killers.json';
import perksData from '../../data/perks.json';

const Randomizer = () => {
  const navigate = useNavigate();

  // Состояние
  const [currentKiller, setCurrentKiller] = useState(null);
  const [currentPerks, setCurrentPerks] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  
  // Рефы нужны, чтобы очистить интервал, если уйдем со страницы
  const intervalRef = useRef(null);

  // --- ЛОГИКА КАЗИНО (SLOT MACHINE) ---
  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);

    // 1. Запускаем "Шумиху" (быстрая смена картинок)
    let counter = 0;
    const maxIterations = 25; // Сколько раз картинки сменятся (примерно 2 секунды)
    
    // Очищаем предыдущий интервал на всякий случай
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      // Каждый тик ставим случайного мана и перки (визуальный шум)
      const randomKiller = killersData[Math.floor(Math.random() * killersData.length)];
      const randomPerks = [...perksData].sort(() => 0.5 - Math.random()).slice(0, 4);

      setCurrentKiller(randomKiller);
      setCurrentPerks(randomPerks);

      counter++;

      // 2. Остановка рулетки
      if (counter >= maxIterations) {
        clearInterval(intervalRef.current);
        
        // ВЫБИРАЕМ ФИНАЛЬНОГО ПОБЕДИТЕЛЯ
        // Можно сделать логику сложнее, но пока берем последний рандом как итог
        // (или можно сгенерировать отдельно, если хочешь честный рандом)
        const finalKiller = killersData[Math.floor(Math.random() * killersData.length)];
        const finalPerks = [...perksData].sort(() => 0.5 - Math.random()).slice(0, 4);
        
        setCurrentKiller(finalKiller);
        setCurrentPerks(finalPerks);
        setIsRolling(false);
      }
    }, 80); // 80мс - скорость мелькания (чем меньше, тем быстрее)
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      height: '100vh', width: '100vw',
      background: 'radial-gradient(circle, #1a1a1a 0%, #000000 100%)',
      position: 'relative', overflow: 'hidden'
    }}>
      
      {/* Кнопка НАЗАД */}
      <button 
        onClick={() => navigate('/')}
        style={{
          position: 'absolute', top: '40px', left: '40px', zIndex: 10,
          background: 'transparent', border: 'none', color: '#666',
          fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '2px',
          fontWeight: 'bold', transition: '0.3s'
        }}
        onMouseOver={(e) => e.target.style.color = '#fff'}
        onMouseOut={(e) => e.target.style.color = '#666'}
      >
        ← Main Menu
      </button>

      {/* МАНЬЯК */}
      <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {currentKiller ? (
           // Во время прокрутки убираем плавную анимацию (AnimatePresence), чтобы картинки менялись резко
           <motion.div
             key={isRolling ? "rolling" : currentKiller.id} // Хитрость: во время ролла ключ не меняется
             initial={isRolling ? {} : { opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
           >
             <img 
               src={currentKiller.img} 
               alt={currentKiller.name} 
               style={{ 
                 width: '220px', height: '220px', objectFit: 'contain',
                 // Если крутится - добавляем блюр (размытие) для эффекта скорости
                 filter: isRolling 
                    ? 'drop-shadow(0 0 10px red) blur(2px)' 
                    : 'drop-shadow(0 0 20px rgba(167, 10, 10, 0.5))'
               }} 
             />
             <h2 style={{ 
               color: isRolling ? '#555' : '#fff', // Тусклый текст пока крутится
               marginTop: '15px', textTransform: 'uppercase', 
               letterSpacing: '6px', fontSize: '32px', fontWeight: '900',
               textShadow: isRolling ? 'none' : '0 0 10px rgba(167, 10, 10, 0.8)'
             }}>
               {currentKiller.name}
             </h2>
           </motion.div>
        ) : (
          <h2 style={{ color: '#444', letterSpacing: '5px', textTransform: 'uppercase' }}>
            READY TO ROLL
          </h2>
        )}
      </div>

      {/* ПЕРКИ */}
      <div style={{ display: 'flex', gap: '25px', marginBottom: '60px', minHeight: '180px', alignItems: 'center' }}>
        {currentPerks.length > 0 ? (
          currentPerks.map((perk, index) => (
            <PerkSlot 
              key={`${index}`} // Используем индекс, чтобы React не пересоздавал слоты во время мелькания
              name={perk.name} 
              rarity={perk.rarity} 
              iconUrl={perk.img} 
              // Если крутимся - задержки нет. Если остановились - красивое появление
              delay={isRolling ? 0 : index * 0.1} 
              isRolling={isRolling} // Передаем состояние внутрь
            />
          ))
        ) : (
          [1,2,3,4].map((_, i) => <PerkSlot key={i} name="" rarity="common" />)
        )}
      </div>

      {/* КНОПКА */}
      <MagicButton onClick={handleRoll} text={isRolling ? "ROLLING..." : "SPIN THE WHEEL"} />
    </div>
  );
};

export default Randomizer;