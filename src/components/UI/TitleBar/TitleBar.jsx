import React from 'react';
import s from './TitleBar.module.scss'; // Сейчас создадим стили
// Импортируем ipcRenderer (для общения с electron)
const { ipcRenderer } = window.require('electron');

const TitleBar = () => {
  
  const handleMinimize = () => {
    ipcRenderer.send('app-minimize');
  };

  const handleClose = () => {
    ipcRenderer.send('app-close');
  };

  return (
    <div className={s.titleBar}>
      {/* Левая часть: Иконка и Название */}
      <div className={s.dragRegion}>
        <div className={s.logo}>
          <img src="/icon.ico" alt="" /> {/* Иконка из public */}
          <span>ABUZE.APP</span>
        </div>
      </div>

      {/* Правая часть: Кнопки */}
      <div className={s.windowControls}>
        <button onClick={handleMinimize} className={s.controlBtn}>─</button>
        <button onClick={handleClose} className={`${s.controlBtn} ${s.closeBtn}`}>✕</button>
      </div>
    </div>
  );
};

export default TitleBar;