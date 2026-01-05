import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import s from './Builds.module.scss';

const Builds = () => {
  const navigate = useNavigate();
  const [savedBuilds, setSavedBuilds] = useState([]);

  // При загрузке страницы читаем localStorage
  useEffect(() => {
    const data = localStorage.getItem('abuze_builds');
    if (data) {
      setSavedBuilds(JSON.parse(data));
    }
  }, []);

  // Функция удаления билда
  const deleteBuild = (indexToDelete) => {
    const newBuilds = savedBuilds.filter((_, index) => index !== indexToDelete);
    setSavedBuilds(newBuilds);
    localStorage.setItem('abuze_builds', JSON.stringify(newBuilds));
  };

  return (
    <div className={s.container}>
      <header className={s.header}>
        <button onClick={() => navigate('/')} className={s.backBtn}>&lt; Home</button>
        <h1>Saved <span style={{color: '#a70a0a'}}>Archives</span></h1>
        <div style={{width: '80px'}}></div> {/* Пустой блок для центровки */}
      </header>

      <div className={s.grid}>
        {savedBuilds.length === 0 ? (
          <div className={s.empty}>THE ARCHIVES ARE EMPTY...</div>
        ) : (
          savedBuilds.map((build, index) => (
            <motion.div 
              key={index} 
              className={s.buildCard}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Информация о маньяке */}
              <div className={s.killerInfo}>
                <img src={build.killer.img} alt={build.killer.name} />
                <h3>{build.killer.name}</h3>
              </div>

              {/* Мини-иконки перков */}
              <div className={s.perkRow}>
                {build.perks.map((perk, i) => (
                  <img key={i} src={perk.img} title={perk.name} alt="perk" />
                ))}
              </div>
              
              {/* Кнопка удалить */}
              <button className={s.deleteBtn} onClick={() => deleteBuild(index)}>
                Forget Memory
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Builds;