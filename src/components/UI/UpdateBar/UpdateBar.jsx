import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from './UpdateBar.module.scss';
const { ipcRenderer } = window.require('electron');

const UpdateBar = () => {
  const [status, setStatus] = useState('idle'); // idle, downloading, ready
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    ipcRenderer.on('update_available', () => setStatus('downloading'));
    ipcRenderer.on('update_progress', (event, percent) => setProgress(Math.round(percent)));
    ipcRenderer.on('update_downloaded', () => setStatus('ready'));

    return () => {
      ipcRenderer.removeAllListeners('update_available');
      ipcRenderer.removeAllListeners('update_progress');
      ipcRenderer.removeAllListeners('update_downloaded');
    };
  }, []);

  const handleRestart = () => {
    ipcRenderer.send('restart_app');
  };

  if (status === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={s.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className={s.container}>
          
          <h1 className={s.title}>SYSTEM UPDATE REQUIRED</h1>
          <p className={s.subtitle}>DOWNLOADING CRITICAL PATCH...</p>

          {/* КРУГОВОЙ ИНДИКАТОР ИЛИ БОЛЬШАЯ ПОЛОСА */}
          <div className={s.progressWrapper}>
            <div className={s.progressBar}>
              <motion.div 
                className={s.fill} 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <div className={s.percentage}>{progress}%</div>
          </div>

          <div className={s.statusText}>
            {status === 'downloading' ? 'PACKETS INCOMING...' : 'VERIFICATION COMPLETE'}
          </div>

          {/* КНОПКА ПОЯВЛЯЕТСЯ ТОЛЬКО КОГДА ГОТОВО */}
          {status === 'ready' && (
            <motion.button 
              className={s.restartBtn}
              onClick={handleRestart}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
            >
              INITIALIZE UPDATE
            </motion.button>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateBar;