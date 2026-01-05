import React from 'react';
import { motion } from 'framer-motion';
import s from './MagicButton.module.scss';

const MagicButton = ({ onClick, text = "ROLL" }) => {
  return (
    <div className={s.container}>
      <motion.button 
        className={s.btn}
        onClick={onClick}
        whileHover={{ scale: 1.05, letterSpacing: "3px" }} // Разъезжаются буквы
        whileTap={{ scale: 0.95 }}
      >
        <span className={s.text}>{text}</span>
        <div className={s.bloodOverlay}></div>
      </motion.button>
    </div>
  );
};

export default MagicButton;