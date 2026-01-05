import React from 'react';
import { motion } from 'framer-motion';
import s from './PerkSlot.module.scss';

const PerkSlot = ({ name, iconUrl, rarity = 'common', delay = 0, isRolling = false }) => {
  
  const variants = {
    // В скрытом состоянии - 0 градусов (квадрат)
    hidden: { scale: 0, opacity: 0, rotate: 0 },
    
    // В видимом - 45 градусов (РОМБ)
    visible: { 
      scale: 1, 
      opacity: 1, 
      rotate: 45, // <--- ЭТО ДЕЛАЕТ ЕГО РОМБОМ
      transition: isRolling ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20, delay: delay }
    }
  };

  return (
    <div className={s.slotWrapper}>
      <motion.div 
        className={`${s.perkContainer} ${s[rarity]}`} 
        // Если крутится - делаем серым. Если нет - берем цвет из CSS
        style={isRolling ? { borderColor: '#555', boxShadow: 'none' } : {}}
        
        initial={isRolling ? "visible" : "hidden"}
        animate="visible"
        variants={variants}
        // При наведении обязательно сохраняем rotate: 45
        whileHover={{ scale: 1.1, rotate: 45 }} 
      >
        <div className={s.innerRotation}>
          {iconUrl ? (
            <img 
              src={iconUrl} 
              alt={name} 
              className={s.icon}
              // Блюр при прокрутке
              style={isRolling ? { filter: 'blur(2px) grayscale(100%)', opacity: 0.7 } : {}}
             />
          ) : (
            <div className={s.emptyState}>?</div>
          )}
        </div>
      </motion.div>
      
      {/* Скрываем имя во время прокрутки */}
      <div className={s.perkName} style={{ opacity: isRolling ? 0 : 1 }}>
        {name}
      </div>
    </div>
  );
};

export default PerkSlot;