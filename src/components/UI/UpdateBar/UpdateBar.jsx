import React, { useState, useEffect } from 'react';
import s from './UpdateBar.module.scss';
const { ipcRenderer } = window.require('electron');

const UpdateBar = () => {
  const [status, setStatus] = useState('idle'); // idle, downloading, ready
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Слушаем события от Electron
    ipcRenderer.on('update_available', () => {
      setStatus('downloading');
    });

    ipcRenderer.on('update_progress', (event, percent) => {
      setProgress(Math.round(percent));
    });

    ipcRenderer.on('update_downloaded', () => {
      setStatus('ready');
    });

    // Очистка
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
    <div className={s.wrapper}>
      <div className={s.content}>
        
        {/* СТАТУС: СКАЧИВАНИЕ */}
        {status === 'downloading' && (
          <div className={s.downloading}>
            <div className={s.text}>
              <span>NEW VERSION DETECTED</span>
              <span>DOWNLOADING: {progress}%</span>
            </div>
            <div className={s.progressBar}>
              <div className={s.fill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* СТАТУС: ГОТОВО */}
        {status === 'ready' && (
          <div className={s.ready}>
            <div className={s.info}>
              <span className={s.successIcon}>✔</span>
              <span>UPDATE READY TO INSTALL</span>
            </div>
            <button onClick={handleRestart} className={s.btn}>
              RESTART & UPDATE
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default UpdateBar;