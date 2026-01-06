import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Monitor, Shield, ArrowLeft, Trash2, Cpu, Volume2 } from 'lucide-react';
import s from './Settings.module.scss';

// Словарь переводов
const TRANSLATIONS = {
  en: {
    title: "SYSTEM SETTINGS",
    lang: "Interface Language",
    streamer: "Streamer Mode",
    streamerDesc: "Hide sensitive ID data",
    hw: "Hardware Acceleration",
    hwDesc: "Use GPU for visual effects",
    clear: "Clear Cache",
    clearDesc: "Free up local storage space",
    back: "BACK TO HUB"
  },
  ru: {
    title: "НАСТРОЙКИ СИСТЕМЫ",
    lang: "Язык интерфейса",
    streamer: "Режим Стримера",
    streamerDesc: "Скрывать личные ID и почту",
    hw: "Аппаратное ускорение",
    hwDesc: "Использовать GPU для эффектов",
    clear: "Очистить Кеш",
    clearDesc: "Освободить локальное хранилище",
    back: "НАЗАД В ХАБ"
  }
};

const Settings = () => {
  const navigate = useNavigate();
  
  // Состояние настроек (грузим из localStorage)
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const [streamerMode, setStreamerMode] = useState(localStorage.getItem('streamer_mode') === 'true');
  const [hwAccel, setHwAccel] = useState(true);

  const t = TRANSLATIONS[lang];

  const toggleLang = (l) => {
    setLang(l);
    localStorage.setItem('app_lang', l);
    // В реальном большом приложении здесь был бы Context, но пока просто релоад для применения
    // window.location.reload(); // Можно раскомментировать, если хотим жесткого обновления
  };

  const toggleStreamer = () => {
    setStreamerMode(!streamerMode);
    localStorage.setItem('streamer_mode', !streamerMode);
  };

  return (
    <div className={s.page}>
       <div className="entity-fog"><div className="fog-layer"></div></div>

       <motion.button whileHover={{ x: -5 }} className={s.backBtn} onClick={() => navigate('/')}>
        <ArrowLeft /> {t.back}
      </motion.button>

      <div className={s.container}>
        <h1 className={s.title}>{t.title}</h1>

        <div className={s.grid}>
          
          {/* ЯЗЫК */}
          <section className={s.section}>
            <div className={s.secHeader}><Globe size={20} className={s.icon}/> {t.lang}</div>
            <div className={s.langSwitcher}>
              <button 
                className={`${s.langBtn} ${lang === 'en' ? s.active : ''}`}
                onClick={() => toggleLang('en')}
              >
                ENGLISH
              </button>
              <button 
                className={`${s.langBtn} ${lang === 'ru' ? s.active : ''}`}
                onClick={() => toggleLang('ru')}
              >
                РУССКИЙ
              </button>
            </div>
          </section>

          {/* ПРИВАТНОСТЬ */}
          <section className={s.section}>
            <div className={s.secHeader}><Shield size={20} className={s.icon}/> {t.streamer}</div>
            <div className={s.row}>
              <p>{t.streamerDesc}</p>
              <Switch checked={streamerMode} onChange={toggleStreamer} />
            </div>
          </section>

          {/* СИСТЕМА */}
          <section className={s.section}>
            <div className={s.secHeader}><Cpu size={20} className={s.icon}/> {t.hw}</div>
            <div className={s.row}>
              <p>{t.hwDesc}</p>
              <Switch checked={hwAccel} onChange={() => setHwAccel(!hwAccel)} />
            </div>
          </section>

          {/* ОЧИСТКА */}
          <section className={`${s.section} ${s.danger}`}>
            <div className={s.secHeader}><Trash2 size={20} className={s.icon}/> {t.clear}</div>
            <div className={s.row}>
              <p>{t.clearDesc}</p>
              <button className={s.clearBtn} onClick={() => alert("CACHE CLEARED")}>EXECUTE</button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

// Компонент переключателя
const Switch = ({ checked, onChange }) => (
  <div className={`${s.switch} ${checked ? s.on : ''}`} onClick={onChange}>
    <motion.div layout className={s.handle} />
  </div>
);

export default Settings;